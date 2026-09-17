// ============================================================
// HOOKS: МАШИНЫ
// React Query хуки для работы с машинами
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getCars, 
  getCarById, 
  getCarsWithStats, 
  getCarPreparationDetail,
  createCar, 
  updateCar, 
  updateCarStatus, 
  deleteCar 
} from '@/api/cars'
import { useAppStore } from '@/store/useAppStore'
import type { Car, CarStatus, CarFormData } from '@/types'

// Ключи для кэша
export const carsKeys = {
  all: ['cars'] as const,
  lists: () => [...carsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...carsKeys.lists(), filters] as const,
  details: () => [...carsKeys.all, 'detail'] as const,
  detail: (id: string) => [...carsKeys.details(), id] as const,
  stats: (year: number, month: number) => [...carsKeys.all, 'stats', year, month] as const,
}

// Получить все машины
export function useCars() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: carsKeys.lists(),
    queryFn: getCars,
    enabled: isReady,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

// Получить машину по ID
export function useCar(id: string | undefined) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: carsKeys.detail(id || ''),
    queryFn: () => getCarById(id!),
    enabled: !!id && isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// Получить машины со статистикой за месяц
export function useCarsWithStats(year: number, month: number) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: carsKeys.stats(year, month),
    queryFn: () => getCarsWithStats(year, month),
    enabled: isReady,
    staleTime: 1000 * 60 * 2, // 2 минуты
  })
}

// Создать машину
export function useCreateCar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CarFormData) => createCar(data as Partial<Car>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() })
    },
  })
}

// Обновить машину
export function useUpdateCar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Car> }) => updateCar(id, data),
    onSuccess: () => {
      // Инвалидируем все связанные кэши
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['records'] })
    },
  })
}

// Обновить статус машины
export function useUpdateCarStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CarStatus }) => 
      updateCarStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: carsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: carsKeys.detail(id) })
    },
  })
}

// Удалить машину
export function useDeleteCar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carsKeys.all })
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
    },
  })
}

// Получить детализацию подготовки одной машины
export function useCarPreparation(carId: string | null) {
  return useQuery({
    queryKey: [...carsKeys.all, 'preparation', carId],
    queryFn: () => getCarPreparationDetail(carId!),
    enabled: !!carId,
    staleTime: 1000 * 60 * 5,
  })
}
