import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { APP_CONFIG } from '@/config/app.config'
import {
  type DelegationEmail,
  type DelegationMode,
  type PreflightDelegationContext,
  type PreflightItemConfig,
  PREFLIGHT_ITEMS,
} from '@/features/setup/preflight/preflightItems'

type ItemStatus = 'unconfirmed' | 'ready' | 'delegated'

interface ItemState {
  status: ItemStatus
  expanded: boolean
  delegationOpen: boolean
  mode: DelegationMode
  subject: string
  body: string
  recipientEmail: string
}

function defaultItemState(): ItemState {
  return {
    status: 'unconfirmed',
    expanded: false,
    delegationOpen: false,
    mode: 'walkthrough',
    subject: '',
    body: '',
    recipientEmail: '',
  }
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'ready') {
    return <Badge variant="success">Ready</Badge>
  }
  if (status === 'delegated') {
    return <Badge variant="info">Help requested</Badge>
  }
  return <Badge variant="muted">Not yet</Badge>
}

export interface PreflightChecklistProps {
  orgName: string
  onContinue: () => void
  onBack: () => void
}

/**
 * Pre-flight access / value checklist shown before the Supabase-backed guided
 * setup begins. Each item can be marked "I have this", or delegated via a
 * pre-filled email that the admin copies to whoever actually holds the
 * Google Cloud / billing / webmaster / board access needed.
 */
