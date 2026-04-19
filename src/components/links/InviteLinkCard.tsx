import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface InviteLinkCardProps {
  inviteUrl: string
  orgName?: string
  /** When true, shows the "What volunteers will see" explainer block. */
  showVolunteerPrimer?: boolean
  className?: string
}

export function InviteLinkCard({
  inviteUrl,
  orgName,
  showVolunteerPrimer = true,
  className,
}: InviteLinkCardProps) {
  const safeOrgName = orgName?.trim() || 'our team'

  return (
    <div className={className}>
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium text-foreground">Volunteer invite link</p>
          <p className="break-all rounded border bg-muted p-2 font-mono text-xs">
            {inviteUrl}
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteUrl)
                toast.success('Copied invite link')
              } catch {
                toast.error(
                  'Clipboard blocked — select the link above and copy it manually.',
                )
              }
            }}
          >
            Copy invite link
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="font-medium text-foreground">Share it with volunteers</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(inviteUrl, '_blank', 'noopener,noreferrer')
              }
            >
              Open link in new tab
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const subject = encodeURIComponent(
                  `You're invited to ${safeOrgName}`,
                )
                const body = encodeURIComponent(
                  `Hi,\n\nYou're invited to join ${safeOrgName} on MissionGrid. Tap the link below to set up your account:\n\n${inviteUrl}\n\nThanks!`,
                )
                window.location.href = `mailto:?subject=${subject}&body=${body}`
              }}
            >
              Share by email
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const body = encodeURIComponent(
                  `Join ${safeOrgName} on MissionGrid: ${inviteUrl}`,
                )
                window.location.href = `sms:?&body=${body}`
              }}
            >
              Share by text
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            &ldquo;Share by text&rdquo; opens your phone&apos;s messages app —
            works best on iOS / Android.
          </p>
        </div>

        {showVolunteerPrimer && (
          <div className="space-y-2 rounded-md border border-border bg-background p-3">
            <p className="font-medium text-foreground">
              What volunteers will see
            </p>
            <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
              <li>
                They tap the link you sent and MissionGrid opens in their
                browser.
              </li>
              <li>They enter their name and email — no password needed.</li>
              <li>
                They tap{' '}
                <span className="font-medium text-foreground">Join</span> and
                land on the volunteer home screen, ready to check in
                locations.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Tip: press{' '}
              <span className="font-medium text-foreground">
                Open link in new tab
              </span>{' '}
              above to try the flow yourself before sharing it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
