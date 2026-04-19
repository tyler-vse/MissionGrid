import { QRCodeSVG } from 'qrcode.react'
import { Copy, QrCode, RefreshCcw, Share2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  encodePartyHash,
  mergeRuntimeWithEnv,
} from '@/config/runtimeConfig'
import { useGeneratePartyToken } from '@/data/useGeneratePartyToken'
import { useShiftMembers } from '@/data/useShiftMembers'
import { useShift } from '@/data/useShift'
import { useUpdateShiftPartySize } from '@/data/useUpdateShiftPartySize'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useShiftStore } from '@/store/shiftStore'

interface PartyInviteSheetProps {
  shiftId: string | null
}

function buildJoinUrl(
  shiftId: string,
  token: string,
  runtime: {
    supabaseUrl: string
    supabaseAnonKey: string
    organizationId: string
    googleMapsApiKey?: string
  } | null,
): string | null {
  if (
    !runtime ||
    !runtime.supabaseUrl ||
    !runtime.supabaseAnonKey ||
    !runtime.organizationId
  ) {
    return null
  }
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join-shift`
      : '/join-shift'
  const payload = encodePartyHash({
    v: 1,
    shiftId,
    partyToken: token,
    supabaseUrl: runtime.supabaseUrl,
    supabaseAnonKey: runtime.supabaseAnonKey,
    organizationId: runtime.organizationId,
    googleMapsApiKey: runtime.googleMapsApiKey || undefined,
  })
  return `${base}#${payload}`
}

