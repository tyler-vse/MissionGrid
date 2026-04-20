import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Clock, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Stat } from '@/components/ui/stat'
import { useCampaigns } from '@/data/useCampaigns'
import { useShift } from '@/data/useShift'
import { useShiftMembers } from '@/data/useShiftMembers'
import {
  useAddShiftMember,
  useRemoveShiftMember,
  useUpdateShiftMember,
} from '@/data/useShiftMemberMutations'
import { useUpdateShift } from '@/data/useUpdateShift'
import { useVolunteers } from '@/data/useVolunteers'
import type { Shift } from '@/domain/models/shift'
import { computeManHours, shiftDurationMinutes } from '@/domain/services/manHours'
import { formatUnknownError } from '@/lib/errors'

const NO_CAMPAIGN = '__none__'

const schema = z
  .object({
    startedAt: z.string().min(1, 'Start time is required'),
    endedAt: z.string().optional(),
    partySize: z
      .number({ message: 'Party size must be a number' })
      .int('Whole numbers only')
      .min(1, 'At least 1')
      .max(50, 'At most 50'),
    status: z.enum(['active', 'ended', 'abandoned']),
    leaderVolunteerId: z.string().min(1, 'Pick a leader'),
    campaignId: z.string().min(1),
    timeWindowMinutes: z
      .number({ message: 'Must be a number' })
      .int()
      .min(1)
      .max(600),
  })
  .refine(
    (v) => {
      if (v.status !== 'ended') return true
      return Boolean(v.endedAt)
    },
    { message: 'End time is required when status is ended', path: ['endedAt'] },
  )
  .refine(
    (v) => {
      if (!v.endedAt) return true
      return new Date(v.endedAt) >= new Date(v.startedAt)
    },
    { message: 'End must be after start', path: ['endedAt'] },
  )

type FormValues = z.infer<typeof schema>

/** Convert an ISO timestamp to the `YYYY-MM-DDTHH:mm` string that
 *  `<input type="datetime-local">` expects. Uses local time. */
function toLocalDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function localDateTimeToIso(local: string): string {
  return new Date(local).toISOString()
}

