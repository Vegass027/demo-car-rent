import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Car, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'cars', label: 'Машины' },
  { id: 'timeline', label: 'Календарь' },
  { id: 'records', label: 'Записи' },
  { id: 'buyout', label: 'Выкуп' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'journal', label: 'Журнал' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'payback', label: 'Окупаемость' },
  { id: 'access', label: 'Доступ' },
]

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleAnchorClick = (id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-black/5'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Логотип — только иконка */}
        <Link to="/landing" className="flex items-center" aria-label="Автопарк CRM">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ffdb33] border border-black/10">
            <Car className="h-4 w-4 text-[#111]" />
          </span>
        </Link>

        {/* Десктоп нав */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => handleAnchorClick(item.id)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[#2F3437] transition-colors hover:text-[#111] hover:bg-black/[0.04]"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* CTA + Mobile toggle */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="group hidden md:inline-flex items-center gap-2 rounded-full bg-[#111] pl-5 pr-1.5 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98]"
          >
            Открыть демо
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
              <ArrowUpRight className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
          </Link>
          <button
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white/60 backdrop-blur"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Меню"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="lg:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  onClick={() => handleAnchorClick(item.id)}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[#2F3437] hover:bg-black/[0.04]"
                >
                  {item.label}
                </motion.button>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="group mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#111] px-5 py-2.5 text-sm font-medium text-white"
              >
                Открыть демо
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-[1px]">
                  <ArrowUpRight className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                </span>
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
