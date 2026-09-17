// ============================================================
// COMPONENT: INSTALL PROMPT BANNER
// Баннер для предложения установки PWA приложения
// ============================================================

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/retroui/Button'

/**
 * Компонент для отображения баннера установки PWA
 * Появляется автоматически, когда браузер предлагает установить приложение
 */
export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Проверяем, было ли уже отклонено предложение
    const wasDismissed = localStorage.getItem('pwa-install-dismissed')
    if (wasDismissed) {
      return
    }

    // Проверяем, установлено ли приложение
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) {
      return
    }

    const handler = (e: Event) => {
      // Предотвращаем стандартный браузерный prompt
      e.preventDefault()
      // Сохраняем событие для использования позже
      setDeferredPrompt(e)
      // Показываем наш баннер
      setShowBanner(true)
    }

    // Слушаем событие beforeinstallprompt
    window.addEventListener('beforeinstallprompt', handler)

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    // Показываем нативный prompt установки
    deferredPrompt.prompt()

    // Ждем выбора пользователя
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowBanner(false)
    }

    // Очищаем deferredPrompt
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    // Запоминаем, что пользователь отклонил предложение
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Не показываем баннер, если:
  // - нет deferredPrompt
  // - баннер скрыт
  // - пользователь уже отклонил
  if (!deferredPrompt || !showBanner || dismissed) {
    return null
  }

  return (
    <div
      className="fixed max-w-md bg-primary text-primary-foreground p-4 rounded-lg shadow-xl z-[9999] animate-in slide-in-from-top-4 duration-300 relative"
      style={{ top: '1rem', right: '1rem', left: 'auto' }}
    >
      {/* Кнопка закрытия в правом верхнем углу */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded hover:bg-primary-foreground/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* Иконка приложения */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-1">
            Установить приложение
          </h3>
          <p className="text-sm opacity-90 leading-snug">
            Добавьте Автопарк CRM на главный экран для быстрого доступа
          </p>
        </div>

        {/* Кнопка установки */}
        <div className="flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="min-w-[100px]"
          >
            <Download className="w-4 h-4 mr-1" />
            Установить
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Компонент для кнопки установки в настройках
 * Может использоваться в меню профиля или настройках
 */
interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function InstallButton({ 
  variant = 'outline', 
  size = 'md',
  className = '' 
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Проверяем, установлено ли приложение
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) {
      setCanInstall(false)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    await deferredPrompt.userChoice

    setDeferredPrompt(null)
    setCanInstall(false)
  }

  // Не показываем кнопку, если нельзя установить
  if (!canInstall) {
    return null
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstall}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Установить приложение
    </Button>
  )
}
