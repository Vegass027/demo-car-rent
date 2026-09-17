// ============================================================
// COMPONENT: AddCarModal
// Модальное окно для добавления новой машины
// ============================================================

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog } from '@/components/retroui/Dialog'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { createCarWithPreparation, uploadCarPhoto } from '@/api/cars'
import { carsKeys } from '@/hooks/useCars'
import { CAR_COLOR_TAGS } from '@/constants'
import type { CarFormData } from '@/types'

interface AddCarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddCarModal({ open, onOpenChange, onSuccess }: AddCarModalProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CarFormData>({
    defaultValues: {
      name: '',
      licensePlate: '',
      brand: '',
      model: '',
      year: undefined,
      vin: '',
      color: '',
      colorTag: '#EAB308',
      purchasePrice: 0,
      insurance: 0,
      tires: 0,
      otherExpenses: [],
    },
  })

  const selectedColor = watch('colorTag')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Проверка размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Фото слишком большое. Максимум 5MB.')
        return
      }
      
      // Проверка типа
      if (!file.type.startsWith('image/')) {
        alert('Выберите изображение')
        return
      }

      setPhotoFile(file)
      
      // Предпросмотр
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
    setIsSubmitting(true)
    try {
      // Создаём машину с первичными расходами на подготовку
      const newCar = await createCarWithPreparation(data)
      
      // Если есть фото - загружаем и обновляем
      if (photoFile) {
        try {
          const photoUrl = await uploadCarPhoto(photoFile, newCar.id)
          // Обновляем машину с URL фото
          const { supabase } = await import('@/lib/supabase')
          await supabase
            .from('cars')
            .update({ photo_url: photoUrl })
            .eq('id', newCar.id)
        } catch (photoError) {
          // Фото не загрузилось, но машина создана — показываем предупреждение
          toast.warning('Машина создана, но фото не загрузилось')
          console.error('Ошибка загрузки фото:', photoError)
          reset()
          setPhotoPreview(null)
          setPhotoFile(null)
          onSuccess?.()
          return
        }
      }
      
      toast.success('Машина успешно создана')
      // Инвалидируем кэш чтобы новые данные загрузились
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      reset()
      setPhotoPreview(null)
      setPhotoFile(null)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      
      // Проверяем тип ошибки для понятного сообщения
      if (message.includes('license_plate')) {
        toast.error('Машина с таким госномером уже существует')
      } else {
        toast.error(`Ошибка создания: ${message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setPhotoPreview(null)
    setPhotoFile(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Dialog.Content className="max-w-md max-h-[90vh] overflow-y-auto" preventClose>
        <Dialog.Header>
          + НОВАЯ МАШИНА
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

          {/* Цена покупки */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Цена покупки
            </label>
            <Input
              {...register('purchasePrice', { valueAsNumber: true })}
              type="number"
            />
          </div>

          {/* Расходы на подготовку: Страховка и Шины */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Страховка
              </label>
              <Input
                {...register('insurance', { valueAsNumber: true })}
                type="number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Шины
              </label>
              <Input
                {...register('tires', { valueAsNumber: true })}
                type="number"
              />
            </div>
          </div>

          {/* Прочие расходы на подготовку */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Прочее
            </label>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const current = watch('otherExpenses') || []
                setValue('otherExpenses', [...current, { comment: '', amount: 0 }])
              }}
              className="w-full"
            >
              + Добавить позицию
            </Button>
            
            {(watch('otherExpenses') || []).map((_, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  {...register(`otherExpenses.${index}.comment`, {
                    required: 'Укажите наименование'
                  })}
                  placeholder="Наименование (например: Покупка фары)"
                  className="flex-1 min-w-[200px]"
                />
                <Input
                  {...register(`otherExpenses.${index}.amount`, {
                    required: 'Укажите сумму',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Сумма должна быть положительной' }
                  })}
                  type="number"
                  placeholder="Сумма"
                  className="w-28"
                />
                <button
                  type="button"
                  onClick={() => {
                    const current = watch('otherExpenses') || []
                    setValue('otherExpenses', current.filter((_, i) => i !== index))
                  }}
                  className="text-red-500 hover:text-red-600 px-2 text-lg"
                >
                  ✕
                </button>
              </div>
            ))}
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
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog>
  )
}
