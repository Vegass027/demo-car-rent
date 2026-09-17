import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Получить сохранённый токен из localStorage
function getStoredToken(): string | null {
  return localStorage.getItem('session_token')
}

// Сохранить токен в localStorage
export function setStoredToken(token: string): void {
  localStorage.setItem('session_token', token)
}

// Удалить токен из localStorage
export function removeStoredToken(): void {
  localStorage.removeItem('session_token')
}

// Клиент с JWT в каждом запросе
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const token = getStoredToken()
      const headers = new Headers((options as RequestInit).headers)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return fetch(url, { ...options, headers })
    }
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

export { supabaseUrl, supabaseAnonKey }
export { getStoredToken }

// Для кода который использует createAuthenticatedClient
export function createAuthenticatedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

// Получить авторизованный клиент (из сохранённого токена)
export function getAuthClient() {
  const token = getStoredToken()
  if (!token) return null
  return createAuthenticatedClient(token)
}
