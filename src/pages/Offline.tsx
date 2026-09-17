// ============================================================
// PAGE: OFFLINE
// Страница для отображения при отсутствии интернет-соединения
// ============================================================

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/retroui/Button'

export function Offline() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full text-center">
        {/* Иконка оффлайн режима */}
        <div className="flex justify-center mb-6">
          <div className="p-6 rounded-full bg-muted">
            <WifiOff className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="text-3xl font-head font-bold mb-3 text-foreground">
          Нет подключения к интернету
        </h1>

        {/* Описание */}
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Проверьте ваше интернет-соединение и попробуйте снова.
          <br />
          <span className="text-sm">
            Некоторые данные могут быть доступны из кэша.
          </span>
        </p>

        {/* Кнопка обновления */}
        <Button
          onClick={handleRefresh}
          size="lg"
          className="w-full max-w-xs mx-auto"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Обновить страницу
        </Button>

        {/* Дополнительная информация */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Совет:</strong> Вы можете продолжить работу с кэшированными данными
            или дождаться восстановления соединения.
          </p>
        </div>
      </div>
    </div>
  )
}
