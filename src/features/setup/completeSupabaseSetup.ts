import { createClient } from '@supabase/supabase-js'
import type { CsvLocationRow } from '@/lib/csv'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function completeSupabaseOrgSetup(input: {
  supabaseUrl: string
  supabaseAnonKey: string
  orgName: string
  orgSlug: string
  adminEmail: string
  adminPassword: string
  serviceAreaName: string
  centerLat: number
  centerLng: number
  radiusMeters: number
  csvRows: CsvLocationRow[]
}): Promise<{
  organizationId: string
  inviteToken: string
  volunteerId: string
}> {
  const supabase = createClient(input.supabaseUrl, input.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: input.orgName, slug: input.orgSlug })
    .select('id')
    .single()
  if (orgErr) throw orgErr

  const inviteToken = `inv_${crypto.randomUUID().replace(/-/g, '')}`
  const { error: invErr } = await supabase.from('org_invites').insert({
    organization_id: org.id,
    token: inviteToken,
  })
  if (invErr) throw invErr

  const { data: area, error: areaErr } = await supabase
    .from('service_areas')
    .insert({
      organization_id: org.id,
      name: input.serviceAreaName,
      center_lat: input.centerLat,
      center_lng: input.centerLng,
      radius_meters: input.radiusMeters,
    })
    .select('id')
    .single()
  if (areaErr) throw areaErr

  const { error: cfgErr } = await supabase.from('app_configuration').upsert(
    {
      organization_id: org.id,
      is_configured: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  )
  if (cfgErr) throw cfgErr

  const { data: signupData, error: signErr } = await supabase.auth.signUp({
    email: input.adminEmail,
    password: input.adminPassword,
  })
  if (signErr) throw signErr
  const uid = signupData.user?.id
  if (!uid) {
    throw new Error(
      'No user returned from sign up. If email confirmation is required, confirm your email and run setup again.',
    )
  }

  const { data: vol, error: volErr } = await supabase
    .from('volunteers')
    .insert({
      organization_id: org.id,
      display_name: 'Admin',
      email: input.adminEmail.toLowerCase(),
      is_admin: true,
      auth_user_id: uid,
    })
    .select('id')
    .single()
  if (volErr) throw volErr

  const areaId = area.id
  if (input.csvRows.length > 0) {
    for (const part of chunk(input.csvRows, 500)) {
      const inserts = part.map((r) => ({
        organization_id: org.id,
        service_area_id: areaId,
        name: r.name,
        address: r.address,
        city: r.city ?? null,
        state: r.state ?? null,
        postal_code: r.postalCode ?? null,
        notes: r.notes ?? null,
        lat: r.lat,
        lng: r.lng,
        category: r.category ?? null,
        status: 'available' as const,
        source: 'preloaded' as const,
      }))
      const { error: locErr } = await supabase.from('locations').insert(inserts)
      if (locErr) throw locErr
    }
  }

  return {
    organizationId: org.id,
    inviteToken,
    volunteerId: vol.id,
  }
}
