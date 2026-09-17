import { supabaseUrl, supabaseAnonKey, getAuthClient } from '@/lib/supabase'
import { setStoredToken, removeStoredToken, getStoredToken } from '@/lib/supabase'
import type { User } from '@/types'

const FUNCTION_URL = `${supabaseUrl}/functions/v1/login`

interface EdgeLoginResponse {
  token: string
  role: User['role']
  user_id: string
}

// Вход через Edge Function login (генерирует JWT)
export async function signIn(username: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ login: username, password }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg = (body as { error?: string }).error || 'Ошибка соединения'
      return { user: null, error: msg }
    }

    const data = await res.json() as EdgeLoginResponse

    setStoredToken(data.token)

    // Декодируем JWT чтобы достать username
    const payload = JSON.parse(atob(data.token.split('.')[1]))

    const user: User = {
      id: data.user_id,
      username: payload.username ?? username,
      password: '',
      fullName: null,
      role: data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    return { user, error: null }
  } catch {
    return { user: null, error: 'Ошибка соединения' }
  }
}

// Проверить и обновить токен (refresh) — декодируем локально
export async function refreshSession(): Promise<{ user: User | null; error: string | null }> {
  const token = getStoredToken()
  if (!token) return { user: null, error: 'Нет токена' }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))

    // Проверяем exp
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      removeStoredToken()
      return { user: null, error: 'Токен истёк' }
    }

    const user: User = {
      id: payload.user_id,
      username: payload.username ?? '',
      password: '',
      fullName: null,
      role: payload.app_role || payload.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    return { user, error: null }
  } catch {
    removeStoredToken()
    return { user: null, error: 'Невалидный токен' }
  }
}

// Получить текущего пользователя по ID (использует JWT-клиент)
export async function getUserById(id: string): Promise<User | null> {
  const client = getAuthClient()
  if (!client) return null

  try {
    const { data } = await client
      .from('users')
      .select('id, username, full_name, role, is_active, created_at')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (!data) return null

    return {
      id: data.id as string,
      username: data.username as string,
      password: '',
      fullName: data.full_name as string | null,
      role: data.role as User['role'],
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    }
  } catch {
    return null
  }
}

// Выход — удалить токен
export function signOut(): void {
  removeStoredToken()
}

// Смена пароля — через Edge Function
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const token = getStoredToken()
  if (!token) return { error: 'Не авторизован' }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data.error || 'Ошибка смены пароля' }
    }

    return { error: null }
  } catch {
    return { error: 'Ошибка соединения' }
  }
}
