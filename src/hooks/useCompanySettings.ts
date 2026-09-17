// ============================================================
// HOOK: COMPANY SETTINGS
// Управление настройками компании через React Query
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompanySettings, updateCompanySettings } from '@/api/company'
import { useAppStore } from '@/store/useAppStore'
import type { CompanySettingsFormData } from '@/types'

/**
 * Хук для получения настроек компании
 */
export function useCompanySettings() {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: ['companySettings'],
    staleTime: 1000 * 60 * 30, // 30 минут кэш - настройки редко меняются
    queryFn: getCompanySettings,
    enabled: isReady,
  })
}

/**
 * Хук для обновления настроек компании
 */
export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompanySettingsFormData) => updateCompanySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] })
    },
  })
}
