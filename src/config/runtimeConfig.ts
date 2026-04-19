import { APP_CONFIG } from '@/config/app.config'

/** Persisted per-device org + integration settings (never commit real secrets). */
export interface RuntimeOrgConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  googleMapsApiKey: string
  organizationId: string
  volunteerId: string
  /** Server-validated token for volunteer join RPC */
  inviteToken: string
}

export const EMPTY_RUNTIME_CONFIG: RuntimeOrgConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  googleMapsApiKey: '',
  organizationId: '',
  volunteerId: '',
  inviteToken: '',
}

export interface InvitePayloadV1 {
  v: 1
  supabaseUrl: string
  supabaseAnonKey: string
  organizationId: string
  inviteToken: string
  googleMapsApiKey?: string
}

export function encodeInviteHash(payload: InvitePayloadV1): string {
  const body = JSON.stringify({ ...payload, v: 1 })
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(utf8ToBinaryString(body))
      : Buffer.from(body, 'utf-8').toString('base64')
  return `mg-invite-v1.${b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export function decodeInviteHash(hash: string): InvitePayloadV1 | null {
  const trimmed = hash.replace(/^#/, '').trim()
  if (!trimmed.startsWith('mg-invite-v1.')) return null
  const raw = trimmed.slice('mg-invite-v1.'.length)
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (padded.length % 4)) % 4
    const b64 = padded + '='.repeat(padLen)
    const json =
      typeof atob !== 'undefined'
        ? binaryStringToUtf8(atob(b64))
        : Buffer.from(b64, 'base64').toString('utf-8')
    const parsed = JSON.parse(json) as InvitePayloadV1
    if (parsed.v !== 1) return null
    if (
      !parsed.supabaseUrl ||
      !parsed.supabaseAnonKey ||
      !parsed.organizationId ||
      !parsed.inviteToken
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function utf8ToBinaryString(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return bin
}

function binaryStringToUtf8(bin: string): string {
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export type EffectiveRuntimeConfig = RuntimeOrgConfig

export function mergeRuntimeWithEnv(
  stored: RuntimeOrgConfig,
): EffectiveRuntimeConfig {
  return {
    supabaseUrl:
      stored.supabaseUrl ||
      String(import.meta.env.VITE_SUPABASE_URL ?? '') ||
      '',
    supabaseAnonKey:
      stored.supabaseAnonKey ||
      String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '') ||
      '',
    googleMapsApiKey:
      stored.googleMapsApiKey ||
      String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '') ||
      '',
    organizationId: stored.organizationId,
    volunteerId: stored.volunteerId,
    inviteToken: stored.inviteToken,
  }
}

export function isSupabaseConfigured(cfg: EffectiveRuntimeConfig): boolean {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey)
}

export function isGoogleMapsConfigured(cfg: EffectiveRuntimeConfig): boolean {
  return Boolean(cfg.googleMapsApiKey)
}

export type SupabaseConnectionTestResult =
  | { ok: true }
  | {
      ok: false
      reason: 'schema_missing' | 'auth' | 'network' | 'other'
      message: string
    }

export async function testSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<SupabaseConnectionTestResult> {
  if (!url || !anonKey) {
    return {
      ok: false,
      reason: 'other',
      message: 'URL and anon key are required.',
    }
  }
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await supabase.from('organizations').select('id').limit(1)
    if (!error || error.code === 'PGRST116') {
      return { ok: true }
    }

    const msg = error.message ?? ''
    const code = error.code ?? ''

    if (
      code === 'PGRST205' ||
      /schema cache/i.test(msg) ||
      /could not find the table/i.test(msg) ||
      /does not exist/i.test(msg) ||
      /relation .* does not exist/i.test(msg)
    ) {
      return {
        ok: false,
        reason: 'schema_missing',
        message:
          'Connected, but the MissionGrid tables are missing. Run docs/supabase/schema.sql in the SQL editor.',
      }
    }

    if (/JWT|Invalid API key|apikey/i.test(msg)) {
      return {
        ok: false,
        reason: 'auth',
        message: 'Invalid anon key or URL.',
      }
    }

    return { ok: false, reason: 'other', message: msg }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const isNetwork = /fetch|network|failed to fetch/i.test(msg)
    return {
      ok: false,
      reason: isNetwork ? 'network' : 'other',
      message: msg,
    }
  }
}

export async function testGoogleMapsKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!apiKey) return { ok: false, message: 'API key is required.' }
  try {
    const { Loader } = await import('@googlemaps/js-api-loader')
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['maps'],
    })
    await loader.load()
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

export function runtimeStorageKey(): string {
  return `${APP_CONFIG.storageKey}_runtime_v1`
}
