import { APP_CONFIG } from '@/config/app.config'
import { cn } from '@/lib/utils'
import logoIcon from '@/assets/brand/logo-icon.png'
import logoLockup from '@/assets/brand/logo-lockup.png'

type Variant = 'icon' | 'lockup'
type Size = 'md' | 'lg'

const ICON_PX: Record<Size, number> = {
  md: 64,
  lg: 80,
}

const LOCKUP_PX: Record<Size, number> = {
  md: 260,
  lg: 320,
}

export function BrandLockup({
  variant = 'icon',
  size = 'lg',
  className,
}: {
  variant?: Variant
  size?: Size
  className?: string
}) {
  if (variant === 'lockup') {
    const width = LOCKUP_PX[size]
    return (
      <img
        src={logoLockup}
        alt={APP_CONFIG.name}
        width={width}
        height={Math.round(width * 0.3)}
        className={cn('mx-auto block h-auto w-auto', className)}
        style={{ width, maxWidth: '100%' }}
        draggable={false}
      />
    )
  }
  const px = ICON_PX[size]
  return (
    <img
      src={logoIcon}
      alt={APP_CONFIG.name}
      width={px}
      height={px}
      className={cn('mx-auto block rounded-2xl shadow-sm', className)}
      style={{ width: px, height: px }}
      draggable={false}
    />
  )
}
