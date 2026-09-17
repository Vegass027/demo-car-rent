import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useCurrentUser } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Cars } from '@/pages/Cars'
import { CarDetail } from '@/pages/CarDetail'
import { Journal } from '@/pages/Journal'
import { Finance } from '@/pages/Finance'
import { Offline } from '@/pages/Offline'
import { AppLayout } from '@/components/features/AppLayout'
import { InstallPromptBanner } from '@/components/features/InstallPromptBanner'
import { PWAStatusBar } from '@/components/features/PWAStatusBar'
import { Toaster } from '@/components/retroui/Sonner'

function AppRoutes() {
  const { data: userFromQuery, isLoading } = useCurrentUser()
  const user = useAppStore((state) => state.user)
  const setUserAndReady = useAppStore((state) => state.setUserAndReady)

  // Синхронизируем user из React Query в Zustand при загрузке
  useEffect(() => {
    if (userFromQuery) {
      setUserAndReady(userFromQuery, true)
    } else if (!isLoading) {
      setUserAndReady(null, false)
    }
  }, [userFromQuery, isLoading, setUserAndReady])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="font-head text-2xl text-foreground">ЗАГРУЗКА...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={() => {}} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <InstallPromptBanner />
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PWAStatusBar />
        <AppRoutes />
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}

export default App
