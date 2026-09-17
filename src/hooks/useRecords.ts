// ============================================================
// HOOKS: ЗАПИСИ АРЕНДЫ И РАСХОДОВ
// React Query хуки для работы с записями
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRecordsByCar,
  getAllRecordsByCarForStats,
  getRecordsByMonth,
  getRecentRecords,
  getCarTimeline,
  getBookedDates,
  getExpenseRecordsByCar,
  getExpensesByCategory,
  getPreparationRecordsByCar,
  getBuyoutContracts,
  getActiveBuyoutByCarId,
  createBuyoutPayment,
  updateBuyoutContractStatus,
  updateBuyoutContractDates,
  deleteBuyoutPayment,
  updateBuyoutContractParams,
  createRecord,
  createPreparationRecord,
  deleteRecord,
  deleteExpenseRecord,
  deletePreparationRecord,
  deleteBookingRecord
} from '@/api/records'
import { carsKeys } from './useCars'
import { useAppStore } from '@/store/useAppStore'
import type { RecordFormData, BuyoutStatus } from '@/types'

// Ключи для кэша
export const recordsKeys = {
  all: ['records'] as const,
  lists: () => [...recordsKeys.all, 'list'] as const,
  byCar: (carId: string, year: number, month: number) => 
    [...recordsKeys.all, 'car', carId, year, month] as const,
  byMonth: (year: number, month: number) => 
    [...recordsKeys.all, 'month', year, month] as const,
  recent: (limit: number) => [...recordsKeys.all, 'recent', limit] as const,
  timeline: (carId: string, year: number, month: number) => 
    [...recordsKeys.all, 'timeline', carId, year, month] as const,
}

// Получить записи по машине за месяц
export function useRecordsByCar(carId: string, year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: recordsKeys.byCar(carId, year, month),
    queryFn: () => getRecordsByCar(carId, year, month),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Получить ВСЕ записи по машине за месяц (включая buyout_payment) для расчёта статистики
export function useAllRecordsByCarForStats(carId: string, year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.byCar(carId, year, month), 'all'],
    queryFn: () => getAllRecordsByCarForStats(carId, year, month),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Получить все записи за месяц (для журнала)
export function useRecordsByMonth(year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: recordsKeys.byMonth(year, month),
    queryFn: () => getRecordsByMonth(year, month),
    enabled: isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Получить последние записи
export function useRecentRecords(limit: number = 10) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: recordsKeys.recent(limit),
    queryFn: () => getRecentRecords(limit),
    enabled: isReady,
    staleTime: 1000 * 60 * 1,
  })
}

// Получить таймлайн занятости
export function useCarTimeline(carId: string, year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: recordsKeys.timeline(carId, year, month),
    queryFn: () => getCarTimeline(carId, year, month),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Создать новую запись (без перезаписи существующих)
export function useCreateRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, userId }: { data: RecordFormData; userId?: string }) =>
      createRecord(data, userId),
    onSuccess: (_, { data }) => {
      // Инвалидируем все связанные запросы
      const date = new Date(data.recordDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1

      // Записи по машине
      queryClient.invalidateQueries({
        queryKey: recordsKeys.byCar(data.carId, year, month)
      })
      // Записи по месяцу
      queryClient.invalidateQueries({
        queryKey: recordsKeys.byMonth(year, month)
      })
      // Таймлайн
      queryClient.invalidateQueries({
        queryKey: recordsKeys.timeline(data.carId, year, month)
      })
      // Последние записи
      queryClient.invalidateQueries({
        queryKey: recordsKeys.all.filter(key => key.includes('recent'))
      })
      // Статистика машин
      queryClient.invalidateQueries({
        queryKey: carsKeys.stats(year, month)
      })
      // Список машин (может измениться статус)
      queryClient.invalidateQueries({
        queryKey: carsKeys.lists()
      })
      // Финансы — инвалидируем все финансовые данные для актуальности
      queryClient.invalidateQueries({
        queryKey: ['finance']
      })
    },
  })
}

