// ============================================================
// FEATURE: MONTH TIMELINE
// Визуализация занятости машины по дням месяца
// С поддержкой выбора диапазона дат для бронирования
// ============================================================

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { TIMELINE_DAY_CONFIG } from '@/constants'
import type { TimelineDay, DayType } from '@/types'

interface MonthTimelineProps {
  year: number
  month: number
  timeline: TimelineDay[]
  onDayClick?: (day: TimelineDay) => void
  onRangeSelect?: (startDate: string, endDate: string) => void
  onSelectionChange?: (startDate: string | null, endDate: string | null) => void // Новый callback для любого изменения выбора
  showLegend?: boolean
  showStats?: boolean
  compact?: boolean
  selectionMode?: boolean // Режим выбора диапазона
  bookedDates?: Set<string> // Даты, которые заняты (нельзя выбрать)
}

// Состояние выбора диапазона
interface SelectionState {
  startDate: string | null
  endDate: string | null
}

export function MonthTimeline({
  year,
  month,
  timeline,
  onDayClick,
  onRangeSelect,
  onSelectionChange,
  showLegend = true,
  showStats = true,
  compact = false,
  selectionMode = false,
  bookedDates = new Set(),
}: MonthTimelineProps) {
  const [selection, setSelection] = useState<SelectionState>({
    startDate: null,
    endDate: null,
  })

  // Флаг для отслеживания, был ли уже вызван callback для текущего диапазона
  const lastNotifiedRange = useRef<string | null>(null)

  // День недели первого числа месяца в формате Пн=0 ... Вс=6
  const firstDayWeekday = useMemo(() => {
    const d = new Date(year, month - 1, 1).getDay()
    return d === 0 ? 6 : d - 1
  }, [year, month])

  // Разбиваем на недели с пустыми ячейками в начале, чтобы 1-е число попадало под свой день недели
  const weeks: (TimelineDay | null)[][] = useMemo(() => {
    const result: (TimelineDay | null)[][] = []
    let week: (TimelineDay | null)[] = Array(firstDayWeekday).fill(null)
    for (const day of timeline) {
      week.push(day)
      if (week.length === 7) {
        result.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      result.push(week)
    }
    return result
  }, [timeline, firstDayWeekday])

  // Считаем статистику (без расходов)
  const stats = useMemo(() => {
    const rented = timeline.filter(d => d.type === 'rented').length
    const idle = timeline.filter(d => d.type === 'idle').length
    const empty = timeline.filter(d => d.type === 'empty').length
    const totalRental = timeline.reduce((sum, d) => sum + d.rentalAmount, 0)
    const totalExpense = timeline.reduce((sum, d) => sum + d.expenseAmount, 0)
    return { rented, idle, empty, totalRental, totalExpense }
  }, [timeline])

  const occupancyPercent = timeline.length > 0
    ? Math.round((stats.rented / timeline.length) * 100)
    : 0

  // Проверка, находится ли дата в выбранном диапазоне
  const isDateInRange = useCallback((date: string) => {
    if (!selection.startDate || !selection.endDate) return false
    const d = new Date(date)
    const start = new Date(selection.startDate)
    const end = new Date(selection.endDate)
    return d >= start && d <= end
  }, [selection])

  // Проверка, является ли дата краем диапазона
  const isDateEdge = useCallback((date: string) => {
    return date === selection.startDate || date === selection.endDate
  }, [selection.startDate, selection.endDate])

  // Обработка клика по дате
  const handleDayClick = useCallback((day: TimelineDay) => {
    // Если не в режиме выбора — просто клик
    if (!selectionMode) {
      onDayClick?.(day)
      return
    }

    // Если дата занята — блокируем
    if (bookedDates.has(day.date)) {
      return
    }

    // В режиме выбора НЕ вызываем onDayClick -
    // это приводит к перезаписи дат в родительском компоненте.
    // Для получения выбранного диапазона используйте onRangeSelect.

    setSelection(prev => {
      // Нет выбора — устанавливаем начало
      if (!prev.startDate) {
        return { startDate: day.date, endDate: null }
      }

      // Есть начало, нет конца
      if (!prev.endDate) {
        // Клик на ту же дату — снимаем выбор
        if (day.date === prev.startDate) {
          return { startDate: null, endDate: null }
        }
        // Клик на другую дату — устанавливаем конец (с автосортировкой)
        const start = new Date(prev.startDate)
        const end = new Date(day.date)
        if (start <= end) {
          return { startDate: prev.startDate, endDate: day.date }
        } else {
          return { startDate: day.date, endDate: prev.startDate }
        }
      }

      // Есть полный диапазон
      // Клик на начало — снимаем начало, конец становится началом
      if (day.date === prev.startDate) {
        return { startDate: prev.endDate, endDate: null }
      }
      // Клик на конец — снимаем конец
      if (day.date === prev.endDate) {
        return { startDate: prev.startDate, endDate: null }
      }
      // Клик внутри диапазона или вне — начинаем новый выбор
      return { startDate: day.date, endDate: null }
    })
  }, [selectionMode, bookedDates, onDayClick])

  // Автоматически вызываем callback при выборе диапазона (только один раз для каждого нового диапазона)
  useEffect(() => {
    // Всегда сообщаем об изменении выбора (включая один клик)
    if (onSelectionChange) {
      onSelectionChange(selection.startDate, selection.endDate)
    }
    
    // Если выбран полный диапазон - вызываем onRangeSelect
    if (selection.startDate && selection.endDate && onRangeSelect) {
      const rangeKey = `${selection.startDate}-${selection.endDate}`
      // Вызываем callback только если это новый диапазон
      if (lastNotifiedRange.current !== rangeKey) {
        lastNotifiedRange.current = rangeKey
        onRangeSelect(selection.startDate, selection.endDate)
      }
    } else {
      // Сбрасываем флаг при очистке выбора
      lastNotifiedRange.current = null
    }
  }, [selection.startDate, selection.endDate, onRangeSelect, onSelectionChange])

  // Компактная версия для мобильных
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {timeline.map((day, index) => (
            <DayCell
              key={day.date}
              day={day}
              index={index}
              onClick={handleDayClick}
              compact
              selectionMode={selectionMode}
              isInRange={isDateInRange(day.date)}
              isEdge={isDateEdge(day.date)}
              isBooked={bookedDates.has(day.date)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Статистика занятости - по центру */}
      {showStats && (
        <div className="text-center text-sm font-semibold">
          Занятость: {occupancyPercent}% ({stats.rented} из {timeline.length} дней)
        </div>
      )}

      {/* Сетка дней */}
      <div className="space-y-1">
        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => (
            <div key={i} className="font-medium">{d}</div>
          ))}
        </div>

        {/* Недели */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) =>
              day ? (
                <DayCell
                  key={day.date}
                  day={day}
                  index={weekIndex * 7 + dayIndex}
                  onClick={handleDayClick}
                  selectionMode={selectionMode}
                  isInRange={isDateInRange(day.date)}
                  isEdge={isDateEdge(day.date)}
                  isBooked={bookedDates.has(day.date)}
                />
              ) : (
                <div key={`empty-${weekIndex}-${dayIndex}`} className="aspect-square" />
              )
            )}
          </div>
        ))}
      </div>

      {/* Легенда (без расходов) */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 text-sm">
          {(['rented', 'idle', 'empty'] as DayType[]).map(type => (
            <div key={type} className="flex items-center gap-2">
              <span className={`
                w-4 h-4 border border-border
                ${TIMELINE_DAY_CONFIG[type].bgClass}
              `} />
              <span className="text-muted-foreground">
                {TIMELINE_DAY_CONFIG[type].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Получить сегодняшнюю дату в локальном формате (без UTC-сдвига)
function getTodayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Ячейка дня
interface DayCellProps {
  day: TimelineDay
  index: number
  onClick?: (day: TimelineDay) => void
  compact?: boolean
  selectionMode?: boolean
  isInRange?: boolean
  isEdge?: boolean
  isBooked?: boolean
}

function DayCell({
  day,
  index,
  onClick,
  compact,
  selectionMode,
  isInRange,
  isEdge,
  isBooked
}: DayCellProps) {
  // Реальное число месяца из самой даты, а не позиция в массиве —
  // иначе при пустых плейсхолдерах в начале сетки числа сдвигаются
  const dayNum = new Date(day.date).getDate()
  void index
  const todayStr = getTodayLocal()
  const isToday = day.date === todayStr

  // В режиме выбора не показываем расходы на календаре
  const displayType = selectionMode && day.type === 'expense' ? 'empty' : day.type
  const config = TIMELINE_DAY_CONFIG[displayType]

  const handleClick = () => {
    onClick?.(day)
  }

  // Базовые классы
  let bgClass = config.bgClass
  let textClass = config.textClass
  let borderClass = 'border-border'

  // Если в режиме выбора
  if (selectionMode) {
    // Занятая дата — зелёная как "Сдана", не кликабельна
    if (isBooked) {
      borderClass = 'border-green-500'
      bgClass = 'bg-green-200'
      textClass = 'text-green-800'
    }
    // Край диапазона
    else if (isEdge) {
      bgClass = 'bg-primary'
      textClass = 'text-primary-foreground'
      borderClass = 'border-primary'
    }
    // Внутри диапазона
    else if (isInRange) {
      bgClass = 'bg-primary/30'
      borderClass = 'border-primary/50'
    }
  }

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`
          w-4 h-4 border text-[8px] flex items-center justify-center
          ${bgClass} ${textClass} ${borderClass}
          ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
          ${isBooked && selectionMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        `}
        title={`${dayNum}: ${isBooked && selectionMode ? 'Занято' : config.label}`}
      >
        {dayNum}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`
        aspect-square border-2 flex flex-col items-center justify-center
        transition-all
        ${bgClass} ${textClass} ${borderClass}
        ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isBooked && selectionMode ? 'cursor-not-allowed hover:scale-100' : 'cursor-pointer hover:scale-105'}
      `}
      title={`${dayNum} ${day.date}${isBooked && selectionMode ? ' - Занято' : ''}`}
    >
      <span className="text-xs font-medium">{dayNum}</span>
      {day.rentalAmount > 0 && !selectionMode && (
        <span className="text-[8px] opacity-75">
          {day.rentalAmount >= 1000
            ? `${Math.round(day.rentalAmount / 1000)}к`
            : day.rentalAmount
          }
        </span>
      )}
    </div>
  )
}


// Мини-таймлайн для карточки
interface MiniTimelineProps {
  timeline: TimelineDay[]
  days?: number
}

export function MiniTimeline({ timeline, days = 14 }: MiniTimelineProps) {
  const recentDays = timeline.slice(-days)

  return (
    <div className="flex gap-0.5">
      {recentDays.map((day) => {
        const config = TIMELINE_DAY_CONFIG[day.type]
        return (
          <div
            key={day.date}
            className={`
              w-2 h-6 border
              ${config.bgClass}
              ${day.type === 'empty' ? 'border-transparent' : 'border-border'}
            `}
            title={`${day.date}: ${config.label}`}
          />
        )
      })}
    </div>
  )
}