export function AdminShiftDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: shift, isLoading } = useShift(id)
  const { data: members = [] } = useShiftMembers(id)
  const { data: volunteers = [] } = useVolunteers()
  const { data: campaigns = [] } = useCampaigns()

  const updateShift = useUpdateShift()
  const addMember = useAddShiftMember()
  const updateMember = useUpdateShiftMember()
  const removeMember = useRemoveShiftMember()

  const [newMemberName, setNewMemberName] = useState('')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingMemberName, setEditingMemberName] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startedAt: '',
      endedAt: '',
      partySize: 1,
      status: 'ended',
      leaderVolunteerId: '',
      campaignId: NO_CAMPAIGN,
      timeWindowMinutes: 30,
    },
  })

  useEffect(() => {
    if (!shift) return
    form.reset({
      startedAt: toLocalDateTime(shift.startedAt),
      endedAt: toLocalDateTime(shift.endedAt),
      partySize: shift.partySize,
      status: shift.status,
      leaderVolunteerId: shift.leaderVolunteerId,
      campaignId: shift.campaignId ?? NO_CAMPAIGN,
      timeWindowMinutes: shift.timeWindowMinutes,
    })
  }, [shift, form])

  const currentLeader = useMemo(
    () =>
      shift
        ? volunteers.find((v) => v.id === shift.leaderVolunteerId)
        : undefined,
    [shift, volunteers],
  )

  if (!id) return <Navigate to="/admin/shifts" replace />

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading shift…</p>
  }

  if (!shift) {
    return (
      <EmptyState
        icon={Clock}
        title="Shift not found"
        description="It may have been deleted, or you opened a stale link."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/shifts">Back to shifts</Link>
          </Button>
        }
      />
    )
  }

  const watchedStatus = form.watch('status')
  const watchedStart = form.watch('startedAt')
  const watchedEnd = form.watch('endedAt')
  const watchedPartySize = form.watch('partySize')

  const previewDuration = (() => {
    if (!watchedStart) return 0
    const start = new Date(watchedStart).getTime()
    const end = watchedEnd ? new Date(watchedEnd).getTime() : Date.now()
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
    return Math.max(0, Math.round((end - start) / 60000))
  })()
  const previewManHours = computeManHours({
    durationMinutes: previewDuration,
    partySize: Math.max(1, Number(watchedPartySize) || 1),
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const nextEndedAt =
      values.status === 'active'
        ? null
        : values.endedAt
          ? localDateTimeToIso(values.endedAt)
          : null
    const reopening =
      shift.status === 'ended' && values.status === 'active'
    if (reopening) {
      const ok = window.confirm(
        'Re-opening this shift will clear its end time. Continue?',
      )
      if (!ok) return
    }
    try {
      await updateShift.mutateAsync({
        id: shift.id,
        previousCampaignId: shift.campaignId ?? null,
        patch: {
          startedAt: localDateTimeToIso(values.startedAt),
          endedAt: nextEndedAt,
          partySize: values.partySize,
          status: values.status,
          leaderVolunteerId: values.leaderVolunteerId,
          campaignId:
            values.campaignId === NO_CAMPAIGN ? null : values.campaignId,
          timeWindowMinutes: values.timeWindowMinutes,
        },
      })
      toast.success('Shift updated')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  })

  const clearEndedAt = () => {
    form.setValue('endedAt', '', { shouldDirty: true, shouldValidate: true })
  }

  const onAddMember = async () => {
    const name = newMemberName.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    try {
      await addMember.mutateAsync({
        shiftId: shift.id,
        campaignId: shift.campaignId ?? null,
        input: { displayName: name, firstName: name },
      })
      setNewMemberName('')
      toast.success('Member added')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const startEditMember = (memberId: string, currentName: string) => {
    setEditingMemberId(memberId)
    setEditingMemberName(currentName)
  }

  const cancelEditMember = () => {
    setEditingMemberId(null)
    setEditingMemberName('')
  }

  const saveEditMember = async () => {
    if (!editingMemberId) return
    const name = editingMemberName.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    try {
      await updateMember.mutateAsync({
        memberId: editingMemberId,
        shiftId: shift.id,
        campaignId: shift.campaignId ?? null,
        patch: { displayName: name, firstName: name },
      })
      cancelEditMember()
      toast.success('Member updated')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const toggleMemberLeft = async (
    memberId: string,
    currentlyLeft: boolean,
  ) => {
    try {
      await updateMember.mutateAsync({
        memberId,
        shiftId: shift.id,
        campaignId: shift.campaignId ?? null,
        patch: { leftAt: currentlyLeft ? null : new Date().toISOString() },
      })
      toast.success(currentlyLeft ? 'Marked as present' : 'Marked as left')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const onRemoveMember = async (memberId: string, name: string) => {
    const ok = window.confirm(`Remove ${name} from this shift?`)
    if (!ok) return
    try {
      await removeMember.mutateAsync({
        memberId,
        shiftId: shift.id,
        campaignId: shift.campaignId ?? null,
      })
      toast.success('Member removed')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const derivedDuration = shiftDurationMinutes(shift)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/shifts')}
          aria-label="Back to shifts"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <SectionHeader
          title={`Shift — ${currentLeader?.displayName ?? 'Unknown leader'}`}
          description={`Started ${new Date(shift.startedAt).toLocaleString()}`}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Current duration"
          value={`${derivedDuration}m`}
          tone="info"
        />
        <Stat
          label="Current party"
          value={shift.partySize}
          tone="primary"
        />
        <Stat
          label="Preview duration"
          value={`${previewDuration}m`}
        />
        <Stat
          label="Preview man-hrs"
          value={previewManHours.toFixed(1)}
          tone="success"
        />
      </div>

      {shift.status === 'active' && (
        <InlineAlert tone="warning">
          This shift is still marked as active. Set an end time and change the
          status to <strong>ended</strong> to close it out.
        </InlineAlert>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit()
        }}
        className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="shift-started">Started at</Label>
            <Input
              id="shift-started"
              type="datetime-local"
              {...form.register('startedAt')}
            />
            {form.formState.errors.startedAt && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.startedAt.message}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="shift-ended">Ended at</Label>
              {watchedEnd && (
                <button
                  type="button"
                  onClick={clearEndedAt}
                  className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <Input
              id="shift-ended"
              type="datetime-local"
              {...form.register('endedAt')}
            />
            {form.formState.errors.endedAt && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.endedAt.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="shift-party-size">Party size</Label>
            <Input
              id="shift-party-size"
              type="number"
              min={1}
              max={50}
              {...form.register('partySize', { valueAsNumber: true })}
            />
            {form.formState.errors.partySize && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.partySize.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="shift-time-window">Time window (min)</Label>
            <Input
              id="shift-time-window"
              type="number"
              min={1}
              max={600}
              {...form.register('timeWindowMinutes', { valueAsNumber: true })}
            />
            {form.formState.errors.timeWindowMinutes && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.timeWindowMinutes.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="shift-status">Status</Label>
            <Select
              value={watchedStatus}
              onValueChange={(v) =>
                form.setValue('status', v as Shift['status'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="shift-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="shift-leader">Leader</Label>
            <Select
              value={form.watch('leaderVolunteerId')}
              onValueChange={(v) =>
                form.setValue('leaderVolunteerId', v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="shift-leader">
                <SelectValue placeholder="Pick a leader" />
              </SelectTrigger>
              <SelectContent>
                {volunteers.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.leaderVolunteerId && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.leaderVolunteerId.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="shift-campaign">Campaign</Label>
            <Select
              value={form.watch('campaignId')}
              onValueChange={(v) =>
                form.setValue('campaignId', v, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="shift-campaign">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CAMPAIGN}>No campaign</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty || updateShift.isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || updateShift.isPending}
          >
            {updateShift.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <section
        aria-labelledby="members-heading"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2
              id="members-heading"
              className="text-base font-bold tracking-tight"
            >
              Members
            </h2>
            <p className="text-sm text-muted-foreground">
              Walk-up volunteers that joined this party. The shift leader is
              not listed here.
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <Input
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Add member name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void onAddMember()
              }
            }}
          />
          <Button
            type="button"
            onClick={() => void onAddMember()}
            disabled={addMember.isPending || !newMemberName.trim()}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No walk-up members on this shift.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {members.map((m) => {
              const isEditing = editingMemberId === m.id
              const hasLeft = Boolean(m.leftAt)
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 py-3"
                >
                  {isEditing ? (
                    <Input
                      value={editingMemberName}
                      onChange={(e) => setEditingMemberName(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void saveEditMember()
                        }
                        if (e.key === 'Escape') cancelEditMember()
                      }}
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{m.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(m.joinedAt).toLocaleString()}
                        {hasLeft && m.leftAt
                          ? ` · Left ${new Date(m.leftAt).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveEditMember()}
                          disabled={updateMember.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditMember}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditMember(m.id, m.displayName)}
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void toggleMemberLeft(m.id, hasLeft)}
                          disabled={updateMember.isPending}
                          className="gap-1.5"
                        >
                          <UserMinus className="h-4 w-4" />
                          {hasLeft ? 'Mark present' : 'Mark left'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void onRemoveMember(m.id, m.displayName)
                          }
                          disabled={removeMember.isPending}
                          aria-label={`Remove ${m.displayName}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