// Удалить запись
export function useDeleteRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => {
      // Инвалидируем все записи
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      // Финансы — инвалидируем все финансовые данные для актуальности
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Удалить расход с обновлением preparation_cost
export function useDeleteExpenseRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExpenseRecord(id),
    onSuccess: () => {
      // Инвалидируем все записи
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      // Инвалидируем машины (может измениться preparation_cost)
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      // Финансы
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Удалить бронирование
export function useDeleteBookingRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteBookingRecord(id),
    onSuccess: () => {
      // Инвалидируем все записи
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      // Инвалидируем машины (может измениться статус)
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      // Финансы
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Получить занятые даты для машины (для блокировки в календаре)
export function useBookedDates(carId: string, year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'booked', carId, year, month],
    queryFn: () => getBookedDates(carId, year, month),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить историю расходов по машине
export function useExpenseRecordsByCar(carId: string) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'expenses', carId],
    queryFn: () => getExpenseRecordsByCar(carId),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Получить расходы по категориям (для графиков)
export function useExpensesByCategory(options?: {
  carId?: string | null
  year?: number
  month?: number
}) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'byCategory', options?.carId || 'all', options?.year || 'all', options?.month || 'all'],
    queryFn: () => getExpensesByCategory(options),
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить записи первичной подготовки по машине
export function usePreparationRecordsByCar(carId: string) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'preparation', carId],
    queryFn: () => getPreparationRecordsByCar(carId),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Создать запись первичной подготовки
export function useCreatePreparationRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ carId, category, amount, comment }: {
      carId: string
      category: 'insurance' | 'tires' | 'other'
      amount: number
      comment?: string
    }) => createPreparationRecord(carId, category, amount, comment),
    onSuccess: (_, { carId }) => {
      // Записи подготовки
      queryClient.invalidateQueries({
        queryKey: [...recordsKeys.all, 'preparation', carId]
      })
      // Все записи (расходы)
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      // Машины (preparation_cost)
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      // Финансы
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Удалить запись первичной подготовки
export function useDeletePreparationRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePreparationRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// ============================================================
// ВЫКУП: договоры и платежи
// ============================================================

// Получить все договоры выкупа
export function useBuyoutContracts() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'buyout'],
    queryFn: getBuyoutContracts,
    enabled: isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Внести платёж по выкупу
export function useCreateBuyoutPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      buyoutRecordId: string
      carId: string
      amount: number
      paymentDate: string
      notes?: string
    }) => createBuyoutPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Обновить статус договора выкупа
export function useUpdateBuyoutContractStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recordId, status }: { recordId: string; status: BuyoutStatus }) =>
      updateBuyoutContractStatus(recordId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Обновить даты договора выкупа
export function useUpdateBuyoutContractDates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recordId, startDate, endDate }: {
      recordId: string
      startDate: string
      endDate: string
    }) => updateBuyoutContractDates(recordId, startDate, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Проверить наличие активного выкупа на машину
export function useActiveBuyoutByCarId(carId: string | undefined) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...recordsKeys.all, 'activeBuyout', carId],
    queryFn: () => getActiveBuyoutByCarId(carId!),
    enabled: !!carId && isReady,
    staleTime: 1000 * 60 * 2,
  })
}

// Удалить платёж по выкупу
export function useDeleteBuyoutPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (paymentId: string) => deleteBuyoutPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Обновить параметры договора выкупа
export function useUpdateBuyoutContractParams() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      recordId: string
      termMonths: number
      monthlyPayment: number
      buyoutPrice: number
      carPrice?: number
      profitPercent?: number
      startDate: string
      endDate: string
    }) => updateBuyoutContractParams(params.recordId, {
      termMonths: params.termMonths,
      monthlyPayment: params.monthlyPayment,
      buyoutPrice: params.buyoutPrice,
      carPrice: params.carPrice,
      profitPercent: params.profitPercent,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}
