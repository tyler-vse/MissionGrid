import { cn } from '@/lib/utils'

/** Wordmark icon: connected dots suggest a coverage grid. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-primary-foreground"
        fill="none"
      >
        <g fill="currentColor">
          <circle cx="11" cy="10" r="2.25" />
          <circle cx="20" cy="16" r="2.25" />
          <circle cx="13" cy="22" r="2.25" />
        </g>
        <path
          d="M11 10 L20 16 L13 22"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
