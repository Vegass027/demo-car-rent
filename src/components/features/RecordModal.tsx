// ============================================================
// FEATURE: RECORD MODAL
// Модальное окно для добавления/редактирования записи
// Поддерживает три режима: бронирование, ТО, обычный
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/retroui/Dialog'
import { Select } from '@/components/retroui/Select'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Label } from '@/components/retroui/Label'
import { Textarea } from '@/components/retroui/Textarea'
import { useCars } from '@/hooks/useCars'
import { useCreateRecord, useActiveBuyoutByCarId } from '@/hooks/useRecords'
import { useExpenseCategories } from '@/hooks/useFinance'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useSaveClientFromContract } from '@/hooks/useClients'
import { formatMoney } from '@/utils/format'
import { calcProfit } from '@/utils/calc'
import { generateContractDocument, generateServiceActDocument, generateBuyoutContractDocument, generateSimpleRentalContractDocument, generateContractNumber } from '@/utils/contractGenerator'
import { generateContractDocumentHTML, generateServiceActDocumentHTML, generateBuyoutContractDocumentHTML, generateSimpleRentalContractDocumentHTML } from '@/utils/contractGeneratorHTML'
import { exportHtmlToPdf } from '@/utils/pdfExport'

// Кнопка генерации документа: на мобильном — "Открыть PDF для печати",
// на десктопе — конкретное название. Пока грузится — спиннер.
function GenerateDocButton({
  loading,
  desktopLabel,
  onClick,
  disabled,
  variantClass,
}: {
  loading: boolean
  desktopLabel: string
  onClick: () => void
  disabled: boolean
  variantClass: string
}) {
  const isMobile = isMobileDevice()
  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${variantClass}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-2 inline-block" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Генерация PDF…
        </>
      ) : isMobile ? (
        '📄 Открыть PDF для печати'
      ) : (
        desktopLabel
      )}
    </Button>
  )
}

// Определение мобильного устройства — на мобильных открываем HTML (DOCX криво рендерится в Safari)
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}
import { clientToContractData } from '@/api/clients'
import { ClientSearch } from '@/components/features/ClientSearch'
import type { CarRecord, RecordFormData, Car, ContractClientData, Client, RelativeContact } from '@/types'

// Схема валидации
const recordSchema = z.object({
  carId: z.string().uuid('Выберите машину'),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  rentalAmount: z.number().min(0, 'Сумма не может быть отрицательной'),
  serviceCost: z.number().min(0, 'Сумма не может быть отрицательной'),
  otherCost: z.number().min(0, 'Сумма не может быть отрицательной'),
  deposit: z.number().min(0, 'Сумма не может быть отрицательной').optional(),
  expenseCategoryId: z.string().optional(),
  renterName: z.string().max(100).optional(),
  renterPhone: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
})

interface RecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  carId?: string // Предвыбранная машина
  car?: Car // Данные машины (для режима бронирования/ТО)
  date?: string // Предвыбранная дата
  startDate?: string // Начало диапазона
  endDate?: string // Конец диапазона
  bookingMode?: boolean // Режим бронирования
  buyoutMode?: boolean // Режим выкупа
  serviceMode?: boolean // Режим ТО
  record?: CarRecord // Для редактирования
  onSuccess?: () => void
}

