// ============================================================
// HOOK: USE PWA
// Хук для работы с PWA функциональностью
// ============================================================

import { useState, useEffect, useCallback } from 'react'

export interface PWAInstallPrompt {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface UsePWAReturn {
  // Установка
  canInstall: boolean
  install: () => Promise<void>
  
  // Статус PWA
  isInstalled: boolean
  isStandalone: boolean
  isOnline: boolean
  
  // Service Worker
  swRegistration: ServiceWorkerRegistration | null
  updateAvailable: boolean
  updateApp: () => Promise<void>
  
  // Информация о среде
  platform: string
  userAgent: string
}

/**
 * Хук для работы с PWA функциональностью
 * 
 * @example
 * ```tsx
 * const { canInstall, install, isInstalled, isOnline } = usePWA()
 * 
 * return (
 *   <div>
 *     {isOnline ? 'Онлайн' : 'Оффлайн'}
 *     {canInstall && <button onClick={install}>Установить</button>}
 *   </div>
 * )
 * ```
 */
export function usePWA(): UsePWAReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  
  // Определяем платформу
  const platform = navigator.platform || 'unknown'
  const userAgent = navigator.userAgent

  // Проверяем, установлено ли приложение
  useEffect(() => {
    const checkInstalled = () => {
      // Проверяем display-mode для standalone режима
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // Для iOS также проверяем navigator.standalone
      const isIOSStandalone = (navigator as any).standalone === true
      
      setIsInstalled(isStandalone || isIOSStandalone)
    }

    checkInstalled()
    
    // Слушаем изменения display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)
    
    return () => {
      mediaQuery.removeEventListener('change', checkInstalled)
    }
  }, [])

  // Отслеживаем онлайн/офлайн статус
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Начальное состояние
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Отслеживаем beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as PWAInstallPrompt)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // Отслеживаем установку приложения
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handler)

    return () => {
      window.removeEventListener('appinstalled', handler)
    }
  }, [])

  // Регистрация Service Worker и отслеживание обновлений
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration)

        // Проверяем наличие обновлений
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Есть новая версия, готовая к установке
                setUpdateAvailable(true)
              }
            })
          }
        })
      })
    }
  }, [])

  // Функция установки приложения
  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Нет доступного prompt для установки')
      return
    }

    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Ошибка при установке PWA:', error)
    }
  }, [deferredPrompt])

  // Функция обновления приложения
  const updateApp = useCallback(async () => {
    if (!swRegistration || !swRegistration.waiting) {
      return
    }

    // Сообщаем waiting worker, что нужно активироваться
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // Перезагружаем страницу для применения обновлений
    window.location.reload()
  }, [swRegistration])

  // Проверяем, находится ли приложение в standalone режиме
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    isInstalled,
    isStandalone,
    isOnline,
    swRegistration,
    updateAvailable,
    updateApp,
    platform,
    userAgent,
  }
}

/**
 * Хук для отслеживания онлайн/офлайн статуса
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Хук для определения типа устройства
 */
export function useDeviceType(): {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
} {
  const [deviceType, setDeviceType] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
  })

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.innerWidth

    setDeviceType({
      isMobile: screenWidth < 768,
      isTablet: screenWidth >= 768 && screenWidth < 1024,
      isDesktop: screenWidth >= 1024,
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
    })
  }, [])

  return deviceType
}
