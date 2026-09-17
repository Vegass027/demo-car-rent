import { useState, useEffect, useCallback } from 'react'
import {
  getEnvironmentInfo,
  type EnvironmentInfo
} from '@/utils/env'

// Хук для определения и работы с окружением
export function useEnvironment() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo>({
    environment: 'web',
    isTelegram: false,
    isPWA: false,
    isMobile: false,
    isDesktop: true,
  })

  useEffect(() => {
    const info = getEnvironmentInfo()
    setEnvInfo(info)
    
    // Инициализация Telegram WebApp если запущено в Telegram
    if (info.isTelegram && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      
      // Сообщаем Telegram, что приложение готово
      tg.ready()
      
      // Расширяем на весь экран
      tg.expand()
      
      // Устанавливаем цвет темы
      if (tg.themeParams.bg_color) {
        document.documentElement.style.setProperty('--tg-bg-color', tg.themeParams.bg_color)
      }
      if (tg.themeParams.text_color) {
        document.documentElement.style.setProperty('--tg-text-color', tg.themeParams.text_color)
      }
    }
  }, [])

  // Показать алерт (Telegram или браузерный)
  const showAlert = useCallback((message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (envInfo.isTelegram && window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert(message, resolve)
      } else {
        alert(message)
        resolve()
      }
    })
  }, [envInfo.isTelegram])

  // Показать подтверждение (Telegram или браузерное)
  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (envInfo.isTelegram && window.Telegram?.WebApp) {
        window.Telegram.WebApp.showConfirm(message, resolve)
      } else {
        resolve(confirm(message))
      }
    })
  }, [envInfo.isTelegram])

  // Закрыть приложение (только для Telegram)
  const close = useCallback(() => {
    if (envInfo.isTelegram && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    }
  }, [envInfo.isTelegram])

  // Хаптик фидбек
  const haptic = useCallback((type: 'impact' | 'notification' | 'selection' = 'impact') => {
    if (envInfo.isTelegram && window.Telegram?.WebApp?.HapticFeedback) {
      const hapticFeedback = window.Telegram.WebApp.HapticFeedback
      switch (type) {
        case 'impact':
          hapticFeedback.impactOccurred('medium')
          break
        case 'notification':
          hapticFeedback.notificationOccurred('success')
          break
        case 'selection':
          hapticFeedback.selectionChanged()
          break
      }
    }
  }, [envInfo.isTelegram])

  return {
    ...envInfo,
    showAlert,
    showConfirm,
    close,
    haptic,
    // Алиасы для удобства
    isTelegram: envInfo.isTelegram,
    isPWA: envInfo.isPWA,
    isMobile: envInfo.isMobile,
    isDesktop: envInfo.isDesktop,
  }
}

// Хук для работы с Telegram BackButton
export function useTelegramBackButton(onBack: () => void, deps: unknown[] = []) {
  const { isTelegram } = useEnvironment()

  useEffect(() => {
    if (!isTelegram || !window.Telegram?.WebApp?.BackButton) return

    const tg = window.Telegram.WebApp
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)

    return () => {
      tg.BackButton.offClick(onBack)
      tg.BackButton.hide()
    }
  }, [isTelegram, ...deps])
}

// Хук для работы с Telegram MainButton
export function useTelegramMainButton(
  text: string, 
  onClick: () => void, 
  options?: { 
    disabled?: boolean
    loading?: boolean 
  }
) {
  const { isTelegram } = useEnvironment()

  useEffect(() => {
    if (!isTelegram || !window.Telegram?.WebApp?.MainButton) return

    const tg = window.Telegram.WebApp
    tg.MainButton.setText(text)
    tg.MainButton.onClick(onClick)
    
    if (options?.disabled) {
      tg.MainButton.disable()
    } else {
      tg.MainButton.enable()
    }
    
    if (options?.loading) {
      tg.MainButton.showProgress()
    } else {
      tg.MainButton.hideProgress()
    }
    
    tg.MainButton.show()

    return () => {
      tg.MainButton.offClick(onClick)
      tg.MainButton.hide()
    }
  }, [isTelegram, text, onClick, options?.disabled, options?.loading])
}