export function PartyInviteSheet({ shiftId }: PartyInviteSheetProps) {
  const partySize = useShiftStore((s) => s.partySize)
  const setPartySize = useShiftStore((s) => s.setPartySize)
  const storedToken = useShiftStore((s) => s.partyToken)
  const storedExpires = useShiftStore((s) => s.partyTokenExpiresAt)
  const setPartyToken = useShiftStore((s) => s.setPartyToken)

  const { data: shift } = useShift(shiftId)
  const { data: members = [] } = useShiftMembers(shiftId)
  const generate = useGeneratePartyToken()
  const updatePartySize = useUpdateShiftPartySize()

  const runtimeSlice = useRuntimeConfigStore(
    useShallow((s) => ({
      supabaseUrl: s.supabaseUrl,
      supabaseAnonKey: s.supabaseAnonKey,
      googleMapsApiKey: s.googleMapsApiKey,
      organizationId: s.organizationId,
      volunteerId: s.volunteerId,
      inviteToken: s.inviteToken,
    })),
  )
  const runtime = useMemo(() => {
    const merged = mergeRuntimeWithEnv(runtimeSlice)
    return {
      supabaseUrl: merged.supabaseUrl,
      supabaseAnonKey: merged.supabaseAnonKey,
      organizationId: merged.organizationId,
      googleMapsApiKey: merged.googleMapsApiKey,
    }
  }, [runtimeSlice])

  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [open])

  // Pull latest token from the server-backed shift so leaders on two devices stay in sync
  useEffect(() => {
    if (!shift) return
    if (shift.partyToken && shift.partyToken !== storedToken) {
      setPartyToken(shift.partyToken, shift.partyTokenExpiresAt ?? null)
    }
  }, [shift, storedToken, setPartyToken])

  const activeToken = shift?.partyToken ?? storedToken
  const joinUrl = useMemo(() => {
    if (!shiftId || !activeToken) return null
    return buildJoinUrl(shiftId, activeToken, runtime)
  }, [shiftId, activeToken, runtime])

  // Keep local party-size in sync if the backend bumped it (walk-ups joined)
  useEffect(() => {
    if (!shift) return
    if (shift.partySize !== partySize) {
      setPartySize(shift.partySize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shift?.partySize])

  const hasRuntime = Boolean(
    runtime.supabaseUrl && runtime.supabaseAnonKey && runtime.organizationId,
  )
  const disabled = !shiftId || !hasRuntime

  const onGenerate = async () => {
    if (!shiftId) {
      toast.error(
        'Party links need a shared shift — sign in with your org first.',
      )
      return
    }
    try {
      const next = await generate.mutateAsync({ shiftId })
      setPartyToken(next.partyToken ?? null, next.partyTokenExpiresAt ?? null)
      toast.success('Share link ready')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const onCopy = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy — long-press to select the link')
    }
  }

  const onShare = async () => {
    if (!joinUrl) return
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: 'Join our shift',
          text: 'We are canvassing right now — tap to join the party.',
          url: joinUrl,
        })
      } catch {
        // user cancelled — no toast
      }
    } else {
      void onCopy()
    }
  }

  const bumpSize = async (delta: number) => {
    const next = Math.max(1, Math.min(50, partySize + delta))
    if (next === partySize) return
    setPartySize(next)
    if (shiftId) {
      try {
        await updatePartySize.mutateAsync({ shiftId, partySize: next })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!/does not support/i.test(msg)) {
          toast.message(`Saved locally (${msg})`)
        }
      }
    }
  }

  const expiresLabel = useMemo(() => {
    if (!activeToken) return null
    const exp = shift?.partyTokenExpiresAt ?? storedExpires
    if (!exp) return 'Never expires'
    const ms = new Date(exp).getTime() - now
    if (ms <= 0) return 'Expired — generate a new link'
    const hrs = Math.round(ms / 3_600_000)
    return `Expires in ~${hrs}h`
  }, [activeToken, shift?.partyTokenExpiresAt, storedExpires, now])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          disabled={disabled}
          aria-label="Invite walk-ups"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" aria-hidden />
            Invite walk-ups
          </SheetTitle>
          <SheetDescription>
            Show the QR code to someone who just showed up, or copy the link.
            They&apos;ll join your party and their marks count toward your
            shift.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <section
            aria-labelledby="party-size-heading"
            className="rounded-2xl border bg-card p-4"
          >
            <p
              id="party-size-heading"
              className="text-sm font-semibold text-foreground"
            >
              Party size
            </p>
            <p className="text-xs text-muted-foreground">
              Total volunteers on this shift (including you).
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Decrease party size"
                onClick={() => void bumpSize(-1)}
                disabled={partySize <= 1 || updatePartySize.isPending}
              >
                −
              </Button>
              <p className="min-w-[4ch] text-center text-2xl font-bold tabular-nums">
                {partySize}
              </p>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Increase party size"
                onClick={() => void bumpSize(1)}
                disabled={partySize >= 50 || updatePartySize.isPending}
              >
                +
              </Button>
              <p className="ml-3 text-xs text-muted-foreground">
                {partySize === 1
                  ? 'Solo shift'
                  : `${partySize} people · counts for grant hours`}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="share-heading"
            className="rounded-2xl border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p
                  id="share-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Share link
                </p>
                <p className="text-xs text-muted-foreground">
                  {expiresLabel ??
                    'Generate a short-lived link new walk-ups can scan.'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void onGenerate()}
                disabled={generate.isPending || !shiftId}
                className="gap-1.5"
              >
                <RefreshCcw className="h-4 w-4" />
                {activeToken ? 'New link' : 'Generate'}
              </Button>
            </div>

            {joinUrl ? (
              <>
                <div className="mt-4 flex justify-center rounded-xl border bg-white p-4">
                  <QRCodeSVG value={joinUrl} size={192} includeMargin />
                </div>
                <div className="mt-3 break-all rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                  {joinUrl}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onCopy()}
                    className="gap-1.5"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onShare()}
                    className="gap-1.5"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No active link yet. Hit <strong>Generate</strong> to make one.
              </p>
            )}
          </section>

          <section
            aria-labelledby="members-heading"
            className="rounded-2xl border bg-card p-4"
          >
            <p
              id="members-heading"
              className="text-sm font-semibold text-foreground"
            >
              Who joined
            </p>
            {members.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nobody has scanned yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y text-sm">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 py-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-center text-xs font-semibold leading-6 text-primary">
                      {m.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span>{m.displayName}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
