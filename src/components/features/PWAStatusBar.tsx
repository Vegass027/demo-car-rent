// ============================================================
// COMPONENT: PWA STATUS BAR
// Статус-бар для отображения онлайн/офлайн статуса и обновлений
// ============================================================

import { WifiOff, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/retroui/Button'
import { usePWA } from '@/hooks/usePWA'
import { useLocation } from 'react-router-dom'

/**
 * Компонент для отображения статуса PWA
 * Показывает онлайн/офлайн статус и уведомление об обновлениях
 */
export function PWAStatusBar() {
  const { isOnline, updateAvailable, updateApp } = usePWA()
  const location = useLocation()

  // Не показываем на публичных страницах (лендинг, логин) — чтобы не перекрывать хедер
  if (location.pathname === '/login' || location.pathname === '/landing') {
    return null
  }

  // Если все в порядке и нет обновлений - не показываем
  if (isOnline && !updateAvailable) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Офлайн статус */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Нет подключения к интернету</span>
        </div>
      )}

      {/* Уведомление об обновлении */}
      {isOnline && updateAvailable && (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Доступно обновление приложения</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={updateApp}
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Обновить
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Компактный индикатор статуса (для использования в хедере)
 */
export function PWAStatusIndicator() {
  const { isOnline, updateAvailable } = usePWA()

  if (isOnline && !updateAvailable) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded-full">
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-medium">Оффлайн</span>
        </div>
      )}
      
      {isOnline && updateAvailable && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-full">
          <Download className="w-4 h-4" />
          <span className="text-xs font-medium">Обновление</span>
        </div>
      )}
    </div>
  )
}
