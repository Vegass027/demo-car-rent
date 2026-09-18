import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FeatureBlockProps {
  id: string
  number: number
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  imagePosition?: 'left' | 'right'
  footer?: ReactNode
}

const EASE = [0.23, 1, 0.32, 1] as const

export function FeatureBlock({
  id,
  number,
  title,
  description,
  imageSrc,
  imageAlt,
  imagePosition = 'right',
  footer,
}: FeatureBlockProps) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8 md:py-24 scroll-mt-20"
    >
      <div
        className={cn(
          'grid items-center gap-10 md:gap-16',
          'grid-cols-1 md:grid-cols-2',
          imagePosition === 'left' && 'md:[&>*:first-child]:order-2'
        )}
      >
        {/* Текст */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white font-head text-sm font-semibold text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              {number}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#787774]">
              Раздел
            </span>
          </div>
          <h2 className="font-head text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111] md:text-4xl lg:text-[44px]">
            {title}
          </h2>
          <p className="max-w-[58ch] text-base leading-[1.6] text-[#2F3437] md:text-lg">
            {description}
          </p>
          {footer && <div className="mt-2 flex flex-col gap-3 text-[15px] leading-[1.6] text-[#2F3437]">{footer}</div>}
        </motion.div>

        {/* Картинка */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="aspect-[16/10] w-full overflow-hidden bg-[#F7F6F3]">
              <img
                src={imageSrc}
                alt={imageAlt}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
          {/* Подложка-свечение для премиум-эффекта */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-[#ffdb33]/0 via-[#ffdb33]/0 to-[#ffdb33]/[0.06]"
          />
        </motion.div>
      </div>
    </section>
  )
}
