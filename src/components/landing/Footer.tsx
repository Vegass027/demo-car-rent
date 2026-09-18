import { Phone, Send, MessageCircle } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-[#FBFBFA]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-6 px-4 py-12 md:px-8 md:py-14">
        {/* Заголовок "Контакт для связи" */}
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#787774]">
          <MessageCircle className="h-4 w-4 text-[#F97316]" strokeWidth={1.8} />
          Контакт для связи
        </div>

        {/* Блоки контактов */}
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <a
            href="tel:+79930838101"
            className="group flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 transition-all duration-200 hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] transition-transform duration-200 group-hover:scale-105">
              <Phone className="h-3.5 w-3.5 text-[#111]" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-[#111]">8-993-083-81-01</span>
              <span className="truncate text-xs text-[#787774]">Дмитрий Николаевич</span>
            </span>
          </a>
          <a
            href="https://t.me/ivanov1331"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 transition-all duration-200 hover:border-black/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] transition-transform duration-200 group-hover:scale-105">
              <Send className="h-3.5 w-3.5 text-[#111]" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-[#111]">@ivanov1331</span>
              <span className="truncate text-xs text-[#787774]">Дмитрий</span>
            </span>
          </a>
        </div>
      </div>
      <div className="border-t border-black/[0.06]">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-[#787774] md:px-8">
          © {new Date().getFullYear()} Автопарк CRM. Демо-версия для ознакомления.
        </p>
      </div>
    </footer>
  )
}
