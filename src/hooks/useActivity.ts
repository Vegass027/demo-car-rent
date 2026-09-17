// ============================================================
// HOOKS: ЛЕНТА СОБЫТИЙ (ЖУРНАЛ)
// React Query хуки для работы с событиями активности
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { 
  getActivityByDateRange, 
  getDatesWithEvents,
  groupEventsByDay,
  calculatePeriodSummary 
} from '@/api/activity'
import { useAppStore } from '@/store/useAppStore'
import type { ActivityDayGroup, ActivityPeriodSummary } from '@/types'

// Ключи для кэша
export const activityKeys = {
  all: ['activity'] as const,
  byRange: (startDate: string, endDate: string) => 
    [...activityKeys.all, 'range', startDate, endDate] as const,
  datesWithEvents: (year: number, month: number) =>
    [...activityKeys.all, 'dates', year, month] as const,
}

// Получить события за период
export function useActivityByRange(
  startDate: string | null,
  endDate: string | null
) {
  const isReady = useAppStore((state) => state.isReady)

  const { data, isLoading, error } = useQuery({
    queryKey: activityKeys.byRange(startDate || '', endDate || ''),
    queryFn: () => getActivityByDateRange(startDate!, endDate!),
    enabled: !!startDate && !!endDate && isReady,
    staleTime: 1000 * 60 * 2, // 2 минуты
  })

  // Группируем события по дням
  const dayGroups: ActivityDayGroup[] = data ? groupEventsByDay(data) : []
  
  // Считаем итоги за период
  const summary: ActivityPeriodSummary = data ? calculatePeriodSummary(data) : {
    totalRental: 0,
    totalExpense: 0,
    totalProfit: 0,
    eventsCount: 0,
    rentalsCount: 0,
    expensesCount: 0,
    bookingsCount: 0,
  }

  return {
    events: data || [],
    dayGroups,
    summary,
    isLoading,
    error,
  }
}

// Получить даты с событиями для календаря
export function useDatesWithEvents(year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: activityKeys.datesWithEvents(year, month),
    queryFn: () => getDatesWithEvents(year, month),
    enabled: isReady,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}
