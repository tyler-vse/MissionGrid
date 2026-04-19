import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface AdminBookmarkCardProps {
  adminUrl: string
  orgName?: string
  /** When true, shows the sign-in helper text. */
  showSignInHint?: boolean
  className?: string
}

export function AdminBookmarkCard({
  adminUrl,
  orgName,
  showSignInHint = true,
  className,
}: AdminBookmarkCardProps) {
  const safeOrgName = orgName?.trim() || 'your team'

  return (
    <div
      className={
        className ??
        'space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3'
      }
    >
      <div className="space-y-1">
        <p className="font-medium text-foreground">Your admin bookmark link</p>
        <p className="text-xs text-muted-foreground">
          Save this on every device you&apos;ll admin from. Opening it once
          lets you sign in with email + password from then on.
        </p>
      </div>
      <p className="break-all rounded border bg-background p-2 font-mono text-xs">
        {adminUrl}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(adminUrl)
              toast.success('Copied admin link')
            } catch {
              toast.error(
                'Clipboard blocked — select the link above and copy it manually.',
              )
            }
          }}
        >
          Copy admin link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => window.open(adminUrl, '_blank', 'noopener,noreferrer')}
        >
          Open in new tab
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const subject = encodeURIComponent(
              `Admin bookmark for ${safeOrgName} on MissionGrid`,
            )
            const body = encodeURIComponent(
              `Open this link on any device you admin from, then sign in with your email and password:\n\n${adminUrl}\n\nKeep this link private — it lets anyone who has it reach the admin sign-in page for ${safeOrgName}.`,
            )
            window.location.href = `mailto:?subject=${subject}&body=${body}`
          }}
        >
          Email myself
        </Button>
      </div>
      {showSignInHint && (
        <p className="text-xs text-muted-foreground">
          Signing in requires the admin email and password you set during
          setup. The link only pre-loads the Supabase connection — not your
          password.
        </p>
      )}
    </div>
  )
}
