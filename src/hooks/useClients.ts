// ============================================================
// HOOKS: КЛИЕНТЫ
// React Query хуки для работы с клиентами
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchClients,
  createClient,
  updateClient,
  deleteClient,
  getClient,
  getRecentClients,
  contractDataToClientFormData,
  getClientHistory,
} from '@/api/clients'
import { useAppStore } from '@/store/useAppStore'
import type { Client, ClientFormData, ContractClientData } from '@/types'

// Ключи для React Query
export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  details: () => [...clientsKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientsKeys.details(), id] as const,
  search: (query: string) => [...clientsKeys.all, 'search', query] as const,
  recent: () => [...clientsKeys.all, 'recent'] as const,
}

// ============================================================
// ПОИСК
// ============================================================

// Поиск клиентов по ФИО или телефону
export function useClientSearch(query: string) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: clientsKeys.search(query),
    queryFn: () => searchClients(query),
    enabled: query.length >= 2 && isReady,
    staleTime: 1000 * 60 * 5, // 5 минут кэш
    placeholderData: (previousData) => previousData,
  })
}

// ============================================================
// ПОЛУЧЕНИЕ ДАННЫХ
// ============================================================

// Получить клиента по ID
export function useClient(id: string | null) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: clientsKeys.detail(id || ''),
    queryFn: () => getClient(id!),
    enabled: !!id && isReady,
    staleTime: 1000 * 60 * 10, // 10 минут кэш
  })
}

// Получить последних клиентов
export function useRecentClients(limit: number = 10) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: clientsKeys.recent(),
    queryFn: () => getRecentClients(limit),
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
  })
}

// ============================================================
// МУТАЦИИ
// ============================================================

// Создать клиента (с проверкой дублей — если есть, вернёт существующего)
export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ClientFormData) => createClient(data),
    onSuccess: (client) => {
      // Кэшируем клиента
      queryClient.setQueryData(clientsKeys.detail(client.id), client)
      // Инвалидируем списки
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clientsKeys.recent() })
    },
  })
}

// Обновить клиента
export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientFormData }) =>
      updateClient(id, data),
    onSuccess: (updatedClient) => {
      queryClient.setQueryData(clientsKeys.detail(updatedClient.id), updatedClient)
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() })
    },
  })
}

// Удалить клиента
export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: clientsKeys.detail(deletedId) })
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clientsKeys.recent() })
    },
  })
}

// ============================================================
// ХУК ДЛЯ СОХРАНЕНИЯ КЛИЕНТА ИЗ ДОГОВОРА
// ============================================================

export function useSaveClientFromContract() {
  const createMutation = useCreateClient()

  const saveFromContract = async (contractData: ContractClientData): Promise<Client> => {
    const clientData = contractDataToClientFormData(contractData)
    return createMutation.mutateAsync(clientData)
  }

  return {
    saveFromContract,
    isPending: createMutation.isPending,
  }
}

// ============================================================
// ИСТОРИЯ АРЕНД КЛИЕНТА
// ============================================================

// Получить историю аренд клиента
export function useClientHistory(clientId: string | null) {
  const isReady = useAppStore((state) => state.isReady)

  return useQuery({
    queryKey: [...clientsKeys.detail(clientId || ''), 'history'],
    queryFn: () => getClientHistory(clientId!),
    enabled: !!clientId && isReady,
    staleTime: 1000 * 60 * 5, // 5 минут кэш
  })
}
