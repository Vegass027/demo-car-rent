import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

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
  descriptionIcon?: LucideIcon
}

const EASE = [0.23, 1, 0.32, 1] as const

function MiniBullet({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 max-w-[320px]">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffdb33]/40 bg-[#ffdb33]/20">
        <Icon className="h-5 w-5 text-[#111]" strokeWidth={1.8} />
      </span>
      <p className="text-center text-[16px] font-medium leading-[1.45] text-[#111] md:text-[17px]">
        {children}
      </p>
    </div>
  )
}

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
  descriptionIcon,
}: FeatureBlockProps) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-[1400px] px-4 py-12 md:px-8 md:py-20 scroll-mt-20"
    >
      {/* Шапка блока: цифра (по центру группы) + заголовок + подзаголовок с разделителем */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-10 grid grid-cols-[auto_1fr] items-center gap-4 md:mb-14"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white font-head text-base font-semibold text-[#111]">
          {number}
        </span>
        {!descriptionInCard ? (
          <div>
            <h2 className="font-head text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#111] md:text-3xl lg:text-[36px] whitespace-nowrap">
              {title}
            </h2>
            <p className="mt-3 max-w-full truncate whitespace-nowrap border-t border-black/[0.08] pt-3 text-[15px] leading-[1.4] text-[#787774] md:text-base">
              {description}
            </p>
          </div>
        ) : (
          <h2 className="font-head text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#111] md:text-3xl lg:text-[36px] whitespace-nowrap">
            {title}
          </h2>
        )}
      </motion.div>

      {descriptionInCard && <div className="mb-8 md:mb-10" />}

      {/* Картинка + блок с текстом сбоку (без рамки, центрирован по вертикали) */}
      <div
        className={`grid grid-cols-1 items-center gap-6 md:gap-10 md:grid-cols-12 ${
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

        {/* Карточка с description + footer (если нужно) — без рамки, центрирована */}
        {(descriptionInCard || footer) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="md:col-span-4"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              {descriptionInCard && descriptionIcon && (
                <MiniBullet icon={descriptionIcon}>{description}</MiniBullet>
              )}
              {descriptionInCard && !descriptionIcon && (
                <p className="text-[15px] leading-[1.6] text-[#2F3437] md:text-base">{description}</p>
              )}
              {footer && (
                <div className="flex flex-col items-center gap-5">{footer}</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