export function PreflightChecklist({
  orgName,
  onContinue,
  onBack,
}: PreflightChecklistProps) {
  const [requesterName, setRequesterName] = useState('')
  const [requesterEmail, setRequesterEmail] = useState('')
  const [states, setStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(PREFLIGHT_ITEMS.map((i) => [i.id, defaultItemState()])),
  )

  const ctx: PreflightDelegationContext = useMemo(
    () => ({
      appOrigin: window.location.origin,
      appName: APP_CONFIG.name,
      orgName,
      requesterName,
      requesterEmail,
    }),
    [orgName, requesterName, requesterEmail],
  )

  const requiredUnresolved = PREFLIGHT_ITEMS.filter(
    (i) => i.required && states[i.id]?.status === 'unconfirmed',
  )
  const readyCount = PREFLIGHT_ITEMS.filter(
    (i) => states[i.id]?.status !== 'unconfirmed',
  ).length

  const updateItem = (id: string, patch: Partial<ItemState>) =>
    setStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? defaultItemState()), ...patch },
    }))

  const buildEmail = (
    item: PreflightItemConfig,
    mode: DelegationMode,
  ): DelegationEmail | null => {
    if (!item.delegation) return null
    if (mode === 'grant') {
      return item.delegation.grant ? item.delegation.grant(ctx) : null
    }
    return item.delegation.walkthrough(ctx)
  }

  const openDelegation = (item: PreflightItemConfig) => {
    const email = buildEmail(item, 'walkthrough')
    updateItem(item.id, {
      delegationOpen: true,
      expanded: true,
      mode: 'walkthrough',
      subject: email?.subject ?? '',
      body: email?.body ?? '',
    })
  }

  const switchMode = (item: PreflightItemConfig, nextMode: DelegationMode) => {
    const email = buildEmail(item, nextMode)
    if (!email) return
    updateItem(item.id, {
      mode: nextMode,
      subject: email.subject,
      body: email.body,
    })
  }

  const refreshEmail = (item: PreflightItemConfig) => {
    const state = states[item.id]
    if (!state) return
    const email = buildEmail(item, state.mode)
    if (!email) return
    updateItem(item.id, { subject: email.subject, body: email.body })
  }

  const copyEmail = async (item: PreflightItemConfig) => {
    const state = states[item.id]
    if (!state) return
    const text = `Subject: ${state.subject}\n\n${state.body}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Email copied — paste into your mail app')
      updateItem(item.id, { status: 'delegated' })
    } catch {
      toast.error(
        'Clipboard blocked — select the subject and body below and copy manually.',
      )
    }
  }

  const openInMail = (item: PreflightItemConfig) => {
    const state = states[item.id]
    if (!state) return
    const to = encodeURIComponent(state.recipientEmail.trim())
    const subject = encodeURIComponent(state.subject)
    const body = encodeURIComponent(state.body)
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
    updateItem(item.id, { status: 'delegated' })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pre-flight: do you have what you need?</CardTitle>
          <CardDescription>
            A two-minute check so you don&apos;t start setup and get stuck
            waiting on a Google Cloud admin, your treasurer, or your webmaster.
            For anything you don&apos;t personally hold, generate a copy/paste
            email for the right person.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="requesterName">Your name</Label>
              <Input
                id="requesterName"
                placeholder="Alex Rivera"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="requesterEmail">
                Your email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="requesterEmail"
                type="email"
                placeholder="alex@example.org"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            We use these to personalize the emails below. Nothing is sent or
            stored — the emails are generated in your browser for you to copy.
          </p>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{readyCount}</span>{' '}
              of {PREFLIGHT_ITEMS.length} items addressed
            </span>
            <span>
              {requiredUnresolved.length === 0
                ? 'Required items covered'
                : `${requiredUnresolved.length} required item${requiredUnresolved.length === 1 ? '' : 's'} still open`}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {PREFLIGHT_ITEMS.map((item) => {
          const state = states[item.id] ?? defaultItemState()
          const hasGrant = Boolean(item.delegation?.grant)
          return (
            <Card key={item.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      {item.required ? (
                        <Badge variant="warning">Required</Badge>
                      ) : (
                        <Badge variant="outline">Recommended</Badge>
                      )}
                      <StatusBadge status={state.status} />
                    </div>
                    <CardDescription>{item.subtitle}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateItem(item.id, { expanded: !state.expanded })
                    }
                  >
                    {state.expanded ? 'Hide details' : 'Details'}
                  </Button>
                </div>
              </CardHeader>

              {state.expanded && (
                <CardContent className="space-y-3 border-t pt-4 text-sm">
                  <p className="text-muted-foreground">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    Usually takes {item.estimatedTime}
                    {item.delegation
                      ? ` · Typically held by: ${item.delegation.recipientRole}`
                      : ''}
                    .
                  </p>
                </CardContent>
              )}

              <CardFooter className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant={state.status === 'ready' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    updateItem(item.id, {
                      status: state.status === 'ready' ? 'unconfirmed' : 'ready',
                      delegationOpen: false,
                    })
                  }
                >
                  {state.status === 'ready' ? 'Marked ready' : 'I have this'}
                </Button>

                {item.delegation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      state.delegationOpen
                        ? updateItem(item.id, { delegationOpen: false })
                        : openDelegation(item)
                    }
                  >
                    {state.delegationOpen
                      ? 'Hide email'
                      : `Ask ${item.delegation.recipientRole.toLowerCase()}`}
                  </Button>
                )}

                {state.status === 'delegated' && (
                  <span className="text-xs text-muted-foreground">
                    Email drafted — mark ready once the other person confirms.
                  </span>
                )}
              </CardFooter>

              {state.delegationOpen && item.delegation && (
                <CardContent className="space-y-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    {item.delegation.ask}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        state.mode === 'walkthrough' ? 'default' : 'outline'
                      }
                      onClick={() => switchMode(item, 'walkthrough')}
                    >
                      Ask them to do it
                    </Button>
                    {hasGrant && (
                      <Button
                        type="button"
                        size="sm"
                        variant={state.mode === 'grant' ? 'default' : 'outline'}
                        onClick={() => switchMode(item, 'grant')}
                      >
                        Ask them to grant me access
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => refreshEmail(item)}
                      title="Rebuild the email using the latest name / org inputs"
                    >
                      Refresh with my info
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`recipient-${item.id}`}>
                        Their email{' '}
                        <span className="text-muted-foreground">
                          (optional — used by &ldquo;Open in mail app&rdquo;)
                        </span>
                      </Label>
                      <Input
                        id={`recipient-${item.id}`}
                        type="email"
                        placeholder="admin@example.org"
                        value={state.recipientEmail}
                        onChange={(e) =>
                          updateItem(item.id, {
                            recipientEmail: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`subject-${item.id}`}>Subject</Label>
                      <Input
                        id={`subject-${item.id}`}
                        value={state.subject}
                        onChange={(e) =>
                          updateItem(item.id, { subject: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`body-${item.id}`}>Email body</Label>
                      <Textarea
                        id={`body-${item.id}`}
                        rows={12}
                        value={state.body}
                        onChange={(e) =>
                          updateItem(item.id, { body: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void copyEmail(item)}
                    >
                      Copy email
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openInMail(item)}
                    >
                      Open in mail app
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateItem(item.id, {
                          status: 'delegated',
                          delegationOpen: false,
                        })
                      }
                    >
                      Mark as requested
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    The email is yours to edit — trim, add context, or paste it
                    into Slack or Signal instead. Once the other person replies
                    with what you need, come back and click{' '}
                    <span className="font-medium text-foreground">
                      I have this
                    </span>
                    .
                  </p>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <Card>
        <CardFooter className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {requiredUnresolved.length > 0 && (
              <p className="self-center text-xs text-muted-foreground">
                Address the required items to continue, or mark them as
                requested.
              </p>
            )}
            <Button
              type="button"
              disabled={requiredUnresolved.length > 0}
              onClick={onContinue}
              title={
                requiredUnresolved.length > 0
                  ? 'Mark the required items as ready or requested first.'
                  : undefined
              }
            >
              Continue to setup
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
