// ============================================================
// UI: STATUS BADGE
// Бейдж статуса машины с цветовой индикацией
// ============================================================

import { Badge } from '@/components/retroui/Badge'
import type { CarStatus } from '@/types'
import { CAR_STATUS_CONFIG } from '@/constants'

interface StatusBadgeProps {
  status: CarStatus
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

export function StatusBadge({ 
  status, 
  size = 'md', 
  showDot = true,
  className = '' 
}: StatusBadgeProps) {
  const config = CAR_STATUS_CONFIG[status]
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge 
      variant="outline"
      className={`
        inline-flex items-center gap-1.5 font-medium border-2
        ${config.bgClass} ${config.textClass} ${config.borderClass}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showDot && (
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      )}
      {config.label}
    </Badge>
  )
}

// Компактная версия только с точкой
interface StatusDotProps {
  status: CarStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusDot({ status, size = 'md', className = '' }: StatusDotProps) {
  const config = CAR_STATUS_CONFIG[status]
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <span 
      className={`
        inline-block rounded-full ${config.dotClass}
        ${sizeClasses[size]}
        ${className}
      `}
      title={config.label}
    />
  )
}
