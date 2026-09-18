// ============================================================
// PAGE: CAR DETAIL (КАРТОЧКА МАШИНЫ)
// Детальная страница машины с таймлайном и историей записей
// ============================================================

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ClipboardList, ChevronLeft, ChevronRight, Plus, ChevronDown, Car, Save, Check, Wrench, X, Wallet, Receipt, Trash2, Phone, Clock, Copy, Shield, Download, Eye } from 'lucide-react'
import { Dialog } from '@/components/retroui/Dialog'
import { Card } from '@/components/retroui/Card'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Label } from '@/components/retroui/Label'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MonthTimeline } from '@/components/features/MonthTimeline'
import { RecordModal } from '@/components/features/RecordModal'
import { PageContainer } from '@/components/features/AppLayout'
import { useCar, useUpdateCarStatus, useUpdateCar } from '@/hooks/useCars'
import { useCarTimeline, useRecordsByCar, useBookedDates, useCreateRecord, useExpenseRecordsByCar, useDeleteExpenseRecord, useDeleteBookingRecord, usePreparationRecordsByCar, useCreatePreparationRecord, useDeletePreparationRecord, useAllRecordsByCarForStats } from '@/hooks/useRecords'
import { useExpenseCategories } from '@/hooks/useFinance'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useAppStore } from '@/store/useAppStore'
import { formatMoney } from '@/utils/format'
import { calcBuyoutProfitShare } from '@/utils/calc'
import { CAR_STATUS_LABELS, MONTHS_RU, PREPARATION_CATEGORY_NAMES, PREPARATION_NOTES } from '@/constants'
import { generateContractDocument, generateSimpleRentalContractDocument, generateServiceActDocument, generateContractNumber } from '@/utils/contractGenerator'
import { generateContractDocumentHTML, generateSimpleRentalContractDocumentHTML, generateServiceActDocumentHTML, openHtmlDocument } from '@/utils/contractGeneratorHTML'
import { getClient, clientToContractData } from '@/api/clients'
import { Loader } from '@/components/retroui/Loader'
import type { CarStatus, ExpenseCategory, CarRecord, ContractClientData } from '@/types'

