// ============================================================
// Глобальный loading overlay при генерации документов
// Показывается поверх всего приложения при isGeneratingDocument=true
// ============================================================

import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function GeneratingDocumentOverlay() {
  const isLoading = useAppStore((s) => s.isGeneratingDocument)
  const label = useAppStore((s) => s.generatingDocumentLabel)

  if (!isLoading) return null

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
      style={{ pointerEvents: 'all' }}
    >
      <div className="rounded-2xl bg-white shadow-2xl px-8 py-6 flex flex-col items-center gap-3 min-w-[260px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-base font-semibold text-gray-900">
          {label || 'Генерация документа…'}
        </div>
        <div className="text-xs text-gray-500">Подождите, это займёт несколько секунд</div>
      </div>
    </div>
  )
}
