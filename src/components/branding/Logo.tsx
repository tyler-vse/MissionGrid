import { cn } from '@/lib/utils'

/** Wordmark icon: map pin seated in a subtly gridded tile. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary shadow-sm',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        fill="none"
      >
        <g stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="0.75" strokeLinecap="round">
          <line x1="10.625" y1="6" x2="10.625" y2="26" />
          <line x1="16" y1="6" x2="16" y2="26" />
          <line x1="21.375" y1="6" x2="21.375" y2="26" />
          <line x1="6" y1="10.625" x2="26" y2="10.625" />
          <line x1="6" y1="16" x2="26" y2="16" />
          <line x1="6" y1="21.375" x2="26" y2="21.375" />
        </g>
        <path
          d="M16 4 C10.9 4 6.75 8.15 6.75 13.25 C6.75 18.25 16 28 16 28 C16 28 25.25 18.25 25.25 13.25 C25.25 8.15 21.1 4 16 4 Z"
          fill="#FFFFFF"
        />
        <circle cx="16" cy="13.25" r="3" fill="#25A35A" />
      </svg>
    </div>
  )
}
