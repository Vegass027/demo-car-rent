// ============================================================
// FEATURE: CAR CARD
// Карточка машины для дашборда и списка машин
// С блоком окупаемости справа
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Car, Pencil } from 'lucide-react'
import { Button } from '@/components/retroui/Button'
import { Progress } from '@/components/retroui/Progress'
import { Badge } from '@/components/retroui/Badge'
import { StatusBadge, StatusDot } from '@/components/ui/StatusBadge'
import { EditCarModal } from '@/components/features/EditCarModal'
import { formatMoney } from '@/utils/format'
import type { CarWithStats } from '@/types'

interface CarCardProps {
  car: CarWithStats
  compact?: boolean
}

export function CarCard({ car, compact = false }: CarCardProps) {
  const navigate = useNavigate()
  const [editModalOpen, setEditModalOpen] = useState(false)

  const handleClick = () => {
    navigate(`/cars/${car.id}`)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Предотвращаем переход на страницу машины
    setEditModalOpen(true)
  }

  // Компактная версия для мобильных
  if (compact) {
    return (
      <div 
        onClick={handleClick}
        className="bg-card border-2 border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status={car.status} />
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: car.colorTag }}
            />
            <span className="font-medium truncate">{car.name}</span>
          </div>
          {car.monthProfit !== undefined && (
            <span className="text-sm font-medium text-primary">
              {formatMoney(car.monthProfit)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border-2 border-border overflow-hidden self-start h-fit">
      {/* Верхняя часть - всегда открыта */}
      <div
        onClick={handleClick}
        className="cursor-pointer"
      >
        {/* Фото машины или плейсхолдер */}
        {car.photoUrl ? (
          <div className="relative w-full overflow-hidden">
            <img
              src={car.photoUrl}
              alt={car.name}
              className="w-full h-auto"
            />
            <span
              className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: car.colorTag }}
              title="Цвет метки"
            />
          </div>
        ) : (
          <div className="relative h-32 bg-muted flex items-center justify-center">
            <Car className="w-12 h-12 text-muted-foreground/50" />
            <span
              className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: car.colorTag }}
              title="Цвет метки"
            />
          </div>
        )}

        {/* Контент с блоком окупаемости справа */}
        <div className="p-4">
          <div className="flex gap-3 sm:gap-4 items-start min-w-0">
            {/* Левая часть - основная информация */}
            <div className="flex flex-col items-center min-w-0 flex-1">
              {/* Верхняя секция: статус, название, госномер */}
              <div className="flex flex-col items-center min-w-0 w-full">
                {/* Строка 1: Статус авто */}
                <div className="mb-2">
                  <StatusBadge status={car.status} size="sm" />
                </div>

                {/* Строка 2: Название машины */}
                <h3 className="text-lg font-bold mb-1 truncate min-h-[28px]">{car.name}</h3>

                {/* Строка 3: Гос. номер - на одной линии с прогресс баром */}
                <p className="text-sm text-muted-foreground h-5 flex items-center">
                  {car.licensePlate}
                </p>
              </div>

              {/* Разделитель между госномером и доходом */}
              <div className="w-full h-px bg-border my-2" />

              {/* Нижняя секция: статистика за месяц и ТО */}
              <div className="flex flex-col items-center">
                {/* Статистика за месяц */}
                {car.monthProfit !== undefined && (
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {formatMoney(car.monthProfit)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1"> за месяц</span>
                    </div>
                  </div>
                )}

                {/* Информация о ТО */}
                {car.daysToService !== null && car.daysToService !== undefined && (
                  <div className={`
                    text-xs px-2 py-1 border mt-2
                    ${car.daysToService <= 7
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : car.daysToService <= 14
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : 'bg-gray-50 text-gray-600 border-gray-300'
                    }
                  `}>
                    {car.daysToService <= 0
                      ? 'ТО просрочено!'
                      : `ТО через ${car.daysToService} дн.`
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Разделитель */}
            <div className="hidden md:block w-px bg-border" />

            {/* Правая часть - блок окупаемости (вертикально) */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              {/* Строка 1: Бейдж "Окупаемость" - на одной линии со статусом */}
              <div className="mb-2">
                <Badge
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5 font-medium border-2 bg-green-50 text-green-700 border-green-500"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Окупаемость
                </Badge>
              </div>
              
              {/* Строка 2: Сумма инвестиций - на одной линии с маркой авто */}
              <span className="text-lg font-bold mb-1">
                {car.totalInvestment !== undefined
                  ? formatMoney(car.totalInvestment)
                  : '—'
                }
              </span>
              
              {/* Строка 3: Прогресс бар с процентом и суммой окупленного */}
              <div className="relative w-full mb-3">
                <Progress
                  value={car.roiPercent ?? 0}
                  className="h-4"
                />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-medium gap-1 px-1">
                  <span className="shrink-0">{car.roiPercent !== undefined ? `${car.roiPercent}%` : '—'}</span>
                  {car.netProfit !== undefined && car.netProfit > 0 && (
                    <span className="text-green-600 truncate min-w-0">| {formatMoney(car.netProfit)}</span>
                  )}
                </div>
              </div>

              {/* Строка 4: Бейдж с ценой за сутки - на одной линии с доходом за месяц */}
              {car.dailyPrice !== undefined && car.dailyPrice > 0 && (
                <Badge
                  variant="outline"
                  size="sm"
                  className="text-xs border-border max-w-full"
                >
                  <span className="truncate">{formatMoney(car.dailyPrice)}/сутки</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка редактирования - на всю ширину карточки */}
      <div className="border-t border-border p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditClick}
          className="w-full flex items-center justify-center gap-1 text-xs"
        >
          <Pencil className="w-3 h-3" />
          <span>Редактировать</span>
        </Button>
      </div>

      {/* Модальное окно редактирования */}
      <EditCarModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        car={car}
      />
    </div>
  )
}

// Карточка "Добавить машину"
interface AddCarCardProps {
  onClick?: () => void
}

export function AddCarCard({ onClick }: AddCarCardProps) {
  return (
    <div
      className="border-2 border-dashed border-border bg-card flex flex-col items-center justify-center h-[380px] self-start"
    >
      <Button
        onClick={onClick}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        <span>Добавить машину</span>
      </Button>
    </div>
  )
}