export function CarDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [actionSelectModalOpen, setActionSelectModalOpen] = useState(false) // Модалка выбора типа действия
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expenseHistoryExpanded, setExpenseHistoryExpanded] = useState(false)
  const [timelineKey, setTimelineKey] = useState(0) // Ключ для сброса состояния таймлайна
  
  // Состояния для аккордеона расходов
  const [expenseExpanded, setExpenseExpanded] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null)
  const [amount, setAmount] = useState('')
  const [comment, setComment] = useState('')
  
  // Состояния для режимов (бронирование, ТО или выкуп)
  const [bookingMode, setBookingMode] = useState(false)
  const [serviceMode, setServiceMode] = useState(false)
  const [buyoutMode, setBuyoutMode] = useState(false)
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>()
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>()
  
  // Состояние для отображения галочки сохранения цены
  const [showPriceSaved, setShowPriceSaved] = useState(false)
  
  // Состояние для отображения галочки сохранения даты покупки
  const [showPurchaseDateSaved, setShowPurchaseDateSaved] = useState(false)
  
  const { selectedMonth, setSelectedMonth } = useAppStore()
  const [year, month] = selectedMonth.split('-').map(Number)
  
  // Запросы
  const { data: car, isLoading: carLoading } = useCar(id)
  const { data: timeline, isLoading: timelineLoading } = useCarTimeline(id || '', year, month)
  const { data: records } = useRecordsByCar(id || '', year, month)
  const { data: allRecords } = useAllRecordsByCarForStats(id || '', year, month)
  const { data: bookedDates } = useBookedDates(id || '', year, month)
  const { data: expenseRecords } = useExpenseRecordsByCar(id || '')
  const updateStatus = useUpdateCarStatus()
  const updateCar = useUpdateCar()
  const { data: categories = [] } = useExpenseCategories()
  const createRecord = useCreateRecord()
  const deleteExpenseRecord = useDeleteExpenseRecord()
  const deleteBookingRecord = useDeleteBookingRecord()
  const { data: companySettings } = useCompanySettings()
  const { data: preparationRecords } = usePreparationRecordsByCar(id || '')
  const createPrepRecord = useCreatePreparationRecord()
  const deletePrepRecord = useDeletePreparationRecord()
  
  // Состояние для подтверждения удаления
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteBookingConfirmId, setDeleteBookingConfirmId] = useState<string | null>(null)
  
  // Состояния для аккордеона первичной подготовки
  const [prepExpanded, setPrepExpanded] = useState(false)
  const [prepCategory, setPrepCategory] = useState<'insurance' | 'tires' | 'other' | null>(null)
  const [prepAmount, setPrepAmount] = useState('')
  const [prepComment, setPrepComment] = useState('')
  const [deletePrepConfirmId, setDeletePrepConfirmId] = useState<string | null>(null)
  
  // Табы в истории расходов
  const [expenseTab, setExpenseTab] = useState<'operational' | 'preparation'>('operational')
  
  // Состояние для отслеживания скопированного телефона (id записи)
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null)
  
  // Состояние для отслеживания генерации документов (ключ = recordId + тип документа)
  const [generatingDocs, setGeneratingDocs] = useState<Record<string, boolean>>({})

  // Показываем полный Loader только при начальной загрузке машины
  // При переключении месяца показываем Loader только в области календаря
  const isInitialLoading = carLoading && !car
  const isTimelineLoading = timelineLoading
  
  // Обработчики для аккордеона расходов
  const handleCategoryClick = (category: ExpenseCategory) => {
    setActiveCategory(activeCategory?.id === category.id ? null : category)
    setAmount('')
    setComment('')
  }

  const handleSaveExpense = async () => {
    if (!activeCategory || !amount || !id) return

    // Определяем дату расхода: если прошлый месяц — 1 число, если текущий — сегодня
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = today.substring(0, 7)
    const recordDate = selectedMonth === currentMonth ? today : `${selectedMonth}-01`

    try {
      await createRecord.mutateAsync({
        data: {
          carId: id,
          recordDate,
          rentalAmount: 0,
          serviceCost: activeCategory.name === 'ТО' ? Number(amount) : 0,
          otherCost: activeCategory.name !== 'ТО' ? Number(amount) : 0,
          expenseCategoryId: activeCategory.id,
          notes: comment || undefined,
        }
      })
      // Сбрасываем форму
      setActiveCategory(null)
      setAmount('')
      setComment('')
    } catch (error) {
      console.error('Ошибка сохранения расхода:', error)
    }
  }

  const handleCancelExpense = () => {
    setActiveCategory(null)
    setAmount('')
    setComment('')
  }
  
  // Обработчики для первичной подготовки
  const handlePrepCategoryClick = (cat: 'insurance' | 'tires' | 'other') => {
    setPrepCategory(prepCategory === cat ? null : cat)
    setPrepAmount('')
    setPrepComment('')
  }

  const handleSavePrepExpense = async () => {
    if (!prepCategory || !prepAmount || !id) return

    try {
      await createPrepRecord.mutateAsync({
        carId: id,
        category: prepCategory,
        amount: Number(prepAmount),
        comment: prepCategory === 'other' ? prepComment : undefined,
      })
      setPrepCategory(null)
      setPrepAmount('')
      setPrepComment('')
    } catch (error) {
      console.error('Ошибка сохранения расхода подготовки:', error)
    }
  }

  const handleCancelPrepExpense = () => {
    setPrepCategory(null)
    setPrepAmount('')
    setPrepComment('')
  }
  
  // Сохранение цены в БД
  const handleSaveDailyPrice = (value: string) => {
    if (id) {
      updateCar.mutate({
        id,
        data: { dailyPrice: Number(value) || 0 }
      }, {
        onSuccess: () => {
          setShowPriceSaved(true)
        }
      })
    }
  }

  // Сохранение даты покупки в БД
  const handleSavePurchaseDate = (value: string) => {
    if (id) {
      updateCar.mutate({
        id,
        data: { purchaseDate: value || null }
      }, {
        onSuccess: () => {
          setShowPurchaseDateSaved(true)
        }
      })
    }
  }

  // Переключение месяца
  const handlePrevMonth = () => {
    const date = new Date(year, month - 2)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  const handleNextMonth = () => {
    const date = new Date(year, month)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  // Клик на день таймлайна (только для обычного режима, не selectionMode)
  const handleDayClick = (_day: { date: string }) => {
    // В режиме выбора этот callback не вызывается - используется handleSelectionChange// _day не используется, но нужен для совместимости с интерфейсом
  }

  // Изменение выбора дат (вызывается при каждом клике в режиме выбора)
  const handleSelectionChange = (startDate: string | null, endDate: string | null) => {
    if (startDate) {
      setSelectedStartDate(startDate)
      setSelectedEndDate(endDate || startDate) // Если нет конца, используем начало
    } else {
      // Выбор сброшен
      setSelectedStartDate(undefined)
      setSelectedEndDate(undefined)
    }
  }

  // Выбор диапазона дат - показываем модалку выбора действия
  const handleRangeSelect = (startDate: string, endDate: string) => {
    setSelectedStartDate(startDate)
    setSelectedEndDate(endDate)
    
    // Если выбран один день - сразу открываем модалку бронирования
    if (startDate === endDate) {
      setBookingMode(true)
      setServiceMode(false)
      setRecordModalOpen(true)
    } else {
      // Если диапазон - показываем модалку выбора типа действия
      setActionSelectModalOpen(true)
    }
  }
  
  // Выбор типа действия в модалке
  const handleSelectBooking = () => {
    setActionSelectModalOpen(false)
    setBookingMode(true)
    setServiceMode(false)
    setRecordModalOpen(true)
  }
  
  const handleSelectService = () => {
    setActionSelectModalOpen(false)
    setBookingMode(false)
    setServiceMode(true)
    setRecordModalOpen(true)
  }
  
  // Закрытие модалки выбора действия
  const handleActionSelectClose = (open: boolean) => {
    setActionSelectModalOpen(open)
    if (!open) {
      // Сбрасываем выбранную дату при закрытии модалки
      setSelectedStartDate(undefined)
      setSelectedEndDate(undefined)
      setTimelineKey(prev => prev + 1)
    }
  }

  // Изменение статуса
  const handleStatusChange = (status: CarStatus) => {
    if (id) {
      updateStatus.mutate({ id, status })
    }
  }

  // Назад
  const handleBack = () => {
    navigate('/cars')
  }

  // Получение сегодняшней даты в локальном часовом поясе
  const getTodayLocal = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  // Открытие модалки бронирования
  const handleOpenBooking = () => {
    // Если дата не выбрана - используем сегодня
    const dateToUse = selectedStartDate || getTodayLocal()
    setSelectedStartDate(dateToUse)
    setSelectedEndDate(dateToUse)
    setBookingMode(true)
    setServiceMode(false)
    setRecordModalOpen(true)
  }

  // Открытие модалки ТО
  const handleOpenService = () => {
    const dateToUse = selectedStartDate || getTodayLocal()
    setSelectedStartDate(dateToUse)
    setSelectedEndDate(dateToUse)
    setBookingMode(false)
    setBuyoutMode(false)
    setServiceMode(true)
    setRecordModalOpen(true)
  }

  // Открытие модалки выкупа
  const handleOpenBuyout = () => {
    const dateToUse = selectedStartDate || getTodayLocal()
    setSelectedStartDate(dateToUse)
    setSelectedEndDate(dateToUse)
    setBookingMode(false)
    setServiceMode(false)
    setBuyoutMode(true)
    setRecordModalOpen(true)
  }

  // Закрытие модального окна - сбрасываем выбор даты
  const handleModalClose = (open: boolean) => {
    setRecordModalOpen(open)
    if (!open) {
      setBookingMode(false)
      setServiceMode(false)
      setBuyoutMode(false)
      // Сбрасываем выбранную дату при закрытии модалки
      setSelectedStartDate(undefined)
      setSelectedEndDate(undefined)
      setTimelineKey(prev => prev + 1) // Сбрасываем состояние таймлайна
    }
  }

  // Успешное сохранение
  const handleSuccess = () => {
    setRecordModalOpen(false)
    setBookingMode(false)
    setServiceMode(false)
    setBuyoutMode(false)
    setSelectedStartDate(undefined)
    setSelectedEndDate(undefined)
    setTimelineKey(prev => prev + 1) // Сбрасываем состояние таймлайна
  }

  // Вспомогательная функция для получения данных клиента из записи
  const getClientDataFromRecord = async (record: CarRecord): Promise<ContractClientData> => {
    // Если есть clientId - загружаем полные данные из таблицы clients
    if (record.clientId) {
      const client = await getClient(record.clientId)
      if (client) {
        return clientToContractData(client)
      }
    }
    // Иначе используем данные из записи (только ФИО и телефон)
    return {
      fullName: record.renterName || '',
      phone: record.renterPhone || '',
      birthDate: '',
      passportSeries: '',
      passportNumber: '',
      passportIssuedBy: '',
      passportIssueDate: '',
      registrationAddress: '',
    }
  }

  // Функции генерации документов из истории записей
  const handleGenerateContractFromHistory = async (record: CarRecord) => {
    if (!car || !record.renterName) {
      alert('Нет данных клиента для генерации документа')
      return
    }
    
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    const docKey = `${record.id}-contract`
    setGeneratingDocs(prev => ({ ...prev, [docKey]: true }))
    
    try {
      // Загружаем данные клиента
      const clientData = await getClientDataFromRecord(record)
      
      // Вычисляем количество дней
      const days = record.startDate && record.endDate
        ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1
      
      await generateContractDocument({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carPrice: car.purchasePrice || 0,
        client: clientData,
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        dailyPrice: record.rentalAmount / days,
        totalAmount: record.rentalAmount,
        deposit: record.deposit || 0,
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
      })
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта')
    } finally {
      setGeneratingDocs(prev => ({ ...prev, [docKey]: false }))
    }
  }

  const handleGenerateFullContractFromHistory = async (record: CarRecord) => {
    if (!car || !record.renterName) {
      alert('Нет данных клиента для генерации документа')
      return
    }
    
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    const docKey = `${record.id}-full-contract`
    setGeneratingDocs(prev => ({ ...prev, [docKey]: true }))
    
    try {
      // Загружаем данные клиента
      const clientData = await getClientDataFromRecord(record)
      
      const days = record.startDate && record.endDate
        ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1
      
      await generateSimpleRentalContractDocument({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carStsSeries: '',
        carStsNumber: '',
        carStsDate: '',
        client: clientData,
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        contractCity: 'Волгодонск',
        startDate: record.startDate || record.recordDate,
        startTime: '17 час(ов) 00 минут',
        termDays: days,
        dailyPrice: record.rentalAmount / days,
        deposit: record.deposit || 0,
        deliveryAddress: '',
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
      })
    } catch (error) {
      console.error('Ошибка генерации договора:', error)
      alert('Ошибка при генерации договора')
    } finally {
      setGeneratingDocs(prev => ({ ...prev, [docKey]: false }))
    }
  }

  const handleGenerateServiceActFromHistory = async (record: CarRecord) => {
    if (!car || !record.renterName) {
      alert('Нет данных клиента для генерации документа')
      return
    }

    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }

    const docKey = `${record.id}-service-act`
    setGeneratingDocs(prev => ({ ...prev, [docKey]: true }))

    try {
      // Загружаем данные клиента
      const clientData = await getClientDataFromRecord(record)

      const days = record.startDate && record.endDate
        ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1

      await generateServiceActDocument({
        actNumber: generateContractNumber().replace('ККР-', 'А-'),
        actDate: record.recordDate,
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        executor: {
          fullName: companySettings.ownerFullName || '',
          phone: companySettings.ownerPhone || '',
        },
        customer: {
          fullName: clientData.fullName,
          phone: clientData.phone,
        },
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        dailyPrice: record.rentalAmount / days,
        totalAmount: record.rentalAmount,
        rentalDays: days,
        carName: car.name,
        carLicensePlate: car.licensePlate,
      })
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта')
    } finally {
      setGeneratingDocs(prev => ({ ...prev, [docKey]: false }))
    }
  }

  // HTML-версии (для просмотра на мобильных — открываются в новой вкладке)
  // Используем только данные из record (без API-запроса getClient), чтобы избежать
  // долгих таймаутов на мобильном соединении — данные паспорта для HTML-версии не критичны.
  const buildClientFromRecord = (record: CarRecord) => ({
    fullName: record.renterName || '',
    phone: record.renterPhone || '',
    birthDate: '',
    passportSeries: '',
    passportNumber: '',
    passportIssuedBy: '',
    passportIssueDate: '',
    registrationAddress: '',
    driverLicenseSeries: '',
    driverLicenseNumber: '',
  })

  const handleViewContractHTML = async (record: CarRecord) => {
    console.log('[handleViewContractHTML] clicked', { recordId: record.id, car: !!car })
    if (!car) {
      alert('Машина не загружена')
      return
    }
    if (!record.renterName) {
      alert('Нет данных арендатора')
      return
    }
    try {
      const clientData = buildClientFromRecord(record)
      const days = record.startDate && record.endDate
        ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1
      const html = await generateContractDocumentHTML({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carPrice: car.purchasePrice || 0,
        client: clientData,
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        dailyPrice: record.rentalAmount / days,
        totalAmount: record.rentalAmount,
        deposit: record.deposit || 0,
        owner: {
          fullName: companySettings?.ownerFullName || '',
          birthDate: companySettings?.ownerBirthDate || '',
          passportSeries: companySettings?.ownerPassportSeries || '',
          passportNumber: companySettings?.ownerPassportNumber || '',
          passportIssuedBy: companySettings?.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings?.ownerPassportIssueDate || '',
          registrationAddress: companySettings?.ownerRegistrationAddress || '',
          phone: companySettings?.ownerPhone || '',
        },
      })
      openHtmlDocument(html)
    } catch (error) {
      console.error('Ошибка генерации HTML:', error)
      alert('Ошибка при генерации документа: ' + (error as Error).message)
    }
  }

  const handleViewFullContractHTML = async (record: CarRecord) => {
    console.log('[handleViewFullContractHTML] clicked', { recordId: record.id, car: !!car })
    if (!car) {
      alert('Машина не загружена')
      return
    }
    if (!record.renterName) {
      alert('Нет данных арендатора')
      return
    }
    try {
      const clientData = buildClientFromRecord(record)
      const days = record.startDate && record.endDate
        ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 1
      const html = generateSimpleRentalContractDocumentHTML({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carPrice: car.purchasePrice || 0,
        client: clientData,
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        rentalDays: days,
        dailyPrice: record.rentalAmount / days,
        totalAmount: record.rentalAmount,
        deposit: record.deposit || 0,
        owner: {
          fullName: companySettings?.ownerFullName || '',
          birthDate: companySettings?.ownerBirthDate || '',
          passportSeries: companySettings?.ownerPassportSeries || '',
          passportNumber: companySettings?.ownerPassportNumber || '',
          passportIssuedBy: companySettings?.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings?.ownerPassportIssueDate || '',
          registrationAddress: companySettings?.ownerRegistrationAddress || '',
          phone: companySettings?.ownerPhone || '',
        },
      })
      openHtmlDocument(html)
    } catch (error) {
      console.error('Ошибка генерации HTML:', error)
      alert('Ошибка при генерации документа: ' + (error as Error).message)
    }
  }

  const handleViewServiceActHTML = async (record: CarRecord) => {
    console.log('[handleViewServiceActHTML] clicked', { recordId: record.id, car: !!car })
    if (!car) {
      alert('Машина не загружена')
      return
    }
    try {
      const html = generateServiceActDocumentHTML({
        actNumber: generateContractNumber().replace('ККР-', 'А-'),
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        carName: car.name,
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        rentalDays: (record.startDate && record.endDate)
          ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          : 1,
        dailyPrice: record.rentalAmount / ((record.startDate && record.endDate)
          ? Math.ceil((new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          : 1),
        totalAmount: record.rentalAmount,
        executor: { fullName: companySettings?.ownerFullName || '' },
        customer: { fullName: record.renterName || '' },
        totalAmountWords: '',
      })
      openHtmlDocument(html)
    } catch (error) {
      console.error('Ошибка генерации HTML:', error)
      alert('Ошибка при генерации документа: ' + (error as Error).message)
    }
  }

  if (isInitialLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader size="lg" />
        </div>
      </PageContainer>
    )
  }

  if (!car) {
    return (
      <PageContainer className="text-center py-12">
        <p className="text-muted-foreground mb-4">Машина не найдена</p>
        <Button onClick={handleBack} className="flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к списку</span>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      {/* Заголовок: ◀️ Камри | Сдана */}
      <header className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={handleBack}
          className="p-2 sm:p-3 hover:bg-accent rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-border flex-shrink-0"
            style={{ backgroundColor: car.colorTag }}
          />
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold font-head truncate">{car.name}</h1>
          <span className="text-muted-foreground hidden sm:inline">|</span>
          <StatusBadge status={car.status} />
        </div>
      </header>

      {/* Карточка авто + Календарь: два независимых sticky столбца на ПК */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        {/* === КАРТОЧКА АВТО === */}
        <div className="display-contents lg:display-block lg:sticky lg:top-20 lg:self-start lg:gap-6">
          <Card className="w-full overflow-hidden">
            {/* Фото машины - динамическая высота по размеру фото */}
            {car.photoUrl ? (
              <div className="relative w-full overflow-hidden">
                <img
                  src={car.photoUrl}
                  alt={car.name}
                  className="w-full h-auto"
                />
                {/* Цвет метки */}
                <span
                  className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: car.colorTag }}
                  title="Цвет метки"
                />
              </div>
            ) : (
              <div className="relative w-full h-48 sm:h-56 bg-muted flex items-center justify-center">
                <Car className="w-16 h-16 text-muted-foreground/30" />
                {/* Цвет метки */}
                <span
                  className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: car.colorTag }}
                  title="Цвет метки"
                />
              </div>
            )}

            {/* Информация: Марка слева, Госномер справа */}
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center gap-4">
                {/* Левая колонка - Марка/Модель */}
                <div className="flex-1 flex flex-col items-center text-center">
                  {car.brand && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Марка</p>
                      <p className="font-bold text-lg">{car.brand}</p>
                    </div>
                  )}
                  {car.model && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Модель</p>
                      <p className="font-medium">{car.model}</p>
                    </div>
                  )}
                  {!car.brand && !car.model && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Название</p>
                      <p className="font-bold text-lg">{car.name}</p>
                    </div>
                  )}
                </div>

                {/* Разделитель */}
                <div className="w-px h-28 bg-border" />

                {/* Правая колонка - Госномер/Год */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Госномер</p>
                    <p className="font-bold text-lg tracking-wider">{car.licensePlate}</p>
                  </div>
                  {car.year && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Год</p>
                      <p className="font-medium">{car.year}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Данные автомобиля для договора */}
              {(car.vin || car.color) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-center gap-6 text-sm">
                    {car.vin && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                        <p className="font-mono text-xs">{car.vin}</p>
                      </div>
                    )}
                    {car.color && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Цвет</p>
                        <p className="font-medium">{car.color}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Изменение статуса */}
              <div className="mt-4 pt-4 border-t-2 border-border">
                <p className="text-sm text-muted-foreground mb-2 text-center">Изменить статус:</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {(Object.keys(CAR_STATUS_LABELS) as CarStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={car.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                    >
                      {CAR_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Цена за сутки */}
              <div className="mt-4 pt-4 border-t-2 border-border">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="dailyPrice">Цена за сутки (₽)</Label>
                    <div className="relative mt-1">
                      <Input
                        id="dailyPrice"
                        type="number"
                        min="0"
                        step="100"
                        defaultValue={car.dailyPrice || 0}
                        onBlur={(e) => handleSaveDailyPrice(e.target.value)}
                        className={`${showPriceSaved ? 'pr-10' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                      {showPriceSaved && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('dailyPrice') as HTMLInputElement
                      if (input) handleSaveDailyPrice(input.value)
                    }}
                    disabled={updateCar.isPending}
                    className="h-10 px-3"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Дата покупки */}
              <div className="mt-4 pt-4 border-t-2 border-border">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="purchaseDate">Дата покупки</Label>
                    <div className="relative mt-1">
                      <Input
                        id="purchaseDate"
                        type="date"
                        defaultValue={car.purchaseDate || ''}
                        onBlur={(e) => handleSavePurchaseDate(e.target.value)}
                        className={showPurchaseDateSaved ? 'pr-10' : ''}
                      />
                      {showPurchaseDateSaved && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('purchaseDate') as HTMLInputElement
                      if (input) handleSavePurchaseDate(input.value)
                    }}
                    disabled={updateCar.isPending}
                    className="h-10 px-3"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Заработок за месяц */}
              <div className="mt-4 pt-4 border-t-2 border-border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Заработок за {MONTHS_RU[month - 1].toLowerCase()}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMoney(
                      (allRecords?.reduce((sum, r) => {
                        // Для платежей выкупа в доход идёт только доля прибыли (30%)
                        if (r.recordType === 'buyout_payment') {
                          // Supabase JSONB может вернуться как строка — парсим если строка
                          const rawBuyoutData = r.buyoutData as Record<string, unknown> | null
                          const buyoutDataStr = typeof rawBuyoutData === 'string' ? rawBuyoutData : null
                          const parsedBuyoutData = buyoutDataStr ? JSON.parse(buyoutDataStr) as Record<string, unknown> : rawBuyoutData
                          const profitPercent = Number(parsedBuyoutData?.profitPercent) || 30
                          return sum + calcBuyoutProfitShare(r.rentalAmount, profitPercent)
                        }
                        return sum + r.rentalAmount
                      }, 0) || 0) -
                      (allRecords?.reduce((sum, r) => {
                        // Исключаем записи первичной подготовки из расходов
                        const isPrepRecord = r.notes?.startsWith(PREPARATION_NOTES)
                        return sum + (isPrepRecord ? 0 : r.serviceCost + r.otherCost)
                      }, 0) || 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* === 2. АККОРДЕОН ДОБАВИТЬ РАСХОД === */}
        <Card className="w-full overflow-hidden order-4 lg:order-none">
            <button
              onClick={() => setExpenseExpanded(!expenseExpanded)}
              className="w-full p-4 md:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold">ДОБАВИТЬ РАСХОД</h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${expenseExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            
            {expenseExpanded && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
                {/* Кнопки категорий расходов - по центру на мобильных */}
                <div className="flex flex-wrap gap-2 mb-3 justify-center">
                  {categories
                    .filter(c => !(PREPARATION_CATEGORY_NAMES as readonly string[]).includes(c.name))
                    .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category)}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 text-sm border-2 transition-all
                        ${activeCategory?.id === category.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                      style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>

                {/* Форма ввода суммы и комментария */}
                {activeCategory && (
                  <div className="space-y-3 p-3 border border-border bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{activeCategory.icon}</span>
                      <span className="font-medium">{activeCategory.name}</span>
                      <button
                        onClick={handleCancelExpense}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Сумма (₽)"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <Input
                      type="text"
                      placeholder="Комментарий (необязательно)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full"
                    />

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleCancelExpense}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSaveExpense}
                        disabled={!amount || createRecord.isPending}
                      >
                        {createRecord.isPending ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

        {/* === АККОРДЕОН ПЕРВИЧНАЯ ПОДГОТОВКА === */}
        <Card className="w-full overflow-hidden order-5 lg:order-none">
            <button
              onClick={() => setPrepExpanded(!prepExpanded)}
              className="w-full p-4 md:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold">ПЕРВИЧНАЯ ПОДГОТОВКА</h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${prepExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            
            {prepExpanded && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
                {/* Существующие записи подготовки */}
                {preparationRecords && preparationRecords.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {preparationRecords.map((record) => {
                      const comment = record.notes?.replace(PREPARATION_NOTES, '').trim()
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-2 border border-border rounded bg-muted/30 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {new Date(record.recordDate).toLocaleDateString('ru-RU')}
                            </span>
                            <span className="text-sm truncate">
                              {record.expenseCategory?.name === 'Прочее'
                                ? (comment || 'Расход')
                                : `${record.expenseCategory?.name || 'Подготовка'}${comment ? ` — ${comment}` : ''}`
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="font-medium text-sm">
                              {formatMoney(record.otherCost)}
                            </span>
                            <div className="w-px h-3 bg-border" />
                            {deletePrepConfirmId === record.id ? (
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => {
                                    deletePrepRecord.mutate(record.id)
                                    setDeletePrepConfirmId(null)
                                  }}
                                  className="p-0.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  disabled={deletePrepRecord.isPending}
                                  title="Подтвердить"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setDeletePrepConfirmId(null)}
                                  className="p-0.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                                  title="Отмена"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletePrepConfirmId(record.id)}
                                className="p-0.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Удалить"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="border-t border-border pt-2 text-center">
                      <span className="text-sm text-muted-foreground">Итого: </span>
                      <span className="font-bold">{formatMoney(car.preparationCost)}</span>
                    </div>
                  </div>
                )}

                {/* Кнопки категорий подготовки */}
                <div className="flex flex-wrap gap-2 mb-3 justify-center">
                  <button
                    onClick={() => handlePrepCategoryClick('insurance')}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 text-sm border-2 transition-all
                      ${prepCategory === 'insurance'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span>🛡️</span>
                    <span>{PREPARATION_CATEGORY_NAMES[0]}</span>
                  </button>
                  <button
                    onClick={() => handlePrepCategoryClick('tires')}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 text-sm border-2 transition-all
                      ${prepCategory === 'tires'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span>🛞</span>
                    <span>{PREPARATION_CATEGORY_NAMES[1]}</span>
                  </button>
                  <button
                    onClick={() => handlePrepCategoryClick('other')}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 text-sm border-2 transition-all
                      ${prepCategory === 'other'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span>📦</span>
                    <span>{PREPARATION_CATEGORY_NAMES[2]}</span>
                  </button>
                </div>

                {/* Форма ввода */}
                {prepCategory && (
                  <div className="space-y-3 p-3 border border-border bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {prepCategory === 'insurance' ? PREPARATION_CATEGORY_NAMES[0]
                          : prepCategory === 'tires' ? PREPARATION_CATEGORY_NAMES[1]
                          : PREPARATION_CATEGORY_NAMES[2]}
                      </span>
                      <button
                        onClick={handleCancelPrepExpense}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Сумма (₽)"
                          value={prepAmount}
                          onChange={(e) => setPrepAmount(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {prepCategory === 'other' && (
                      <Input
                        type="text"
                        placeholder="Наименование расхода"
                        value={prepComment}
                        onChange={(e) => setPrepComment(e.target.value)}
                        className="w-full"
                      />
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleCancelPrepExpense}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSavePrepExpense}
                        disabled={!prepAmount || (prepCategory === 'other' && !prepComment) || createPrepRecord.isPending}
                      >
                        {createPrepRecord.isPending ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

        {/* === 4. АККОРДЕОН ИСТОРИЯ ЗАПИСЕЙ === */}
        <Card className="w-full overflow-hidden order-6 lg:order-none">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="w-full p-4 md:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold">ИСТОРИЯ ЗАПИСЕЙ</h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${historyExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            
            {historyExpanded && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 pt-0">
                {records && records.filter(r => r.rentalAmount > 0).length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {records.filter(r => r.rentalAmount > 0).slice(0, 20).map((record) => {
                      // Форматирование периода аренды: 23.03 - 25.03.26г. (2 дн.)
                      const formatPeriod = () => {
                        if (record.startDate && record.endDate) {
                          const start = new Date(record.startDate)
                          const end = new Date(record.endDate)
                          const pad = (n: number) => String(n).padStart(2, '0')
                          const startStr = `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`
                          const endStr = `${pad(end.getDate())}.${pad(end.getMonth() + 1)}.${String(end.getFullYear()).slice(-2)}`
                          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                          return `${startStr} - ${endStr}г. (${days} дн.)`
                        }
                        const date = new Date(record.recordDate)
                        const pad = (n: number) => String(n).padStart(2, '0')
                        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(-2)}г.`
                      }
                      
                      // Разбиваем ФИО: Фамилия Имя в первую строку, Отчество во вторую (для мобильных)
                      const fullName = record.renterName || 'Клиент не указан'
                      const nameParts = fullName.split(' ').filter(Boolean)
                      const firstLine = nameParts.slice(0, 2).join(' ') // Фамилия Имя
                      const secondLine = nameParts.slice(2).join(' ')   // Отчество (если есть)
                      
                      return (
                        <div
                          key={record.id}
                          className="border border-border rounded-lg p-3"
                        >
                          {/* === ПК ВЕРСИЯ === */}
                          <div className="hidden sm:block">
                            {/* Верхняя строка: ФИО с суммой справа */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {record.renterName || 'Клиент не указан'}
                                </p>
                              </div>
                              {/* Сумма и корзина */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <p className="font-bold text-green-600">
                                  +{formatMoney(record.rentalAmount)}
                                </p>
                                <div className="w-px h-4 bg-border" />
                                {/* Кнопка удаления */}
                                {deleteBookingConfirmId === record.id ? (
                                  <div className="flex gap-0.5">
                                    <button
                                      onClick={() => {
                                        deleteBookingRecord.mutate(record.id)
                                        setDeleteBookingConfirmId(null)
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                      disabled={deleteBookingRecord.isPending}
                                      title="Подтвердить"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteBookingConfirmId(null)}
                                      className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                                      title="Отмена"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteBookingConfirmId(record.id)}
                                    className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Телефон и залог в одну строку */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              {record.renterPhone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{record.renterPhone}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(record.renterPhone || '')
                                      setCopiedPhoneId(record.id)
                                      setTimeout(() => setCopiedPhoneId(null), 2000)
                                    }}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    title="Копировать телефон"
                                  >
                                    {copiedPhoneId === record.id ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {record.deposit > 0 && (
                                <div className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  <span className="text-xs">Залог:</span>
                                  <span>{formatMoney(record.deposit)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* === МОБИЛЬНАЯ ВЕРСИЯ === */}
                          <div className="sm:hidden">
                            {/* ФИО - отцентрировано */}
                            <div className="text-center mb-2">
                              <p className="font-medium leading-tight">{firstLine}</p>
                              {secondLine && (
                                <p className="font-medium leading-tight">{secondLine}</p>
                              )}
                            </div>
                            
                            {/* Разделитель после ФИО */}
                            <div className="border-t border-border mb-2" />
                            
                            {/* Телефон и залог - отцентрировано, друг под другом */}
                            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground mb-2">
                              {record.renterPhone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{record.renterPhone}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(record.renterPhone || '')
                                      setCopiedPhoneId(record.id)
                                      setTimeout(() => setCopiedPhoneId(null), 2000)
                                    }}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    title="Копировать телефон"
                                  >
                                    {copiedPhoneId === record.id ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              {record.deposit > 0 && (
                                <div className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  <span className="text-xs">Залог:</span>
                                  <span>{formatMoney(record.deposit)}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Сумма с корзиной - отцентрировано */}
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <p className="font-bold text-green-600">
                                +{formatMoney(record.rentalAmount)}
                              </p>
                              <div className="w-px h-4 bg-border" />
                              {/* Кнопка удаления */}
                              {deleteBookingConfirmId === record.id ? (
                                <div className="flex gap-0.5">
                                  <button
                                    onClick={() => {
                                      deleteBookingRecord.mutate(record.id)
                                      setDeleteBookingConfirmId(null)
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    disabled={deleteBookingRecord.isPending}
                                    title="Подтвердить"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteBookingConfirmId(null)}
                                    className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                                    title="Отмена"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteBookingConfirmId(record.id)}
                                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Третья строка: Период аренды - отцентрировано на мобильных */}
                          <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mb-2">
                            <Clock className="w-3 h-3" />
                            <span>{formatPeriod()}</span>
                          </div>
                          
                          {/* Кнопки документов - отцентрированы на мобильных */}
                          {record.renterName && (
                            <div className="flex flex-col items-stretch gap-1.5 mt-2 pt-2 border-t border-border w-full">
                              {/* Договор аренды */}
                              <div className="flex items-center gap-2 w-full">
                                <button
                                  onClick={() => handleGenerateFullContractFromHistory(record)}
                                  disabled={generatingDocs[`${record.id}-full-contract`]}
                                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 truncate"
                                  title="Скачать договор аренды (.docx)"
                                >
                                  <Download className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{generatingDocs[`${record.id}-full-contract`] ? 'Генерация...' : 'Договор аренды'}</span>
                                </button>
                                <button
                                  onClick={() => handleViewFullContractHTML(record)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600/70 hover:bg-blue-50 rounded transition-colors shrink-0"
                                  title="Открыть договор аренды для просмотра в браузере"
                                >
                                  <Eye className="w-3 h-3" />
                                  Открыть
                                </button>
                              </div>
                              {/* Акт приёма-передачи */}
                              <div className="flex items-center gap-2 w-full">
                                <button
                                  onClick={() => handleGenerateContractFromHistory(record)}
                                  disabled={generatingDocs[`${record.id}-contract`]}
                                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 truncate"
                                  title="Скачать акт приёма-передачи (.docx)"
                                >
                                  <Download className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{generatingDocs[`${record.id}-contract`] ? 'Генерация...' : 'Акт приёма-передачи'}</span>
                                </button>
                                <button
                                  onClick={() => handleViewContractHTML(record)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-green-600/70 hover:bg-green-50 rounded transition-colors shrink-0"
                                  title="Открыть акт приёма-передачи для просмотра в браузере"
                                >
                                  <Eye className="w-3 h-3" />
                                  Открыть
                                </button>
                              </div>
                              {/* Акт выполненных работ */}
                              <div className="flex items-center gap-2 w-full">
                                <button
                                  onClick={() => handleGenerateServiceActFromHistory(record)}
                                  disabled={generatingDocs[`${record.id}-service-act`]}
                                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 truncate"
                                  title="Скачать акт выполненных работ (.docx)"
                                >
                                  <Download className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{generatingDocs[`${record.id}-service-act`] ? 'Генерация...' : 'Акт выполненных работ'}</span>
                                </button>
                                <button
                                  onClick={() => handleViewServiceActHTML(record)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600/70 hover:bg-purple-50 rounded transition-colors shrink-0"
                                  title="Открыть акт выполненных работ для просмотра в браузере"
                                >
                                  <Eye className="w-3 h-3" />
                                  Открыть
                                </button>
                              </div>
                            </div>
                          )}
                         </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Нет записей
                  </p>
                )}
              </div>
            )}
          </Card>

        {/* === 5. АККОРДЕОН ИСТОРИЯ РАСХОДОВ === */}
        <Card className="w-full overflow-hidden order-7 lg:order-none">
            <button
              onClick={() => setExpenseHistoryExpanded(!expenseHistoryExpanded)}
              className="w-full p-4 md:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold">ИСТОРИЯ РАСХОДОВ</h2>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${expenseHistoryExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            
            {expenseHistoryExpanded && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 pt-0">
                {/* Табы */}
                <div className="flex gap-1 mb-4 border-b border-border">
                  <button
                    onClick={() => setExpenseTab('operational')}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      expenseTab === 'operational'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Операционные
                  </button>
                  <button
                    onClick={() => setExpenseTab('preparation')}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      expenseTab === 'preparation'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Подготовка
                  </button>
                </div>

                {expenseTab === 'operational' ? (
                  /* Операционные расходы */
                  (() => {
                    const operationalRecords = expenseRecords?.filter(
                      r => !r.notes?.startsWith(PREPARATION_NOTES)
                    ) || []
                    return operationalRecords.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {Object.entries(
                          operationalRecords.reduce((acc, record) => {
                            const categoryKey = record.expenseCategory?.id || 'uncategorized'
                            const categoryName = record.expenseCategory?.name || 'Без категории'
                            const categoryColor = record.expenseCategory?.color || '#6B7280'
                            const categoryIcon = record.expenseCategory?.icon || null
                            
                            if (!acc[categoryKey]) {
                              acc[categoryKey] = {
                                name: categoryName,
                                color: categoryColor,
                                icon: categoryIcon,
                                records: [],
                                total: 0,
                              }
                            }
                            acc[categoryKey].records.push(record)
                            acc[categoryKey].total += record.serviceCost + record.otherCost
                            return acc
                          }, {} as Record<string, { name: string; color: string; icon: string | null; records: typeof operationalRecords; total: number }>)
                        ).map(([categoryId, group]) => (
                          <div key={categoryId} className="border border-border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-3 bg-muted/50"
                              style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
                            >
                              <div className="flex items-center gap-2">
                                {group.icon && <span>{group.icon}</span>}
                                <span className="font-medium">{group.name}</span>
                                <span className="text-xs text-muted-foreground">({group.records.length})</span>
                              </div>
                              <span className="font-bold">
                                {formatMoney(group.total)}
                              </span>
                            </div>
                            <div className="divide-y divide-border">
                              {group.records.map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(record.recordDate).toLocaleDateString('ru-RU')}
                                    </p>
                                    {record.notes && (
                                      <p className="text-xs text-muted-foreground truncate mt-1">{record.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="font-medium text-xs sm:text-sm">
                                      {formatMoney(record.serviceCost + record.otherCost)}
                                    </span>
                                    <div className="w-px h-3 sm:h-4 bg-border" />
                                    {deleteConfirmId === record.id ? (
                                      <div className="flex gap-0.5 sm:gap-1">
                                        <button
                                          onClick={() => {
                                            deleteExpenseRecord.mutate(record.id)
                                            setDeleteConfirmId(null)
                                          }}
                                          className="p-0.5 sm:p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                          disabled={deleteExpenseRecord.isPending}
                                          title="Подтвердить"
                                        >
                                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(null)}
                                          className="p-0.5 sm:p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                                          title="Отмена"
                                        >
                                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirmId(record.id)}
                                        className="p-0.5 sm:p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Удалить"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Нет операционных расходов
                      </p>
                    )
                  })()
                ) : (
                  /* Расходы подготовки */
                  (() => {
                    const prepRecords = expenseRecords?.filter(
                      r => r.notes?.startsWith(PREPARATION_NOTES)
                    ) || []
                    return prepRecords.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {prepRecords.map((record) => {
                          const comment = record.notes?.replace(PREPARATION_NOTES, '').trim()
                          return (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 border border-border rounded-lg gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(record.recordDate).toLocaleDateString('ru-RU')}
                                </p>
                                <p className="text-sm font-medium">
                                  {record.expenseCategory?.name || 'Подготовка'}
                                  {comment && ` — ${comment}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="font-medium text-xs sm:text-sm">
                                  {formatMoney(record.otherCost)}
                                </span>
                                <div className="w-px h-3 sm:h-4 bg-border" />
                                {deletePrepConfirmId === record.id ? (
                                  <div className="flex gap-0.5 sm:gap-1">
                                    <button
                                      onClick={() => {
                                        deletePrepRecord.mutate(record.id)
                                        setDeletePrepConfirmId(null)
                                      }}
                                      className="p-0.5 sm:p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                      disabled={deletePrepRecord.isPending}
                                      title="Подтвердить"
                                    >
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletePrepConfirmId(null)}
                                      className="p-0.5 sm:p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
                                      title="Отмена"
                                    >
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeletePrepConfirmId(record.id)}
                                    className="p-0.5 sm:p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Нет расходов на подготовку
                      </p>
                    )
                  })()
                )}
              </div>
            )}
          </Card>
        </div>

        {/* === ПРАВАЯ КОЛОНКА: КАЛЕНДАРЬ === */}
        <div className="w-full order-2 lg:col-start-2 lg:sticky lg:top-20 lg:self-start">
          <Card className="w-full p-4 md:p-6">
            {/* Заголовок и переключатель месяца - по центру на мобильных */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold">БРОНИРОВАНИЕ</h2>
              </div>
              {/* Разделитель после БРОНИРОВАНИЕ */}
              <div className="w-full h-px bg-border" />
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 sm:p-3 hover:bg-accent rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Предыдущий месяц"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <span className="font-semibold min-w-[140px] text-center text-sm sm:text-base">
                  {MONTHS_RU[month - 1]} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-2 sm:p-3 hover:bg-accent rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Следующий месяц"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
              {/* Разделитель после переключателя */}
              <div className="w-full h-px bg-border" />
            </div>

            {isTimelineLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size="md" />
              </div>
            ) : timeline ? (
              <MonthTimeline
                key={timelineKey}
                year={year}
                month={month}
                timeline={timeline}
                selectionMode={true}
                bookedDates={bookedDates}
                onDayClick={handleDayClick}
                onSelectionChange={handleSelectionChange}
                onRangeSelect={handleRangeSelect}
              />
            ) : null}

            {/* Три кнопки: Добавить бронь, Выкуп и Запись на ТО */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                className="flex items-center justify-center gap-2 flex-1"
                onClick={handleOpenBooking}
              >
                <Plus className="w-4 h-4" />
                <span>Добавить бронь</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 flex-1 border-amber-500 text-amber-700 hover:bg-amber-50"
                onClick={handleOpenBuyout}
              >
                <span>🚗</span>
                <span>Выкуп</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 flex-1"
                onClick={handleOpenService}
              >
                <Wrench className="w-4 h-4" />
                <span>Запись на ТО</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={actionSelectModalOpen} onOpenChange={handleActionSelectClose}>
        <Dialog.Content className="max-w-sm">
          <Dialog.Header className="text-center justify-center">
            Выберите действие
          </Dialog.Header>
          <div className="p-6 space-y-3">
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={handleSelectBooking}
            >
              <Plus className="w-4 h-4" />
              <span>Добавить бронь</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleSelectService}
            >
              <Wrench className="w-4 h-4" />
              <span>Добавить ТО</span>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog>

      {/* Модальное окно добавления записи */}
      <RecordModal
        open={recordModalOpen}
        onOpenChange={handleModalClose}
        carId={id}
        car={car}
        bookingMode={bookingMode}
        buyoutMode={buyoutMode}
        serviceMode={serviceMode}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        onSuccess={handleSuccess}
      />
    </PageContainer>
  )
}
