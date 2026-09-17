// ============================================================
// COMPONENT: EditCarModal
// Модальное окно для редактирования данных машины
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Dialog } from '@/components/retroui/Dialog'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { useUpdateCar, useDeleteCar, carsKeys } from '@/hooks/useCars'
import { uploadCarPhoto, getCarPreparationRecords, updateCarPreparationRecords } from '@/api/cars'
import { CAR_COLOR_TAGS } from '@/constants'
import type { Car, CarFormData } from '@/types'

interface EditCarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  car: Car
  onSuccess?: () => void
}

export function EditCarModal({ open, onOpenChange, car, onSuccess }: EditCarModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const updateCar = useUpdateCar()
  const deleteCarMutation = useDeleteCar()
  const [photoPreview, setPhotoPreview] = useState<string | null>(car.photoUrl)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isLoadingPrep, setIsLoadingPrep] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [otherExpenses, setOtherExpenses] = useState<Array<{ comment: string; amount: number }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CarFormData>({
    defaultValues: {
      name: car.name,
      licensePlate: car.licensePlate,
      brand: car.brand || '',
      model: car.model || '',
      year: car.year || undefined,
      vin: car.vin || '',
      color: car.color || '',
      colorTag: car.colorTag,
      purchasePrice: car.purchasePrice,
      insurance: 0,
      tires: 0,
      otherExpenses: [],
    },
  })

  // Загрузка записей подготовки при открытии модалки
  useEffect(() => {
    if (open && car) {
      setIsLoadingPrep(true)
      getCarPreparationRecords(car.id)
        .then(({ insurance, tires, otherExpenses: prepOtherExpenses }) => {
          console.log('Загружены записи подготовки:', { insurance, tires, otherExpenses: prepOtherExpenses })
          reset({
            name: car.name,
            licensePlate: car.licensePlate,
            brand: car.brand || '',
            model: car.model || '',
            year: car.year || undefined,
            vin: car.vin || '',
            color: car.color || '',
            colorTag: car.colorTag,
            purchasePrice: car.purchasePrice,
            insurance,
            tires,
            otherExpenses: prepOtherExpenses,
          })
          setOtherExpenses(prepOtherExpenses)
        })
        .catch((error) => {
          console.error('Ошибка загрузки записей подготовки:', error)
          // Если ошибка - сбрасываем форму с нулями
          reset({
            name: car.name,
            licensePlate: car.licensePlate,
            brand: car.brand || '',
            model: car.model || '',
            year: car.year || undefined,
            vin: car.vin || '',
            color: car.color || '',
            colorTag: car.colorTag,
            purchasePrice: car.purchasePrice,
            insurance: 0,
            tires: 0,
            otherExpenses: [],
          })
          setOtherExpenses([])
        })
        .finally(() => {
          setIsLoadingPrep(false)
        })
      
      setPhotoPreview(car.photoUrl)
      setPhotoFile(null)
    }
  }, [open, car, reset])

  const selectedColor = watch('colorTag')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Фото слишком большое. Максимум 5MB.')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Выберите изображение')
        return
      }

      setPhotoFile(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    setPhotoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: CarFormData) => {
    try {
      // Формируем name из brand + model
      const carName = `${data.brand} ${data.model}`.trim()

      // Обновляем данные машины
      await updateCar.mutateAsync({
        id: car.id,
        data: {
          name: carName,
          licensePlate: data.licensePlate,
          brand: data.brand || null,
          model: data.model || null,
          year: data.year || null,
          vin: data.vin || null,
          color: data.color || null,
          colorTag: data.colorTag,
          purchasePrice: data.purchasePrice,
        }
      })

      // Обновляем записи подготовки (страховка, шины и прочее)
      const insurance = data.insurance ?? 0
      const tires = data.tires ?? 0
      await updateCarPreparationRecords(car.id, insurance, tires, otherExpenses)
      
      // Если есть новое фото - загружаем
      if (photoFile) {
        try {
          const photoUrl = await uploadCarPhoto(photoFile, car.id)
          const { supabase } = await import('@/lib/supabase')
          await supabase
            .from('cars')
            .update({ photo_url: photoUrl })
            .eq('id', car.id)
        } catch (photoError) {
          toast.warning('Данные обновлены, но фото не загрузилось')
          console.error('Ошибка загрузки фото:', photoError)
          onSuccess?.()
          return
        }
      }
      
      toast.success('Данные машины обновлены')
      // Инвалидируем все связанные кэши
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      setPhotoFile(null)
      onSuccess?.()
      onOpenChange(false) // Закрываем модалку при успехе
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      toast.error(`Ошибка обновления: ${message}`)
    }
  }

  const handleClose = () => {
    setPhotoFile(null)
    setPhotoPreview(car.photoUrl)
    onOpenChange(false)
  }

  const handleDelete = () => {
    deleteCarMutation.mutate(car.id, {
      onSuccess: () => {
        toast.success('Машина удалена')
        onOpenChange(false)
        navigate('/cars')
      },
      onError: (error) => {
        toast.error(`Ошибка удаления: ${error.message}`)
        setShowDeleteConfirm(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-1rem)]" preventClose>
        <Dialog.Header>
          РЕДАКТИРОВАНИЕ МАШИНЫ
        </Dialog.Header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          {/* Фото машины */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Фото машины
            </label>
            
            {photoPreview ? (
              <div className="relative w-full rounded-lg border-2 border-border overflow-hidden">
                <img
                  src={photoPreview}
                  alt="Предпросмотр"
                  className="w-full h-auto"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground text-sm">Нажмите для выбора фото</span>
                <span className="text-xs text-muted-foreground mt-1">JPG, PNG до 5MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Марка и Модель - основные поля */}
          <div className="grid grid-cols-2 gap-3">
            {/* Марка */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Марка *
              </label>
              <Input
                {...register('brand', { required: 'Введите марку' })}
              />
              {errors.brand && (
                <p className="text-sm text-destructive mt-1">
                  {errors.brand.message}
                </p>
              )}
            </div>
            
            {/* Модель */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Модель *
              </label>
              <Input
                {...register('model', { required: 'Введите модель' })}
              />
              {errors.model && (
                <p className="text-sm text-destructive mt-1">
                  {errors.model.message}
                </p>
              )}
            </div>
          </div>

          {/* Госномер */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Госномер *
            </label>
            <Input
              {...register('licensePlate', { required: 'Введите госномер' })}
              className="uppercase"
            />
            {errors.licensePlate && (
              <p className="text-sm text-destructive mt-1">
                {errors.licensePlate.message}
              </p>
            )}
          </div>

          {/* Цвет метки */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Цвет метки
            </label>
            <div className="flex gap-2">
              {CAR_COLOR_TAGS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setValue('colorTag', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Дополнительные данные автомобиля */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">
              Данные для договора
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Год выпуска */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Год выпуска
                </label>
                <Input
                  {...register('year', { valueAsNumber: true })}
                  type="number"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                />
              </div>
              
              {/* Цвет авто */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Цвет авто
                </label>
                <Input
                  {...register('color')}
                />
              </div>
            </div>
            
            {/* VIN номер */}
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                VIN номер
              </label>
              <Input
                {...register('vin')}
                className="uppercase"
              />
            </div>
            
            {/* Цена покупки */}
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">
                Цена покупки
              </label>
              <Input
                {...register('purchasePrice', { valueAsNumber: true })}
                type="number"
              />
            </div>

            {/* Расходы на подготовку: Страховка и Шины */}
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-2">
                Расходы на подготовку
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Страховка */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Страховка
                  </label>
                  <Input
                    {...register('insurance', { valueAsNumber: true })}
                    type="number"
                    disabled={isLoadingPrep}
                    placeholder="0"
                  />
                </div>
                
                {/* Шины */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Шины
                  </label>
                  <Input
                    {...register('tires', { valueAsNumber: true })}
                    type="number"
                    disabled={isLoadingPrep}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Прочие расходы на подготовку */}
              <div className="mt-3 space-y-3">
                <label className="text-sm text-muted-foreground">
                  Прочее
                </label>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newExpenses = [...otherExpenses, { comment: '', amount: 0 }]
                    setOtherExpenses(newExpenses)
                    setValue('otherExpenses', newExpenses)
                  }}
                  className="w-full"
                  disabled={isLoadingPrep}
                >
                  + Добавить позицию
                </Button>
                
                {otherExpenses.map((expense, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Наименование (например: Покупка фары)"
                      className="flex-1 min-w-[200px]"
                      disabled={isLoadingPrep}
                      value={expense.comment}
                      onChange={(e) => {
                        const newExpenses = [...otherExpenses]
                        newExpenses[index].comment = e.target.value
                        setOtherExpenses(newExpenses)
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Сумма"
                      className="w-28"
                      disabled={isLoadingPrep}
                      value={expense.amount || ''}
                      onChange={(e) => {
                        const newExpenses = [...otherExpenses]
                        newExpenses[index].amount = Number(e.target.value) || 0
                        setOtherExpenses(newExpenses)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newExpenses = otherExpenses.filter((_, i) => i !== index)
                        setOtherExpenses(newExpenses)
                        setValue('otherExpenses', newExpenses)
                      }}
                      className="text-red-500 hover:text-red-600 px-2 text-lg"
                      disabled={isLoadingPrep}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || updateCar.isPending || isLoadingPrep}
              className="flex-1"
            >
              {isSubmitting || updateCar.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>

          {/* Кнопка удаления */}
          <div className="border-t border-border pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить машину
            </Button>
          </div>
        </form>

        {/* Модалка подтверждения удаления */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <Dialog.Content className="max-w-sm">
            <Dialog.Header className="text-center">
              Удаление машины
            </Dialog.Header>
            <p className="text-center text-muted-foreground px-4 py-2">
              Удалить «{car.name}» из списка?
            </p>
            <p className="text-center text-xs text-muted-foreground px-4 pb-2">
              История аренд и расходов сохранится в финансовой отчётности.
            </p>
            <div className="flex gap-2 p-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={deleteCarMutation.isPending}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
                disabled={deleteCarMutation.isPending}
              >
                {deleteCarMutation.isPending ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog>
      </Dialog.Content>
    </Dialog>
  )
}