export function RecordModal({
  open,
  onOpenChange,
  carId,
  car: propCar,
  date,
  startDate,
  endDate,
  bookingMode = false,
  buyoutMode = false,
  serviceMode = false,
  record,
  onSuccess,
}: RecordModalProps) {
  const [selectedCarId, setSelectedCarId] = useState(carId || '')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [dailyPrice, setDailyPrice] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0) // Залоговый депозит
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null) // ID выбранного клиента
  
  // Состояние для данных договора (НЕ сохраняются в БД)
  const [showContractFields, setShowContractFields] = useState(false)
  const [contractClient, setContractClient] = useState<ContractClientData>({
    fullName: '',
    birthDate: '',
    phone: '',
    passportSeries: '',
    passportNumber: '',
    passportIssuedBy: '',
    passportIssueDate: '',
    registrationAddress: '',
  })
  const [isGeneratingContract, setIsGeneratingContract] = useState(false)
  const [isGeneratingServiceAct, setIsGeneratingServiceAct] = useState(false)
  const [isGeneratingBuyout, setIsGeneratingBuyout] = useState(false)
  const [isGeneratingSimpleRental, setIsGeneratingSimpleRental] = useState(false)

  // Поля для режима выкупа
  const [buyoutStartDate, setBuyoutStartDate] = useState('')
  const [buyoutTermMonths, setBuyoutTermMonths] = useState('')
  const [buyoutCarPrice, setBuyoutCarPrice] = useState(0)
  const [buyoutProfitPercent, setBuyoutProfitPercent] = useState(30)
  const [buyoutCity, setBuyoutCity] = useState('')
  const [buyoutStartTime, setBuyoutStartTime] = useState('10 час(ов) 00 минут')
  const [buyoutDeliveryAddress, setBuyoutDeliveryAddress] = useState('')
  const [buyoutStsSeries, setBuyoutStsSeries] = useState('')
  const [buyoutStsNumber, setBuyoutStsNumber] = useState('')
  const [buyoutStsDate, setBuyoutStsDate] = useState('')
  const [buyoutRelatives, setBuyoutRelatives] = useState<RelativeContact[]>([
    { phone: '', name: '' },
    { phone: '', name: '' },
  ])

  // Запросы
  const { data: cars = [] } = useCars()
  const { data: categories = [] } = useExpenseCategories()
  const { data: companySettings } = useCompanySettings()
  const createRecord = useCreateRecord()
  const saveClientMutation = useSaveClientFromContract()

  // Получаем выбранную машину
  const selectedCar = cars.find(c => c.id === selectedCarId) || propCar

  // Вычисляем кол-во дней (для бронирования и ТО)
  const daysCount = useMemo(() => {
    if ((!bookingMode && !serviceMode) || !startDate || !endDate) return 0
    // Парсим даты как локальные (добавляем время чтобы избежать UTC-сдвига)
    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }, [bookingMode, serviceMode, startDate, endDate])

  const totalAmount = useMemo(() => {
    return dailyPrice * daysCount
  }, [dailyPrice, daysCount])

  // Форма
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      carId: carId || '',
      recordDate: date || new Date().toISOString().split('T')[0],
      startDate: startDate || null,
      endDate: endDate || null,
      rentalAmount: 0,
      serviceCost: 0,
      otherCost: 0,
    },
  })

  // Сброс данных клиента при закрытии модалки
  useEffect(() => {
    if (!open) {
      // Сбрасываем данные клиента при закрытии
      setContractClient({
        fullName: '',
        birthDate: '',
        phone: '',
        passportSeries: '',
        passportNumber: '',
        passportIssuedBy: '',
        passportIssueDate: '',
        registrationAddress: '',
      })
      setSelectedClientId(null)
      setShowContractFields(false)
      setDepositAmount(0)
      // Сброс полей выкупа
      setBuyoutStartDate('')
      setBuyoutTermMonths('')
      setBuyoutCarPrice(0)
      setBuyoutProfitPercent(30)
      setBuyoutCity('')
      setBuyoutStartTime('10 час(ов) 00 минут')
      setBuyoutDeliveryAddress('')
      setBuyoutStsSeries('')
      setBuyoutStsNumber('')
      setBuyoutStsDate('')
      setBuyoutRelatives([{ phone: '', name: '' }, { phone: '', name: '' }])
    }
  }, [open])

  // Обновляем форму при изменении пропсов
  useEffect(() => {
    if (open) {
      const defaultDailyPrice = selectedCar?.dailyPrice || 0
      const calculatedTotal = bookingMode && daysCount > 0
        ? defaultDailyPrice * daysCount
        : 0

      // В режиме ТО автоматически находим категорию "ТО"
      let autoCategoryId = record?.expenseCategoryId || undefined
      if (serviceMode && !autoCategoryId) {
        const toCategory = categories.find(c => c.name === 'ТО')
        if (toCategory) {
          autoCategoryId = toCategory.id
        }
      }

      reset({
        carId: carId || record?.carId || '',
        recordDate: date || record?.recordDate || startDate || new Date().toISOString().split('T')[0],
        startDate: startDate || record?.startDate || null,
        endDate: endDate || record?.endDate || null,
        rentalAmount: record?.rentalAmount || calculatedTotal || 0,
        serviceCost: record?.serviceCost || 0,
        otherCost: record?.otherCost || 0,
        expenseCategoryId: autoCategoryId,
        renterName: record?.renterName || '',
        renterPhone: record?.renterPhone || '',
        notes: record?.notes || '',
      })
      setSelectedCarId(carId || record?.carId || '')
      setSelectedCategory(autoCategoryId || '')
      setDailyPrice(defaultDailyPrice)
    }
  }, [open, carId, date, startDate, endDate, bookingMode, serviceMode, daysCount, record, reset, selectedCar, categories])

  // Следим за выбранной машиной
  const formCarId = watch('carId')
  useEffect(() => {
    setSelectedCarId(formCarId)
    const car = cars.find(c => c.id === formCarId)
    if (car?.dailyPrice) {
      setDailyPrice(car.dailyPrice)
    }
  }, [formCarId, cars])

  // Вычисляем прибыль (только для обычного режима)
  const rentalAmount = watch('rentalAmount') || 0
  const serviceCost = watch('serviceCost') || 0
  const otherCost = watch('otherCost') || 0
  const profit = calcProfit(rentalAmount, serviceCost, otherCost)

  // Получаем название выбранной категории
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name

  // Форматирование диапазона дат (корректно работает с локальным часовым поясом)
  const formatDateRange = () => {
    if (!startDate || !endDate) return ''
    // Парсим дату как локальную (добавляем время чтобы избежать UTC-сдвига)
    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    
    const startStr = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    const endStr = end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    
    return `${startStr} — ${endStr}`
  }

  // Проверка активного выкупа на машину
  const { data: existingBuyout } = useActiveBuyoutByCarId(
    buyoutMode && selectedCarId ? selectedCarId : undefined
  )

  // Отправка формы
  const onSubmit = async (data: RecordFormData) => {
    try {
      // В режиме бронирования или ТО добавляем диапазон дат
      if ((bookingMode || serviceMode) && startDate && endDate) {
        data.startDate = startDate
        data.endDate = endDate
        data.recordDate = startDate
      }

      // В режиме бронирования или выкупа сохраняем/получаем clientId и данные клиента
      if ((bookingMode || buyoutMode) && contractClient.fullName) {
        if (selectedClientId) {
          data.clientId = selectedClientId
        } else {
          const client = await saveClientMutation.saveFromContract(contractClient)
          data.clientId = client.id
        }
        data.renterName = contractClient.fullName
        data.renterPhone = contractClient.phone || ''
        data.deposit = depositAmount
      }

      // В режиме выкупа добавляем специальные данные
      if (buyoutMode) {
        // P0.1: Защита от дубля договора
        if (existingBuyout) {
          alert('На эту машину уже есть активный договор выкупа. Сначала закройте текущий договор.')
          return
        }

        const termMonths = Number(buyoutTermMonths) || 0
        if (!buyoutCarPrice || buyoutCarPrice <= 0) {
          throw new Error('Укажите стоимость авто')
        }
        if (!buyoutProfitPercent || buyoutProfitPercent <= 0) {
          throw new Error('Укажите процент прибыли')
        }
        if (!termMonths) {
          throw new Error('Укажите срок выкупа')
        }
        // Автоматический расчёт
        const totalBuyoutSum = Math.round(buyoutCarPrice * (1 + buyoutProfitPercent / 100))
        const monthlyPayment = Math.round(totalBuyoutSum / termMonths)

        data.recordType = 'buyout'
        data.rentalAmount = monthlyPayment
        data.startDate = buyoutStartDate || new Date().toISOString().split('T')[0]
        const startD = new Date(data.startDate + 'T12:00:00')
        if (isNaN(startD.getTime())) {
          throw new Error('Укажите корректную дату начала')
        }
        startD.setMonth(startD.getMonth() + termMonths)
        data.endDate = startD.toISOString().split('T')[0]
        data.recordDate = data.startDate
        data.notes = `Договор выкупа. Срок: ${termMonths} мес., стоимость авто: ${buyoutCarPrice.toLocaleString('ru-RU')} ₽, % прибыли: ${buyoutProfitPercent}%`
        data.buyoutData = {
          termMonths,
          monthlyPayment,
          carPrice: buyoutCarPrice,
          profitPercent: buyoutProfitPercent,
          contractCity: buyoutCity,
          deliveryAddress: buyoutDeliveryAddress,
          startTime: buyoutStartTime,
          stsSeries: buyoutStsSeries,
          stsNumber: buyoutStsNumber,
          stsDate: buyoutStsDate,
          relatives: buyoutRelatives,
          driverLicenseSeries: contractClient.driverLicenseSeries || '',
          driverLicenseNumber: contractClient.driverLicenseNumber || '',
        }
      }

      await createRecord.mutateAsync({ data })

      // P0.2: Устанавливаем статус машины "buyout" при создании договора
      if (buyoutMode && data.carId) {
        try {
          const { updateCarStatus } = await import('@/api/cars')
          await updateCarStatus(data.carId, 'buyout')
        } catch {
          // Не блокируем основной поток, если обновление статуса не удалось
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  // Определяем заголовок
  const getModalTitle = () => {
    if (buyoutMode) return 'Договор выкупа'
    if (bookingMode) return 'Новое бронирование'
    if (serviceMode) return 'Запись на ТО'
    return record ? 'Редактировать запись' : '+ Новая запись'
  }

  // Определяем текст кнопки
  const getSubmitButtonText = () => {
    if (isSubmitting || createRecord.isPending) return 'Сохранение...'
    if (buyoutMode) return 'Оформить выкуп'
    if (bookingMode) return 'Забронировать'
    if (serviceMode) return 'Записать на ТО'
    return 'Сохранить'
  }

  // Генерация акта приёма-передачи
  const handleGenerateContract = async () => {
    if (!selectedCar) {
      alert('Выберите автомобиль')
      return
    }
    
    // Проверяем обязательные поля клиента
    if (!contractClient.fullName) {
      alert('Введите ФИО клиента')
      return
    }
    
    // Проверяем наличие данных владельца
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingContract(true)
    try {
      const renterName = watch('renterName') || ''

      const data = {
        // Данные авто
        carBrand: selectedCar.brand || '',
        carModel: selectedCar.model || '',
        carYear: selectedCar.year,
        carColor: selectedCar.color || '',
        carLicensePlate: selectedCar.licensePlate,
        carVin: selectedCar.vin || '',
        carPrice: selectedCar.purchasePrice || 0,

        // Данные клиента (АРЕНДАТОР - берёт в аренду)
        client: {
          ...contractClient,
          fullName: contractClient.fullName || renterName,
        },

        // Данные аренды
        contractNumber: generateContractNumber(),
        contractDate: new Date().toISOString().split('T')[0],
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        dailyPrice: dailyPrice,
        totalAmount: totalAmount,
        deposit: depositAmount,

        // Данные владельца (АРЕНДОДАТЕЛЬ - сдаёт в аренду)
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
      }

      // На мобильном генерируем PDF (DOCX криво рендерится в Safari, печать браузера даёт лишний footer).
      // На десктопе сохраняем DOCX (редактируемый формат).
      console.log('[RecordModal] handleGenerateContract, isMobile:', isMobileDevice())
      if (isMobileDevice()) {
        try {
          const html = await generateContractDocumentHTML(data)
          console.log('[RecordModal] HTML generated, length:', html.length)
          const filename = `Акт_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.pdf`
          await exportHtmlToPdf(html, filename)
          console.log('[RecordModal] PDF opened')
        } catch (htmlErr) {
          console.error('[RecordModal] PDF generation error:', htmlErr)
          alert('Ошибка генерации PDF: ' + (htmlErr as Error).message)
        }
      } else {
        await generateContractDocument(data)
      }
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта: ' + (error as Error).message)
    } finally {
      setIsGeneratingContract(false)
    }
  }

  // Генерация акта выполненных работ
  const handleGenerateServiceAct = async () => {
    if (!selectedCar) {
      alert('Выберите автомобиль')
      return
    }
    
    // Проверяем обязательные поля клиента
    if (!contractClient.fullName) {
      alert('Введите ФИО клиента')
      return
    }
    
    // Проверяем наличие данных владельца
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingServiceAct(true)
    try {
      const renterName = watch('renterName') || ''

      const data = {
        // Номер акта (используем тот же генератор что для договоров)
        actNumber: generateContractNumber().replace('ККР-', 'А-'),
        actDate: new Date().toISOString().split('T')[0],

        // Данные договора
        contractNumber: generateContractNumber(),
        contractDate: new Date().toISOString().split('T')[0],

        // Исполнитель (владелец)
        executor: {
          fullName: companySettings.ownerFullName || '',
          phone: companySettings.ownerPhone || '',
        },

        // Заказчик (клиент)
        customer: {
          fullName: contractClient.fullName || renterName,
          phone: contractClient.phone,
        },

        // Данные аренды
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        dailyPrice: dailyPrice,
        totalAmount: totalAmount,
        rentalDays: daysCount,

        // Данные авто
        carName: selectedCar.name,
        carLicensePlate: selectedCar.licensePlate,
      }

      // На мобильном генерируем PDF, на десктопе — DOCX
      if (isMobileDevice()) {
        const html = generateServiceActDocumentHTML(data)
        await exportHtmlToPdf(html, `Акт_ТО_${data.carLicensePlate}_${data.customer.fullName.replace(/\s+/g, '_')}.pdf`)
      } else {
        await generateServiceActDocument(data)
      }
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта')
    } finally {
      setIsGeneratingServiceAct(false)
    }
  }

  // Генерация договора выкупа
  const handleGenerateBuyoutContract = async () => {
    if (!selectedCar) {
      alert('Выберите автомобиль')
      return
    }

    if (!contractClient.fullName) {
      alert('Введите ФИО клиента')
      return
    }

    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }

    setIsGeneratingBuyout(true)
    try {
      const effectiveDate = buyoutStartDate || new Date().toISOString().split('T')[0]

      const data = {
        carBrand: selectedCar.brand || '',
        carModel: selectedCar.model || '',
        carYear: selectedCar.year,
        carColor: selectedCar.color || '',
        carLicensePlate: selectedCar.licensePlate,
        carVin: selectedCar.vin || '',

        client: {
          ...contractClient,
          fullName: contractClient.fullName,
        },

        contractNumber: generateContractNumber(),
        contractDate: effectiveDate,
        startDate: effectiveDate,
        startTime: buyoutStartTime,
        paymentDay: new Date(effectiveDate + 'T12:00:00').getDate(),

        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },

        termMonths: Number(buyoutTermMonths) || 0,
        monthlyPayment: buyoutCarPrice && buyoutProfitPercent && Number(buyoutTermMonths)
          ? Math.round(buyoutCarPrice * (1 + buyoutProfitPercent / 100) / Number(buyoutTermMonths))
          : 0,
        buyoutPrice: buyoutCarPrice && buyoutProfitPercent
          ? Math.round(buyoutCarPrice * (1 + buyoutProfitPercent / 100))
          : 0,
        deposit: depositAmount,
        contractCity: buyoutCity,
        deliveryAddress: buyoutDeliveryAddress,

        carStsSeries: buyoutStsSeries,
        carStsNumber: buyoutStsNumber,
        carStsDate: buyoutStsDate,

        relatives: buyoutRelatives,
      }

      // На мобильном генерируем PDF, на десктопе — DOCX
      if (isMobileDevice()) {
        const html = await generateBuyoutContractDocumentHTML(data)
        await exportHtmlToPdf(html, `Договор_выкуп_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.pdf`)
      } else {
        await generateBuyoutContractDocument(data)
      }
    } catch (error) {
      console.error('Ошибка генерации договора выкупа:', error)
      alert('Ошибка при генерации договора выкупа')
    } finally {
      setIsGeneratingBuyout(false)
    }
  }

  // Генерация нового договора аренды (без выкупа) - точно по образцу
  const handleGenerateSimpleRentalContract = async () => {
    if (!selectedCar) {
      alert('Выберите автомобиль')
      return
    }
    
    // Проверяем обязательные поля клиента
    if (!contractClient.fullName) {
      alert('Введите ФИО клиента')
      return
    }
    
    // Проверяем наличие данных владельца
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingSimpleRental(true)
    try {
      const data = {
        // Данные авто
        carBrand: selectedCar.brand || '',
        carModel: selectedCar.model || '',
        carYear: selectedCar.year,
        carColor: selectedCar.color || '',
        carLicensePlate: selectedCar.licensePlate,
        carVin: selectedCar.vin || '',
        carStsSeries: buyoutStsSeries || '',
        carStsNumber: buyoutStsNumber || '',
        carStsDate: buyoutStsDate || '',

        // Данные клиента
        client: contractClient,

        // Данные аренды
        contractNumber: generateContractNumber(),
        contractDate: new Date().toISOString().split('T')[0],
        contractCity: buyoutCity || 'Волгодонск',
        startDate: startDate || new Date().toISOString().split('T')[0],
        startTime: buyoutStartTime || '17 час(ов) 00 минут',
        termDays: daysCount || 3,
        dailyPrice: dailyPrice,
        deposit: depositAmount,
        deliveryAddress: buyoutDeliveryAddress || '',

        // Данные владельца
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
      }

      // На мобильном генерируем PDF, на десктопе — DOCX
      if (isMobileDevice()) {
        const html = generateSimpleRentalContractDocumentHTML(data)
        await exportHtmlToPdf(html, `Договор_аренда_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.pdf`)
      } else {
        await generateSimpleRentalContractDocument(data)
      }
    } catch (error) {
      console.error('Ошибка генерации договора аренды:', error)
      alert('Ошибка при генерации договора')
    } finally {
      setIsGeneratingSimpleRental(false)
    }
  }

  // Обработчик изменения полей клиента
  const handleClientFieldChange = (field: keyof ContractClientData, value: string) => {
    // При очистке ФИО — очищаем все поля клиента
    if (field === 'fullName' && value.trim() === '') {
      setContractClient({
        fullName: '',
        birthDate: '',
        phone: '',
        passportSeries: '',
        passportNumber: '',
        passportIssuedBy: '',
        passportIssueDate: '',
        registrationAddress: '',
      })
      setSelectedClientId(null)
      setDepositAmount(0)
      return
    }
    
    // Валидация формата даты (ДД.ММ.ГГГГ) для полей дат
    if (field === 'birthDate' || field === 'passportIssueDate') {
      // Позволяем пустое значение или частичный ввод
      if (value === '') {
        setContractClient(prev => ({ ...prev, [field]: value }))
        return
      }
      
      // Проверяем формат: две цифры, точка, две цифры, точка, четыре цифры
      const dateRegex = /^(\d{0,2})\.?(\d{0,2})\.?(\d{0,4})$/
      const match = value.match(dateRegex)
      
      if (!match) {
        // Неверный формат - не сохраняем
        return
      }
      
      // Если формат верный, сохраняем
      setContractClient(prev => ({ ...prev, [field]: value }))
      return
    }
    
    setContractClient(prev => ({ ...prev, [field]: value }))
    // При ручном изменении полей сбрасываем selectedClientId
    if (field === 'fullName') {
      setSelectedClientId(null)
    }
  }

  // Обработчик выбора клиента из поиска
  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id)
    // Автозаполняем все поля из данных клиента
    setContractClient(clientToContractData(client))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <span className="hidden" />
      </Dialog.Trigger>
      <Dialog.Content className="w-[95vw] max-w-2xl p-6">
        <Dialog.Header className="mb-4">
          {getModalTitle()}
        </Dialog.Header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* В режиме бронирования/ТО/выкупа показываем инфо о машине */}
        {(bookingMode || serviceMode || buyoutMode) && selectedCar ? (
          <div className="p-3 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedCar.colorTag }}
              />
              <span className="font-bold">{selectedCar.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{selectedCar.licensePlate}</p>
          </div>
        ) : (
          /* Выбор машины (обычный режим) */
          <div className="space-y-2">
            <Label>Машина</Label>
            <Select
              value={selectedCarId}
              onValueChange={(value) => {
                setValue('carId', value)
                setSelectedCarId(value)
              }}
              disabled={!!carId}
            >
              <Select.Trigger className="w-full">
                <Select.Value>
                  {selectedCar ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedCar.colorTag }}
                      />
                      {selectedCar.name}
                    </div>
                  ) : (
                    'Выберите машину'
                  )}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                {cars.map((car) => (
                  <Select.Item key={car.id} value={car.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: car.colorTag }}
                      />
                      {car.name}
                    </div>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            {errors.carId && (
              <p className="text-sm text-destructive">{errors.carId.message}</p>
            )}
          </div>
        )}

        {/* Диапазон дат для бронирования/ТО */}
        {(bookingMode || serviceMode) && startDate && endDate && (
          <div className={`p-3 border-2 rounded-lg ${bookingMode ? 'bg-primary/10 border-primary' : 'bg-orange-50 border-orange-500'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${bookingMode ? '' : 'text-orange-700'}`}>
                {formatDateRange()}
              </span>
              <span className={`text-sm ${bookingMode ? 'text-muted-foreground' : 'text-orange-600'}`}>
                {daysCount} дн.
              </span>
            </div>
          </div>
        )}

        {/* Дата (обычный режим) */}
        {!bookingMode && !serviceMode && !buyoutMode && (
          <div className="space-y-2">
            <Label htmlFor="recordDate">Дата</Label>
            <Input
              id="recordDate"
              type="date"
              {...register('recordDate')}
            />
            {errors.recordDate && (
              <p className="text-sm text-destructive">{errors.recordDate.message}</p>
            )}
          </div>
        )}

        {/* === РЕЖИМ БРОНИРОВАНИЯ - Цена и Итого (адаптивная раскладка) === */}
        {bookingMode && (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-center gap-4">
            {/* Строка 1 (мобильные): Инпут цены за сутки */}
            <div className="w-full sm:w-64 space-y-2">
              <Label htmlFor="dailyPriceInput">Цена за сутки (₽)</Label>
              <Input
                id="dailyPriceInput"
                type="number"
                min="0"
                step="100"
                value={dailyPrice || ''}
                onChange={(e) => {
                  const price = Number(e.target.value)
                  setDailyPrice(price)
                  setValue('rentalAmount', price * daysCount)
                }}
                autoFocus={false}
                tabIndex={-1}
              />
            </div>
            
            {/* Строка 2 (мобильные): Итого - две строки на мобильных, одна на ПК */}
            <div className="w-full px-4 py-3 bg-green-50 border-2 border-green-500 rounded-lg text-center sm:flex sm:items-center sm:justify-center sm:gap-2">
              <div className="text-lg font-bold text-green-700 sm:text-base">
                Итого: {formatMoney(totalAmount)}
              </div>
              <div className="text-sm text-green-600 mt-1 sm:mt-0 sm:text-sm">
                ({daysCount} дн. × {formatMoney(dailyPrice)})
              </div>
            </div>
          </div>
        )}
        {/* Скрытое поле для передачи суммы */}
        {bookingMode && (
          <input type="hidden" {...register('rentalAmount', { valueAsNumber: true })} value={totalAmount} />
        )}

        {/* Двухколоночная раскладка для ПК (не показываем в режиме выкупа) */}
        {!buyoutMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Левая колонка */}
          <div className="space-y-4">
            {/* === РЕЖИМ ТО === */}
            {serviceMode && (
              <>
                {/* Сумма ТО */}
                <div className="space-y-2">
                  <Label htmlFor="serviceCostServiceMode">Сумма ТО (₽)</Label>
                  <Input
                    id="serviceCostServiceMode"
                    type="number"
                    min="0"
                    step="100"
                    {...register('serviceCost', { valueAsNumber: true })}
                  />
                </div>
                {/* Категория "ТО" автоматически выбирается при открытии модалки */}
                <input type="hidden" {...register('expenseCategoryId')} value={selectedCategory} />
              </>
            )}

            {/* === ОБЫЧНЫЙ РЕЖИМ === */}
            {!bookingMode && !serviceMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rentalAmount">Аренда (₽)</Label>
                  <Input
                    id="rentalAmount"
                    type="number"
                    min="0"
                    step="100"
                    {...register('rentalAmount', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceCost">ТО (₽)</Label>
                  <Input
                    id="serviceCost"
                    type="number"
                    min="0"
                    step="100"
                    {...register('serviceCost', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherCost">Прочие расходы (₽)</Label>
                  <Input
                    id="otherCost"
                    type="number"
                    min="0"
                    step="100"
                    {...register('otherCost', { valueAsNumber: true })}
                  />
                </div>

                {/* Категория расхода */}
                {(serviceCost > 0 || otherCost > 0) && (
                  <div className="space-y-2">
                    <Label>Категория расхода</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setValue('expenseCategoryId', value || undefined)
                        setSelectedCategory(value)
                      }}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value>
                          {selectedCategoryName || 'Выберите категорию'}
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content>
                        {categories.map((cat) => (
                          <Select.Item key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              {cat.icon && <span>{cat.icon}</span>}
                              {cat.name}
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                )}

                {/* Прибыль */}
                <div className={`
                  p-3 border-2 border-border
                  ${profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                `}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Прибыль:</span>
                    <span className="text-lg font-bold">
                      {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                    </span>
                  </div>
                  <p className="text-xs opacity-75 mt-1">
                    (считается автоматически)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            {/* Примечание - только для обычного режима и ТО */}
            {!bookingMode && (
              <div className="space-y-2">
                <Label htmlFor="notes">Примечание</Label>
                <Textarea
                  id="notes"
                  placeholder={serviceMode ? 'Описание работ...' : 'Дополнительная информация...'}
                  {...register('notes')}
                  rows={serviceMode ? 4 : 3}
                />
              </div>
            )}
          </div>
        </div>
        )}

        {/* Блок данных для договора (только в режиме бронирования) */}
        {bookingMode && (
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50">
            <button
              type="button"
              onClick={() => setShowContractFields(!showContractFields)}
              className="flex items-center justify-between w-full text-left font-medium text-blue-700 mb-2"
            >
              <span>📄 Создание бронирования</span>
              <span className="text-xl">{showContractFields ? '▲' : '▼'}</span>
            </button>
            
            {showContractFields && (
              <div className="space-y-3 mt-3">
                {/* ФИО с поиском клиента */}
                <div className="space-y-1">
                  <Label htmlFor="contractFullName" className="text-sm">ФИО полностью *</Label>
                  <ClientSearch
                    id="contractFullName"
                    value={contractClient.fullName}
                    onChange={(value) => handleClientFieldChange('fullName', value)}
                    onSelectClient={handleSelectClient}
                    placeholder=""
                    className="bg-white"
                  />
                </div>
                
                {/* Дата рождения */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="contractBirthDate" className="text-sm">Дата рождения</Label>
                    <Input
                      id="contractBirthDate"
                      type="text"
                      placeholder="дд.мм.гггг"
                      value={contractClient.birthDate}
                      onChange={(e) => handleClientFieldChange('birthDate', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  {/* Пустая ячейка для выравнивания на мобильных */}
                  <div className="hidden sm:block"></div>
                </div>
                
                {/* Телефон и Депозит в одну строку */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="contractPhone" className="text-sm">Телефон</Label>
                    <Input
                      id="contractPhone"
                      type="tel"
                      value={contractClient.phone}
                      onChange={(e) => handleClientFieldChange('phone', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractDeposit" className="text-sm">Залог (₽)</Label>
                    <Input
                      id="contractDeposit"
                      type="number"
                      min="0"
                      step="100"
                      value={depositAmount === 0 ? '' : depositAmount}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value)
                        setDepositAmount(value)
                        setValue('deposit', value)
                      }}
                      className="bg-white"
                    />
                  </div>
                </div>
                
                {/* Паспорт - серия и номер раздельно */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contractPassportSeries" className="text-sm">Серия паспорта</Label>
                    <Input
                      id="contractPassportSeries"
                      type="text"
                      value={contractClient.passportSeries}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        handleClientFieldChange('passportSeries', value)
                      }}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contractPassportNumber" className="text-sm">Номер паспорта</Label>
                    <Input
                      id="contractPassportNumber"
                      type="text"
                      value={contractClient.passportNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        handleClientFieldChange('passportNumber', value)
                      }}
                      className="bg-white"
                    />
                  </div>
                </div>
                
                {/* Кем выдан */}
                <div className="space-y-1">
                  <Label htmlFor="contractIssuedBy" className="text-sm">Кем выдан</Label>
                  <Input
                    id="contractIssuedBy"
                    type="text"
                    value={contractClient.passportIssuedBy}
                    onChange={(e) => handleClientFieldChange('passportIssuedBy', e.target.value)}
                    className="bg-white"
                  />
                </div>
                
                {/* Дата выдачи и прописка */}
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <div className="space-y-2">
                    <Label htmlFor="contractIssueDate" className="text-sm">Дата выдачи</Label>
                    <Input
                      id="contractIssueDate"
                      type="text"
                      placeholder="дд.мм.гггг"
                      value={contractClient.passportIssueDate}
                      onChange={(e) => handleClientFieldChange('passportIssueDate', e.target.value)}
                      className="bg-white relative z-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractAddress" className="text-sm">Прописка</Label>
                    <Input
                      id="contractAddress"
                      type="text"
                      value={contractClient.registrationAddress}
                      onChange={(e) => handleClientFieldChange('registrationAddress', e.target.value)}
                      className="bg-white relative z-10"
                    />
                  </div>
                </div>
                
                {/* Кнопки печати документов */}
                <div className="pt-6 space-y-3 mt-6 border-t border-border">
                  {/* 1. Договор аренды */}
                  <GenerateDocButton
                    loading={isGeneratingSimpleRental}
                    desktopLabel="📄 Печать договора аренды"
                    onClick={handleGenerateSimpleRentalContract}
                    disabled={isGeneratingContract || isGeneratingServiceAct || !contractClient.fullName}
                    variantClass="border-blue-500 text-blue-700 hover:bg-blue-100"
                  />

                  {/* 2. Акт приёма-передачи */}
                  <GenerateDocButton
                    loading={isGeneratingContract}
                    desktopLabel="📋 Печать акта приёма-передачи"
                    onClick={handleGenerateContract}
                    disabled={isGeneratingContract || isGeneratingServiceAct || !contractClient.fullName}
                    variantClass="border-green-500 text-green-700 hover:bg-green-100"
                  />

                  {/* 3. Акт выполненных работ */}
                  <GenerateDocButton
                    loading={isGeneratingServiceAct}
                    desktopLabel="📝 Печать акта выполненных работ"
                    onClick={handleGenerateServiceAct}
                    disabled={isGeneratingContract || isGeneratingServiceAct || !contractClient.fullName}
                    variantClass="border-purple-500 text-purple-700 hover:bg-purple-100"
                  />

                  <p className="text-xs text-muted-foreground text-center">
                    {isMobileDevice()
                      ? 'На мобильном откроется PDF в новой вкладке'
                      : 'На ПК скачивается DOCX (Word) для печати'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === РЕЖИМ ВЫКУПА — Полная форма === */}
        {buyoutMode && (
          <div className="border-2 border-dashed border-amber-300 rounded-lg p-4 bg-amber-50/50 space-y-3">
            <h3 className="font-medium text-amber-700">📄 Договор аренды с правом выкупа</h3>

            {/* Город и дата начала */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Город заключения</Label>
                <Input
                  type="text"
                  value={buyoutCity}
                  onChange={(e) => setBuyoutCity(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Дата начала</Label>
                <Input
                  type="date"
                  value={buyoutStartDate}
                  onChange={(e) => setBuyoutStartDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Стоимость авто, процент прибыли, срок */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Стоимость авто (₽)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={buyoutCarPrice || ''}
                  onChange={(e) => setBuyoutCarPrice(Number(e.target.value))}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">% прибыли</Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={buyoutProfitPercent || ''}
                  onChange={(e) => setBuyoutProfitPercent(Number(e.target.value))}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Срок (мес.)</Label>
                <Input
                  type="text"
                  value={buyoutTermMonths}
                  onChange={(e) => setBuyoutTermMonths(e.target.value.replace(/\D/g, ''))}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Автоматический расчёт */}
            {buyoutCarPrice > 0 && buyoutProfitPercent > 0 && Number(buyoutTermMonths) > 0 && (
              <div className="p-3 bg-green-50 border border-green-300 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Полная сумма выкупа:</span>
                  <span className="font-bold">{formatMoney(Math.round(buyoutCarPrice * (1 + buyoutProfitPercent / 100)))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ежемесячный платёж:</span>
                  <span className="font-bold text-green-600">{formatMoney(Math.round(buyoutCarPrice * (1 + buyoutProfitPercent / 100) / Number(buyoutTermMonths)))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Прибыль:</span>
                  <span className="font-bold text-green-600">+{formatMoney(Math.round(buyoutCarPrice * buyoutProfitPercent / 100))}</span>
                </div>
              </div>
            )}

            {/* Обеспечительный платеж и время */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Обеспечительный платёж (₽)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={depositAmount || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value)
                    setDepositAmount(val)
                    setValue('deposit', val)
                  }}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Время передачи</Label>
                <Input
                  type="text"
                  value={buyoutStartTime}
                  onChange={(e) => setBuyoutStartTime(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Адрес площадки */}
            <div className="space-y-2">
              <Label className="text-sm">Адрес площадки приёма/передачи</Label>
              <Input
                type="text"
                value={buyoutDeliveryAddress}
                onChange={(e) => setBuyoutDeliveryAddress(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* СТС */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">СТС серия</Label>
                <Input
                  type="text"
                  value={buyoutStsSeries}
                  onChange={(e) => setBuyoutStsSeries(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">СТС номер</Label>
                <Input
                  type="text"
                  value={buyoutStsNumber}
                  onChange={(e) => setBuyoutStsNumber(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Дата СТС</Label>
                <Input
                  type="text"
                  value={buyoutStsDate}
                  onChange={(e) => setBuyoutStsDate(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Данные клиента */}
            <div className="pt-3 mt-3 border-t border-amber-200 space-y-3">
              <h4 className="text-sm font-medium text-amber-600">Данные арендатора</h4>

              {/* ФИО с поиском клиента */}
              <div className="space-y-1">
                <Label className="text-sm">ФИО полностью *</Label>
                <ClientSearch
                  value={contractClient.fullName}
                  onChange={(value) => handleClientFieldChange('fullName', value)}
                  onSelectClient={handleSelectClient}
                  placeholder=""
                  className="bg-white"
                />
              </div>

              {/* Дата рождения */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Дата рождения</Label>
                  <Input
                    type="text"
                    value={contractClient.birthDate}
                    onChange={(e) => handleClientFieldChange('birthDate', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Телефон</Label>
                  <Input
                    type="tel"
                    value={contractClient.phone}
                    onChange={(e) => handleClientFieldChange('phone', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Водительское удостоверение */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Серия В/У</Label>
                  <Input
                    type="text"
                    value={contractClient.driverLicenseSeries || ''}
                    onChange={(e) => handleClientFieldChange('driverLicenseSeries', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Номер В/У</Label>
                  <Input
                    type="text"
                    value={contractClient.driverLicenseNumber || ''}
                    onChange={(e) => handleClientFieldChange('driverLicenseNumber', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Паспорт */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Серия паспорта</Label>
                  <Input
                    type="text"
                    value={contractClient.passportSeries}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                      handleClientFieldChange('passportSeries', value)
                    }}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Номер паспорта</Label>
                  <Input
                    type="text"
                    value={contractClient.passportNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      handleClientFieldChange('passportNumber', value)
                    }}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Кем выдан</Label>
                <Input
                  type="text"
                  value={contractClient.passportIssuedBy}
                  onChange={(e) => handleClientFieldChange('passportIssuedBy', e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Дата выдачи</Label>
                  <Input
                    type="text"
                    value={contractClient.passportIssueDate}
                    onChange={(e) => handleClientFieldChange('passportIssueDate', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Прописка</Label>
                  <Input
                    type="text"
                    value={contractClient.registrationAddress}
                    onChange={(e) => handleClientFieldChange('registrationAddress', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Телефоны родственников */}
            <div className="pt-3 mt-3 border-t border-amber-200 space-y-3">
              <h4 className="text-sm font-medium text-amber-600">Телефоны родственников</h4>
              {buyoutRelatives.map((rel, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Имя, кем приходится</Label>
                    <Input
                      type="text"
                      value={rel.name}
                      onChange={(e) => {
                        const updated = [...buyoutRelatives]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setBuyoutRelatives(updated)
                      }}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Телефон</Label>
                    <Input
                      type="tel"
                      value={rel.phone}
                      onChange={(e) => {
                        const updated = [...buyoutRelatives]
                        updated[idx] = { ...updated[idx], phone: e.target.value }
                        setBuyoutRelatives(updated)
                      }}
                      className="bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Кнопка печати договора выкупа */}
            <div className="pt-3 mt-3 border-t border-amber-200">
              <GenerateDocButton
                loading={isGeneratingBuyout}
                desktopLabel="📄 Печать договора выкупа"
                onClick={handleGenerateBuyoutContract}
                disabled={isGeneratingBuyout || !contractClient.fullName}
                variantClass="border-amber-500 text-amber-700 hover:bg-amber-100"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isMobileDevice()
                  ? 'На мобильном откроется PDF в новой вкладке'
                  : 'На ПК скачивается DOCX (Word) для печати'}
              </p>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || createRecord.isPending || ((bookingMode || buyoutMode) && !contractClient.fullName)}
          >
            {getSubmitButtonText()}
          </Button>
        </div>
        
        {/* Подсказка о необходимости заполнить данные клиента */}
        {(bookingMode || buyoutMode) && !contractClient.fullName && (
          <p className="text-sm text-amber-600 text-center">
            ⚠️ Для {buyoutMode ? 'оформления выкупа' : 'бронирования'} необходимо указать ФИО клиента
          </p>
        )}
      </form>
      </Dialog.Content>
    </Dialog>
  )
}
