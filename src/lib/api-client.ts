import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function getStoredToken(): string | null {
  return localStorage.getItem('session_token')
}

// Единственный клиент — автоматически шлёт JWT из localStorage
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

// Для обратной совместимости
export function getClient() {
  return supabase
}

export function isAuthenticated(): boolean {
  return !!getStoredToken()
}

export async function rpcCall<T>(
  fnName: string,
  params: Record<string, unknown> = {}
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.rpc(fnName, params)
  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as T, error: null }
}

export { getStoredToken }
