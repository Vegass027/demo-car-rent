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
      className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8 md:py-20 scroll-mt-20"
    >
      <div
        className={cn(
          'grid items-center gap-8 md:gap-12',
          'grid-cols-1 md:grid-cols-12',
          imagePosition === 'left' && 'md:[&>*:first-child]:order-2'
        )}
      >
        {/* Текст — 4/12, в карточке */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="md:col-span-4"
        >
          <div className="flex flex-col gap-5 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-[#FBFBFA] font-head text-base font-semibold text-[#111]">
                {number}
              </span>
            </div>
            <h2 className="font-head text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-[#111] md:text-[28px] lg:text-[32px]">
              {title}
            </h2>
            <p className="max-w-[58ch] text-[15px] leading-[1.6] text-[#2F3437] md:text-base">
              {description}
            </p>
            {footer && (
              <div className="mt-1 flex flex-col gap-2 text-[14px] leading-[1.6] text-[#2F3437]">
                {footer}
              </div>
            )}
          </div>
        </motion.div>

        {/* Картинка — 8/12 */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.08 }}
          className="md:col-span-8 relative"
        >
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              className="block w-full h-auto"
            />
          </div>
          {/* Подложка-свечение для премиум-эффекта */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[#ffdb33]/0 via-[#ffdb33]/0 to-[#ffdb33]/[0.06]"
          />
        </motion.div>
      </div>
    </section>
  )
}
