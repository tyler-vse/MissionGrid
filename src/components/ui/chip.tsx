import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex min-h-[44px] select-none items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary text-primary-foreground shadow-sm',
        false:
          'border-border bg-background text-foreground hover:bg-muted',
      },
      size: {
        default: 'min-h-[44px] px-4',
        sm: 'min-h-[36px] px-3 text-xs',
        lg: 'min-h-[52px] px-6 text-base',
      },
    },
    defaultVariants: {
      selected: false,
      size: 'default',
    },
  },
)

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={selected ?? undefined}
        className={cn(chipVariants({ selected, size }), className)}
        {...props}
      />
    )
  },
)
Chip.displayName = 'Chip'
