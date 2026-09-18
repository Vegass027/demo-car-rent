import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

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
      className="mx-auto w-full max-w-[1400px] px-4 py-12 md:px-8 md:py-20 scroll-mt-20"
    >
      {/* Заголовок + описание — полная ширина сверху */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 mb-8 md:mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="md:col-span-8 flex items-start gap-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white font-head text-base font-semibold text-[#111]">
            {number}
          </span>
          <div className="flex flex-col gap-3">
            <h2 className="font-head text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#111] md:text-4xl lg:text-[44px]">
              {title}
            </h2>
            <p className="max-w-[58ch] text-base leading-[1.6] text-[#2F3437] md:text-lg">
              {description}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Картинка (большая) + блок пунктов сбоку */}
      <div
        className={`grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-stretch ${
          imagePosition === 'left' ? 'md:[&>*:first-child]:order-2' : ''
        }`}
      >
        {/* Картинка — 8/12 */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="md:col-span-8"
        >
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              className="block w-full h-auto"
            />
          </div>
        </motion.div>

        {/* Блок пунктов — 4/12, по вертикали по центру картинки */}
        {footer && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="md:col-span-4 flex"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-7 w-full">
              {footer}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
