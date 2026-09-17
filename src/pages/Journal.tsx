// ============================================================
// PAGE: JOURNAL (ЖУРНАЛ СОБЫТИЙ)
// Лента активности с календарём выбора даты/диапазона
// Только просмотр — без добавления записей
// ============================================================

import { useState, useMemo, useCallback } from 'react'
import { format, isSameDay, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  CalendarIcon,
  DollarSign,
  Wrench,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  X,
  Car,
} from 'lucide-react'
import { Card } from '@/components/retroui/Card'
import { Button } from '@/components/retroui/Button'
import { Calendar } from '@/components/retroui/Calendar'
import { Loader } from '@/components/retroui/Loader'
import { PageContainer } from '@/components/features/AppLayout'
import { useActivityByRange, useDatesWithEvents } from '@/hooks/useActivity'
import { formatMoney } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { ActivityEvent, ActivityEventType } from '@/types'

// ============================================================
// ТИПЫ
// ============================================================

interface DateSelection {
  startDate: Date | null
  endDate: Date | null
}

// ============================================================
// КОНСТАНТЫ
// ============================================================

const EVENT_TYPE_CONFIG: Record<ActivityEventType, {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  rental: {
    icon: <DollarSign className="w-4 h-4" />,
    label: 'Аренда',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-l-green-500',
  },
  expense: {
    icon: <Wrench className="w-4 h-4" />,
    label: 'Расход',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-500',
  },
  booking: {
    icon: <CalendarDays className="w-4 h-4" />,
    label: 'Бронирование',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
  },
  booking_end: {
    icon: <CalendarDays className="w-4 h-4" />,
    label: 'Завершение аренды',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-l-gray-500',
  },
  deposit_taken: {
    icon: <DollarSign className="w-4 h-4" />,
    label: 'Залог получен',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
  },
  deposit_returned: {
    icon: <DollarSign className="w-4 h-4" />,
    label: 'Залог возвращён',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-l-gray-500',
  },
  buyout_payment: {
    icon: <Car className="w-4 h-4" />,
    label: 'Выкуп',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
  },
}

// ============================================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================================

