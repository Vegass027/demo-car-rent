import { Phone, Send, Car } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-[#FBFBFA]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-12 md:flex-row md:items-center md:px-8 md:py-14">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffdb33] border border-black/10">
            <Car className="h-5 w-5 text-[#111]" />
          </span>
          <div className="min-w-0">
            <p className="font-head text-base font-semibold text-[#111]">Автопарк CRM</p>
            <p className="text-sm text-[#787774]">Управление автопарком в одном приложении</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
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
