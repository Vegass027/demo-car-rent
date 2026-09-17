// ============================================================
// FEATURE: APP LAYOUT
// Основной layout с навигацией для ПК и мобильных
// ============================================================

import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Car, LogOut, KeyRound } from 'lucide-react'
import { Button } from '@/components/retroui/Button'
import { useEnvironment } from '@/hooks/useEnvironment'
import { usePWA } from '@/hooks/usePWA'
import { useSignOut } from '@/hooks/useAuth'
import { ChangePasswordModal } from '@/components/features/ChangePasswordModal'

interface AppLayoutProps {
  children: ReactNode
}

// Названия разделов для хедера
const PAGE_TITLES: Record<string, string> = {
  '/': 'Дашборд',
  '/cars': 'Машины',
  '/journal': 'Журнал',
  '/finance': 'Финансы',
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isTelegram, isMobile } = useEnvironment()
  const { isStandalone } = usePWA()
  const location = useLocation()
  const signOut = useSignOut()
  const [showChangePassword, setShowChangePassword] = useState(false)
  
  // Получаем название текущей страницы
  const currentPageTitle = PAGE_TITLES[location.pathname] || 'Автопарк'

  // Определяем, нужно ли скрывать элементы UI
  const shouldHideUI = isTelegram
  const shouldShowBottomNav = isMobile && !isTelegram

  return (
    <div className={`min-h-screen bg-background ${isTelegram ? 'telegram-mode' : ''} ${isStandalone ? 'pwa-mode' : ''}`}>
      {/* Десктопная шапка - скрывается в Telegram и PWA */}
      {!shouldHideUI && (
        <header className="hidden md:block sticky top-0 z-50 w-full border-b-2 border-border bg-background">
          <div className="container max-w-6xl mx-auto flex h-20 items-center justify-between px-4">
            {/* Логотип и название текущего раздела */}
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <Car className="w-5 h-5 text-primary" />
                <span className="font-head text-lg">Автопарк</span>
              </Link>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="font-medium">{currentPageTitle}</span>
            </div>
            
            {/* Навигация с компактными кнопками */}
            <nav className="flex items-center gap-2">
              <NavButton to="/" label="📊 Дашборд" isActive={location.pathname === '/'} />
              <NavButton to="/cars" label="🚗 Машины" isActive={location.pathname.startsWith('/cars')} />
              <NavButton to="/journal" label="📋 Журнал" isActive={location.pathname === '/journal'} />
              <NavButton to="/finance" label="💰 Финансы" isActive={location.pathname === '/finance'} />
              
              <span className="w-px h-6 bg-border mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                className="!px-2 !py-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowChangePassword(true)}
                title="Сменить пароль"
              >
                <KeyRound className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="!px-2 !py-1 text-muted-foreground hover:text-red-600"
                onClick={signOut}
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </nav>
          </div>
        </header>
      )}

      {/* Основной контент */}
      <main className={`flex-1 ${!shouldHideUI ? 'pb-20 md:pb-4' : ''}`}>
        {children}
      </main>

      {/* Нижняя навигация - только для мобильных, скрывается на ПК и Telegram */}
      {shouldShowBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around gap-1 h-14 max-w-md mx-auto px-1">
            <BottomNavButton to="/" label="📊" isActive={location.pathname === '/'} />
            <BottomNavButton to="/cars" label="🚗" isActive={location.pathname.startsWith('/cars')} />
            <BottomNavButton to="/journal" label="📋" isActive={location.pathname === '/journal'} />
            <BottomNavButton to="/finance" label="💰" isActive={location.pathname === '/finance'} />
            <button
              className="flex-1 flex justify-center"
              onClick={signOut}
              title="Выйти"
            >
              <Button variant="outline" size="sm" className="!px-1 !py-1 w-auto text-red-600">
                <LogOut className="w-4 h-4" />
              </Button>
            </button>
          </div>
        </nav>
      )}

      {/* Модалка смены пароля */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}

// Навигационная кнопка для десктопа - компактная без лишних отступов
interface NavButtonProps {
  to: string
  label: string
  isActive: boolean
}

function NavButton({ to, label, isActive }: NavButtonProps) {
  return (
    <Link to={to}>
      <Button 
        variant={isActive ? 'default' : 'outline'} 
        size="sm"
        className="!px-2 !py-1"
      >
        {label}
      </Button>
    </Link>
  )
}

// Навигационная кнопка для мобильной нижней панели - компактная без лишних отступов
interface BottomNavButtonProps {
  to: string
  label: string
  isActive: boolean
}

function BottomNavButton({ to, label, isActive }: BottomNavButtonProps) {
  return (
    <Link to={to} className="flex-1 flex justify-center">
      <Button 
        variant={isActive ? 'default' : 'outline'} 
        size="sm"
        className="!px-1 !py-1 w-auto"
      >
        {label}
      </Button>
    </Link>
  )
}

// Компонент-обёртка для страниц с адаптивным контейнером
interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  const { isTelegram, isMobile } = useEnvironment()

  // В Telegram и на мобильных - полный width без padding
  // На десктопе - больше воздуха сверху
  const containerClass = isTelegram || isMobile
    ? `w-full px-4 py-4 ${className}`
    : `container max-w-6xl mx-auto px-4 py-6 pt-8 ${className}`

  return (
    <div className={containerClass}>
      {children}
    </div>
  )
}

// HOC для добавления Telegram BackButton
export function withTelegramBack<P extends object>(Component: React.ComponentType<P>) {
  return function WithTelegramBackWrapper(props: P) {
    const navigate = useNavigate()
    const { isTelegram } = useEnvironment()

    useEffect(() => {
      if (!isTelegram || !window.Telegram?.WebApp?.BackButton) return

      const tg = window.Telegram.WebApp
      const handleBack = () => navigate(-1)

      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }, [isTelegram])

    return <Component {...props} />
  }
}