export function Journal() {
  const today = new Date()
  
  // Состояние выбора диапазона дат
  const [dateSelection, setDateSelection] = useState<DateSelection>({
    startDate: today,
    endDate: today,
  })
  
  // Месяц, отображаемый в календаре
  const [calendarMonth, setCalendarMonth] = useState<Date>(today)
  
  // Вычисляем диапазон дат для запроса
  const dateRange = useMemo(() => {
    const { startDate, endDate } = dateSelection
    
    if (!startDate) {
      // Если ничего не выбрано — показываем сегодня
      const todayStr = format(today, 'yyyy-MM-dd')
      return { start: todayStr, end: todayStr }
    }
    
    if (!endDate) {
      // Выбрана только начальная дата
      const startStr = format(startDate, 'yyyy-MM-dd')
      return { start: startStr, end: startStr }
    }
    
    // Выбран диапазон
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')
    
    // Если start > end, меняем местами
    if (startDate > endDate) {
      return { start: endStr, end: startStr }
    }
    
    return { start: startStr, end: endStr }
  }, [dateSelection, today])
  
  // Загружаем события
  const { dayGroups, summary, isLoading } = useActivityByRange(dateRange.start, dateRange.end)
  
  // Загружаем даты с событиями для текущего месяца календаря
  const { data: datesWithEvents } = useDatesWithEvents(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1
  )
  
  // Сброс выбора
  const handleClearSelection = useCallback(() => {
    setDateSelection({ startDate: null, endDate: null })
  }, [])
  
  // Быстрые кнопки
  const handleToday = useCallback(() => {
    const today = new Date()
    setDateSelection({ startDate: today, endDate: today })
    setCalendarMonth(today)
  }, [])
  
  const handleThisWeek = useCallback(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const start = new Date(today)
    start.setDate(start.getDate() - diff)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    setDateSelection({ startDate: start, endDate: end })
    setCalendarMonth(today)
  }, [])
  
  const handleThisMonth = useCallback(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setDateSelection({ startDate: start, endDate: end })
    setCalendarMonth(today)
  }, [])
  
  // Определяем режим просмотра для подсветки кнопок
  const viewMode = useMemo(() => {
    const { startDate, endDate } = dateSelection
    if (!startDate || !endDate) return 'day'
    
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')
    
    // Сегодня
    if (startStr === todayStr && endStr === todayStr) return 'day'
    
    // Эта неделя
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - diff)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    if (isSameDay(startDate, weekStart) && isSameDay(endDate, weekEnd)) return 'week'
    
    // Этот месяц
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    if (isSameDay(startDate, monthStart) && isSameDay(endDate, monthEnd)) return 'month'
    
    return 'range'
  }, [dateSelection])
  
  // Форматирование заголовка периода - краткий формат: 3.03 - 5.03.26
  const periodLabel = useMemo(() => {
    const { startDate, endDate } = dateSelection
    
    if (!startDate) {
      return format(today, "d.MM.yy", { locale: ru })
    }
    
    if (!endDate) {
      return format(startDate, "d.MM.yy", { locale: ru })
    }
    
    const daysDiff = differenceInDays(
      startDate > endDate ? endDate : startDate,
      startDate > endDate ? startDate : endDate
    )
    
    if (daysDiff === 0) {
      return format(startDate, "d.MM.yy", { locale: ru })
    }
    
    const start = startDate < endDate ? startDate : endDate
    const end = startDate < endDate ? endDate : startDate
    
    // Краткий формат: 3.03 - 5.03.26
    return `${format(start, "d.MM", { locale: ru })} - ${format(end, "d.MM.yy", { locale: ru })}`
  }, [dateSelection, today])
  
  // Количество выбранных дней
  const selectedDaysCount = useMemo(() => {
    const { startDate, endDate } = dateSelection
    if (!startDate) return 0
    if (!endDate) return 1
    return differenceInDays(
      startDate > endDate ? startDate : endDate,
      startDate < endDate ? startDate : endDate
    ) + 1
  }, [dateSelection])
  
  return (
    <PageContainer>
      {/* Основной layout: на мобильных календарь первый, на ПК лента слева, календарь справа */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ПРАВАЯ КОЛОНКА (на мобильных ПЕРВАЯ): Календарь и итоги */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-4 order-first lg:order-last">
          {/* Быстрые кнопки */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={handleToday}
              className="flex-1"
            >
              Сегодня
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={handleThisWeek}
              className="flex-1"
            >
              Неделя
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={handleThisMonth}
              className="flex-1"
            >
              Месяц
            </Button>
          </div>
          
          {/* Календарь и итоги в одной карточке */}
          {/* lg:block w-full - на ПК карточка блочная с полной шириной aside */}
          <Card className="p-3 w-full lg:block flex flex-col items-center">
            {/* Контейнер для календаря и итогов */}
            <div className="flex flex-col items-center w-full">
              <div className="w-full lg:w-auto [&_.rdp]:w-full lg:[&_.rdp]:w-auto [&_.rdp]:mx-auto">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateSelection.startDate ?? undefined,
                    to: dateSelection.endDate ?? undefined,
                  }}
                  onSelect={(range) => {
                    if (range) {
                      setDateSelection({
                        startDate: range.from ?? null,
                        endDate: range.to ?? null,
                      })
                    }
                  }
                  }
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  locale={ru}
                  numberOfMonths={1}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("ru-RU", { month: "long" }).replace(/^./, m => m.toUpperCase()),
                  }}
                  classNames={{
                    caption_label: "select-none font-bold text-base",
                  }}
                  modifiers={{
                    hasEvents: datesWithEvents
                      ? Array.from(datesWithEvents).map(d => new Date(d + 'T12:00:00'))
                      : [],
                  }}
                  modifiersStyles={{
                    hasEvents: {
                      fontWeight: 'bold',
                    },
                  }}
                />
              </div>
            
            {/* Итоги за период */}
            {!isLoading && summary.eventsCount > 0 && (
              <div className="w-full mt-4 pt-4 border-t">
              <h3 className="font-medium text-sm text-muted-foreground mb-3">
                Итоги за период
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Доход
                  </span>
                  <span className="font-bold text-green-600">
                    {formatMoney(summary.totalRental)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    Расход
                  </span>
                  <span className="font-bold text-red-600">
                    {formatMoney(summary.totalExpense)}
                  </span>
                </div>
                
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">Прибыль</span>
                  <span className={cn(
                    "font-bold",
                    summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatMoney(summary.totalProfit)}
                  </span>
                </div>
              </div>
              
              <div className="pt-3 mt-3 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Аренд:</span>
                  <span className="font-medium">{summary.rentalsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Расходов:</span>
                  <span className="font-medium">{summary.expensesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Бронирований:</span>
                  <span className="font-medium">{summary.bookingsCount}</span>
                </div>
              </div>
              </div>
            )}
            </div>
          </Card>
        </aside>
        
        {/* ЛЕВАЯ КОЛОНКА (на мобильных ВТОРАЯ): Лента событий */}
        <div className="flex-1 min-w-0">
          {/* Заголовок периода */}
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
              <h2 className="font-medium text-sm sm:text-base capitalize">
                {periodLabel}
              </h2>
              {selectedDaysCount > 1 && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  ({selectedDaysCount} {getDaysWord(selectedDaysCount)})
                </span>
              )}
            </div>
            
            {/* Кнопка сброса выбора */}
            {(dateSelection.startDate || dateSelection.endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>
          
          {/* Лента */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader size="lg" />
            </div>
          ) : dayGroups.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {dayGroups.map(group => (
                <DayGroup key={group.date} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

// ============================================================
// КОМПОНЕНТ: ПУСТОЕ СОСТОЯНИЕ
// ============================================================

function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
      <p className="text-muted-foreground mb-2">Нет событий за выбранный период</p>
      <p className="text-sm text-muted-foreground">
        Выберите другую дату или добавьте записи через карточку машины
      </p>
    </Card>
  )
}

// ============================================================
// КОМПОНЕНТ: ГРУППА ЗА ДЕНЬ (в стиле ИСТОРИЯ РАСХОДОВ)
// ============================================================

interface DayGroupProps {
  group: {
    date: string
    dateLabel: string
    events: ActivityEvent[]
    totalRental: number
    totalExpense: number
    totalProfit: number
  }
}

function DayGroup({ group }: DayGroupProps) {
  // Группируем события по машине
  const carGroups = group.events.reduce((acc, event) => {
    const carId = event.carId
    if (!acc[carId]) {
      acc[carId] = {
        carId: carId,
        carName: event.carName,
        carColorTag: event.carColorTag,
        licensePlate: event.licensePlate,
        events: [],
        totalRental: 0,
        totalExpense: 0,
      }
    }
    acc[carId].events.push(event)
    acc[carId].totalRental += event.rentalAmount || 0
    // Расходы БЕЗ категорий подготовки (страховка, шины)
    if (!event.isPreparationCategory) {
      acc[carId].totalExpense += event.expenseAmount || 0
    }
    return acc
  }, {} as Record<string, {
    carId: string
    carName: string
    carColorTag: string
    licensePlate: string
    events: ActivityEvent[]
    totalRental: number
    totalExpense: number
  }>)
  
  const carList = Object.values(carGroups)
  
  // Проверяем: есть и доход и расход
  const hasBoth = group.totalRental > 0 && group.totalExpense > 0
  
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      {/* Заголовок дня */}
      {hasBoth ? (
        // На мобильных: дата сверху, суммы под ней. На ПК: в одну линию
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-3">
          <p className="font-bold text-sm sm:text-base capitalize">
            {group.dateLabel}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatMoney(group.totalRental)}
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span className="font-medium text-red-600 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              {formatMoney(group.totalExpense)}
            </span>
          </div>
        </div>
      ) : (
        // Если только что-то одно - в одну линию везде
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-bold text-sm sm:text-base capitalize">
            {group.dateLabel}
          </p>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm">
              {group.totalRental > 0 && (
                <span className="font-medium text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {formatMoney(group.totalRental)}
                </span>
              )}
              {group.totalExpense > 0 && (
                <span className="font-medium text-red-600 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {formatMoney(group.totalExpense)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Детализация по машинам */}
      {carList.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="space-y-4">
            {carList.map((car) => (
              <CarEventGroup key={car.carId} car={car} />
            ))}
          </div>
          
          {/* Итого за день */}
          <div className="flex items-center justify-between text-sm font-semibold mt-3 pt-2 border-t border-border/50">
            <span>Прибыль за день:</span>
            <span className={group.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatMoney(Math.abs(group.totalProfit))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// КОМПОНЕНТ: ГРУППА СОБЫТИЙ ПО МАШИНЕ
// ============================================================

interface CarEventGroupProps {
  car: {
    carId: string
    carName: string
    carColorTag: string
    licensePlate: string
    events: ActivityEvent[]
    totalRental: number
    totalExpense: number
  }
}

function CarEventGroup({ car }: CarEventGroupProps) {
  // Группируем события по типу
  const eventsByType = car.events.reduce((acc, event) => {
    const type = event.type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(event)
    return acc
  }, {} as Record<ActivityEventType, ActivityEvent[]>)
  
  // Порядок отображения типов: доходы сначала, потом расходы
  const typeOrder: ActivityEventType[] = ['rental', 'buyout_payment', 'booking', 'deposit_taken', 'expense', 'deposit_returned', 'booking_end']
  const sortedTypes = typeOrder.filter(type => eventsByType[type])
  
  // Прибыль по машине
  const profit = car.totalRental - car.totalExpense
  
  return (
    <div className="space-y-2">
      {/* Машина и прибыль - зелёная полоса */}
      <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-green-50">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: car.carColorTag }}
          />
          <span className="font-semibold">{car.carName}</span>
        </div>
        <span className={cn("font-bold", profit >= 0 ? "text-green-600" : "text-foreground")}>
          {formatMoney(Math.abs(profit))}
        </span>
      </div>
      
      {/* Группы по типам */}
      <div className="ml-5 space-y-2">
        {sortedTypes.map(type => (
          <EventTypeGroup
            key={type}
            type={type}
            events={eventsByType[type]}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// КОМПОНЕНТ: ГРУППА СОБЫТИЙ ПО ТИПУ
// ============================================================

interface EventTypeGroupProps {
  type: ActivityEventType
  events: ActivityEvent[]
}

function EventTypeGroup({ type, events }: EventTypeGroupProps) {
  const config = EVENT_TYPE_CONFIG[type]
  
  // Определяем тип: доход или расход
  const isIncome = type === 'rental' || type === 'booking' || type === 'deposit_taken' || type === 'buyout_payment'
  
  // Сумма по категории
  const totalAmount = events.reduce((sum, e) => {
    if (e.rentalAmount) sum += e.rentalAmount
    if (e.expenseAmount) sum += e.expenseAmount
    return sum
  }, 0)
  
  return (
    <div className="space-y-1">
      {/* Заголовок категории с суммой - серая полоса */}
      <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/50">
        <span className="text-muted-foreground">
          {config.label}
        </span>
        <span className="font-bold text-muted-foreground">
          {formatMoney(totalAmount)}
        </span>
      </div>
      
      {/* Список событий */}
      <div className="ml-2 space-y-0.5">
        {events.map(event => (
          <EventRow key={event.id} event={event} isIncome={isIncome} />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// КОМПОНЕНТ: СТРОКА СОБЫТИЯ
// ============================================================

interface EventRowProps {
  event: ActivityEvent
  isIncome: boolean
}

function EventRow({ event }: EventRowProps) {
  const time = format(new Date(event.timestamp), 'HH:mm')
  
  // Сумма события
  const amount = event.rentalAmount || event.expenseAmount || event.depositAmount || 0
  
  // Форматирование дат бронирования: 2.03 - 5.03.26
  const bookingDates = event.type === 'booking' && event.startDate && event.endDate
    ? `${format(new Date(event.startDate + 'T12:00:00'), 'd.MM', { locale: ru })} - ${format(new Date(event.endDate + 'T12:00:00'), 'd.MM.yy', { locale: ru })}`
    : null
  
  return (
    <div className="text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Время */}
          <span className="text-muted-foreground/60 tabular-nums w-10 flex-shrink-0">
            {time}
          </span>
          
          {/* Дополнительная информация */}
          <span className="truncate">
            {/* Клиент */}
            {event.clientName && (
              <span>{event.clientName}</span>
            )}
            
            {/* Категория и комментарий в одну строку */}
            {event.type === 'expense' && (event.expenseCategoryName || event.notes) && (
              <span className="flex items-center gap-1">
                {event.expenseCategoryName && (
                  <>
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: event.expenseCategoryColor || '#6B7280' }}
                    />
                    {event.expenseCategoryName}
                  </>
                )}
                {event.notes && (
                  <span className="italic">— {event.notes}</span>
                )}
              </span>
            )}
          </span>
        </div>
        
        {/* Сумма */}
        <span className="flex-shrink-0 ml-2 tabular-nums text-muted-foreground">
          {formatMoney(amount)}
        </span>
      </div>
      
      {/* Даты бронирования под ФИО */}
      {bookingDates && (
        <div className="ml-12 mt-0.5 text-xs text-muted-foreground/80">
          {bookingDates}
        </div>
      )}
    </div>
  )
}

// ============================================================
// УТИЛИТЫ
// ============================================================

function getDaysWord(count: number): string {
  const lastTwo = count % 100
  const lastOne = count % 10
  
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (lastOne === 1) return 'день'
  if (lastOne >= 2 && lastOne <= 4) return 'дня'
  return 'дней'
}
