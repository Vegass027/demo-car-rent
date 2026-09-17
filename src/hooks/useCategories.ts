// ============================================================
// HOOKS: КАТЕГОРИИ РАСХОДОВ
// React Query хуки для работы с категориями
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { getExpenseCategories } from '@/api/categories'
import { useAppStore } from '@/store/useAppStore'

// Получить все категории расходов
export function useExpenseCategories() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: getExpenseCategories,
    enabled: isReady,
    staleTime: 1000 * 60 * 30, // 30 минут кэш
  })
}
