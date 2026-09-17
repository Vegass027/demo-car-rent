// Определение окружения: Telegram Mini App, PWA или обычный веб

export type AppEnvironment = 'telegram' | 'pwa' | 'web'

// Проверка, запущено ли приложение в Telegram Mini App
// SDK создаёт window.Telegram даже в браузере, поэтому проверяем реальные признаки:
// 1. initData — непустая строка с данными пользователя (только в настоящем Telegram)
// 2. platform — реальная платформа: 'android', 'ios', 'tdesktop', 'macos' и т.д.
// В браузере platform будет 'unknown' или отсутствовать, а initData будет пустым
export const isTelegramMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false
  if (!('Telegram' in window)) return false
  
  const tg = window.Telegram?.WebApp
  if (!tg) return false
  
  // Проверяем наличие реальных данных Telegram
  const hasInitData = tg.initData && tg.initData.length > 0
  const hasValidPlatform = tg.platform && tg.platform !== 'unknown'
  
  return hasInitData || hasValidPlatform
}

// Проверка, запущено ли приложение как PWA
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // Проверка display-mode: standalone (PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  // Проверка iOS Safari standalone
  const isIOSStandalone = ('navigator' in window) && 
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  
  return isStandalone || isIOSStandalone
}

// Проверка, мобильное ли устройство
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  )
}

// Определение текущего окружения
export const getAppEnvironment = (): AppEnvironment => {
  if (isTelegramMiniApp()) return 'telegram'
  if (isPWA()) return 'pwa'
  return 'web'
}

// Получение информации об окружении
export interface EnvironmentInfo {
  environment: AppEnvironment
  isTelegram: boolean
  isPWA: boolean
  isMobile: boolean
  isDesktop: boolean
}

export const getEnvironmentInfo = (): EnvironmentInfo => {
  const environment = getAppEnvironment()
  const mobile = isMobile()
  
  return {
    environment,
    isTelegram: environment === 'telegram',
    isPWA: environment === 'pwa',
    isMobile: mobile,
    isDesktop: !mobile,
  }
}
