import { useMutation, useQuery } from '@tanstack/react-query'
import { signIn as signInApi, refreshSession, signOut as signOutApi, changePassword as changePasswordApi } from '@/api/auth'
import { useAppStore } from '@/store/useAppStore'
import { getStoredToken } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { User } from '@/types'

// Вход
export function useSignIn() {
  const setUserAndReady = useAppStore((state) => state.setUserAndReady)

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      signInApi(username, password),
    onSuccess: (result) => {
      if (result.user) {
        localStorage.setItem('userId', result.user.id)
        setUserAndReady(result.user, true)
      }
    },
  })
}

// Выход — полная очистка состояния
export function useSignOut() {
  const setUserAndReady = useAppStore((state) => state.setUserAndReady)

  return () => {
    localStorage.removeItem('userId')
    signOutApi()
    setUserAndReady(null, false)
    queryClient.clear()
    window.location.href = '/login'
  }
}

// Текущий пользователь — проверяем через JWT refresh
export function useCurrentUser() {
  const token = getStoredToken()

  return useQuery<User | null>({
    queryKey: ['currentUser', token],
    queryFn: () => {
      if (!token) return Promise.resolve(null)
      return refreshSession().then((result) => {
        if (result.user) {
          localStorage.setItem('userId', result.user.id)
        }
        return result.user
      })
    },
    staleTime: 1000 * 60 * 5, // 5 минут кэш
    retry: false,
    enabled: !!token,
  })
}

// Смена пароля
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: {
      currentPassword: string
      newPassword: string
    }) => changePasswordApi(currentPassword, newPassword),
  })
}
