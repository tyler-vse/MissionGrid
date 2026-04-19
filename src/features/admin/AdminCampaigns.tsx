import { zodResolver } from '@hookform/resolvers/zod'
import { Megaphone, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import { Textarea } from '@/components/ui/textarea'
import { useCampaigns } from '@/data/useCampaigns'
import { useCreateCampaign } from '@/data/useCreateCampaign'
import { useServiceAreas } from '@/data/useServiceAreas'
import { formatUnknownError } from '@/lib/errors'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string().optional(),
    grantReference: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    serviceAreaIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (v) =>
      !v.startsAt || !v.endsAt || new Date(v.startsAt) <= new Date(v.endsAt),
    { message: 'End date must be after start', path: ['endsAt'] },
  )

type Form = z.infer<typeof schema>

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

export function AdminCampaigns() {
  const { data: campaigns = [], isLoading } = useCampaigns()
  const createCampaign = useCreateCampaign()
  const serviceAreas = useServiceAreas()
  const [open, setOpen] = useState(false)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      grantReference: '',
      startsAt: '',
      endsAt: '',
      serviceAreaIds: [],
    },
  })

  const selectedZoneIds = form.watch('serviceAreaIds') ?? []
  const toggleZone = (id: string) => {
    const current = new Set(form.getValues('serviceAreaIds') ?? [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    form.setValue('serviceAreaIds', Array.from(current), {
      shouldDirty: true,
    })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createCampaign.mutateAsync({
        name: values.name,
        description: values.description?.trim() || undefined,
        grantReference: values.grantReference?.trim() || undefined,
        startsAt: values.startsAt
          ? new Date(values.startsAt).toISOString()
          : undefined,
        endsAt: values.endsAt
          ? new Date(values.endsAt).toISOString()
          : undefined,
        serviceAreaIds: values.serviceAreaIds ?? [],
      })
      toast.success('Campaign created')
      form.reset()
      setOpen(false)
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Campaigns"
        description="Tag shifts with a campaign to roll up grant-friendly reports."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New campaign</DialogTitle>
                <DialogDescription>
                  Give it a name and optional dates. Volunteers can tag their
                  shifts to this campaign on the home screen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="campaign-name">Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="Summer 2026 flyer drop"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="campaign-grant">
                    Grant reference (optional)
                  </Label>
                  <Input
                    id="campaign-grant"
                    placeholder="e.g. City of Denver 2026-1142"
                    {...form.register('grantReference')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="campaign-starts">Starts</Label>
                    <Input
                      id="campaign-starts"
                      type="date"
                      {...form.register('startsAt')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-ends">Ends</Label>
                    <Input
                      id="campaign-ends"
                      type="date"
                      {...form.register('endsAt')}
                    />
                    {form.formState.errors.endsAt && (
                      <p className="mt-1 text-xs text-destructive">
                        {form.formState.errors.endsAt.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="campaign-desc">Description (optional)</Label>
                  <Textarea
                    id="campaign-desc"
                    rows={3}
                    placeholder="What is this campaign for? Appears on the grant report."
                    {...form.register('description')}
                  />
                </div>
                <div>
                  <Label>Zones covered</Label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Pick every zone this campaign should cover. Volunteers will
                    see stops from all selected zones.
                  </p>
                  {serviceAreas.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      No zones defined yet. Add one in setup before scoping a
                      campaign.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {serviceAreas.map((area) => {
                        const checked = selectedZoneIds.includes(area.id)
                        return (
                          <li key={area.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/40">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={checked}
                                onChange={() => toggleZone(area.id)}
                              />
                              <span className="truncate font-medium">
                                {area.name}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={createCampaign.isPending}
                >
                  {createCampaign.isPending ? 'Creating…' : 'Create campaign'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      )}

      {!isLoading && campaigns.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign so you can track man-hours and stops against a specific initiative or grant."
        />
      )}

      {campaigns.length > 0 && (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                to={`/admin/campaigns/${c.id}`}
                className="group block rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold tracking-tight">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(c.startsAt)} → {formatDate(c.endsAt)}
                      {c.grantReference ? ` · ${c.grantReference}` : ''}
                      {c.serviceAreaIds.length > 0
                        ? ` · ${c.serviceAreaIds.length} zone${c.serviceAreaIds.length === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                    {c.status}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {c.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
