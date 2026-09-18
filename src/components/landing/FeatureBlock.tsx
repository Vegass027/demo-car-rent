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
  descriptionInCard?: boolean
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
  descriptionInCard = false,
}: FeatureBlockProps) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-[1400px] px-4 py-12 md:px-8 md:py-20 scroll-mt-20"
    >
      {/* Заголовок — всегда на всю ширину, в одну строку */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-6 flex items-start gap-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white font-head text-base font-semibold text-[#111]">
          {number}
        </span>
        <h2 className="font-head text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#111] md:text-3xl lg:text-[36px] whitespace-nowrap">
          {title}
        </h2>
      </motion.div>

      {/* Если description НЕ в карточке — выводим его отдельной строкой */}
      {!descriptionInCard && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          className="mb-8 max-w-[68ch] text-base leading-[1.6] text-[#2F3437] md:mb-12 md:text-lg"
        >
          {description}
        </motion.p>
      )}
      {descriptionInCard && <div className="mb-8 md:mb-10" />}

      {/* Картинка + карточка с текстом сбоку */}
      <div
        className={`grid grid-cols-1 items-start gap-6 md:gap-8 md:grid-cols-12 ${
          imagePosition === 'left' ? 'md:[&>*:first-child]:order-2' : ''
        }`}
      >
        {/* Картинка */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE }}
          className={descriptionInCard || footer ? 'md:col-span-8' : 'md:col-span-12'}
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

        {/* Карточка с description + footer (если нужно) — ровно по размеру текста */}
        {(descriptionInCard || footer) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="md:col-span-4 self-start"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-6">
              {descriptionInCard && (
                <p className="text-[15px] leading-[1.6] text-[#2F3437] md:text-base">
                  {description}
                </p>
              )}
              {footer && (
                <div className="flex flex-col gap-2 text-[14px] leading-[1.6] text-[#2F3437]">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
