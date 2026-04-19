import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const clients = new Map<string, SupabaseClient>()

export function requireSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required')
  }
  const key = `${url}::${anonKey}`
  const existing = clients.get(key)
  if (existing) return existing
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  clients.set(key, client)
  return client
}

export function clearSupabaseClientCache() {
  clients.clear()
}
