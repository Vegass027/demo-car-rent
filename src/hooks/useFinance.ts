// ============================================================
// HOOKS: ФИНАНСЫ
// React Query хуки для работы с финансами
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getCashFlow, 
  getMonthlyStats, 
  getCarMonthlyStats,
  getYearlyStats,
  getMonthSummary,
  getSalaryWithdrawals,
  createSalaryWithdrawal,
  deleteSalaryWithdrawal,
  getMonthlyProfit,
  getAllTimeCarStats,
  getCarStatsByPeriod,
} from '@/api/finance'
import { getExpenseCategories } from '@/api/categories'
import { useAppStore } from '@/store/useAppStore'
import type { SalaryFormData } from '@/types'

// Ключи для кэша
export const financeKeys = {
  all: ['finance'] as const,
  cashFlow: () => [...financeKeys.all, 'cashFlow'] as const,
  monthlyStats: (year: number, month: number) => 
    [...financeKeys.all, 'monthly', year, month] as const,
  carStats: (carId: string) => [...financeKeys.all, 'car', carId] as const,
  yearlyStats: (year: number) => [...financeKeys.all, 'yearly', year] as const,
  monthSummary: (year: number, month: number) => 
    [...financeKeys.all, 'summary', year, month] as const,
  monthlyProfit: (year: number, month: number, carId?: string | null) => 
    [...financeKeys.all, 'profit', year, month, carId ?? 'all'] as const,
  salary: (limit?: number) => [...financeKeys.all, 'salary', limit] as const,
  categories: () => [...financeKeys.all, 'categories'] as const,
  allTimeStats: () => [...financeKeys.all, 'allTime'] as const,
  periodStats: (start: string, end: string) => 
    [...financeKeys.all, 'period', start, end] as const,
}

// Получить данные кассы
export function useCashFlow() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.cashFlow(),
    queryFn: getCashFlow,
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить статистику за месяц
export function useMonthlyStats(year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.monthlyStats(year, month),
    queryFn: () => getMonthlyStats(year, month),
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить статистику по машине
export function useCarMonthlyStats(carId: string) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.carStats(carId),
    queryFn: () => getCarMonthlyStats(carId),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить статистику за год
export function useYearlyStats(year: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.yearlyStats(year),
    queryFn: () => getYearlyStats(year),
    enabled: isReady,
    staleTime: 1000 * 60 * 10,
  })
}

// Получить сводку за месяц
export function useMonthSummary(year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.monthSummary(year, month),
    queryFn: () => getMonthSummary(year, month),
    enabled: isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Получить выводы зарплаты
export function useSalaryWithdrawals(limit?: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.salary(limit),
    queryFn: () => getSalaryWithdrawals(limit),
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить категории расходов
export function useExpenseCategories() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.categories(),
    queryFn: getExpenseCategories,
    enabled: isReady,
    staleTime: Infinity, // Категории редко меняются
  })
}

// Создать вывод зарплаты
export function useCreateSalaryWithdrawal() {
  const queryClient = useQueryClient()


  return useMutation({
    mutationFn: ({ data, userId, carName }: { data: SalaryFormData; userId?: string; carName?: string }) => 
      createSalaryWithdrawal(data, userId, carName),
    onSuccess: () => {
      // Инвалидируем кассу и выводы зарплаты
      queryClient.invalidateQueries({ queryKey: financeKeys.cashFlow() })
      queryClient.invalidateQueries({ queryKey: financeKeys.salary() })
    },
  })
}

// Удалить вывод зарплаты
export function useDeleteSalaryWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSalaryWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.cashFlow() })
      queryClient.invalidateQueries({ queryKey: financeKeys.salary() })
    },
  })
}

// Получить прибыль за месяц (для расчёта выплат)
// carId - необязательный параметр для фильтрации по машине
export function useMonthlyProfit(year: number, month: number, carId?: string | null) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.monthlyProfit(year, month, carId),
    queryFn: () => getMonthlyProfit(year, month, carId),
    enabled: isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// --- ANALYTICS: Сравнение машин ---

// Получить статистику по всем машинам за всё время
export function useAllTimeCarStats() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.allTimeStats(),
    queryFn: getAllTimeCarStats,
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить статистику по машинам за произвольный период
export function useCarStatsByPeriod(startDate: string, endDate: string) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: financeKeys.periodStats(startDate, endDate),
    queryFn: () => getCarStatsByPeriod(startDate, endDate),
    enabled: isReady && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  })
}
