/**
 * MissionGrid embed helper (stub).
 *
 * This module keeps the path to WordPress / iframe embedding straightforward.
 * Today it exports a tiny mount helper that renders the full app into an
 * arbitrary DOM node, plus a helper for reading configuration from URL params
 * so the host page can pre-configure the app without editing code.
 *
 * Example in a WordPress shortcode or HTML block:
 *
 *   <div id="missiongrid"></div>
 *   <script type="module">
 *     import { mountMissionGrid } from '/missiongrid/embed.js'
 *     mountMissionGrid(document.getElementById('missiongrid'), {
 *       supabaseUrl: 'https://xyz.supabase.co',
 *       supabaseAnonKey: '...',
 *       organizationId: 'org_abc',
 *     })
 *   </script>
 *
 * NOTE: this phase does not ship a standalone UMD build. `mountMissionGrid`
 * is only safe to call inside the SPA bundle. A dedicated embed build is
 * tracked as a Phase 3 follow-up.
 */
import { createRoot, type Root } from 'react-dom/client'
import App from '@/App'
import type { RuntimeOrgConfig } from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const mountedRoots = new WeakMap<Element, Root>()

export interface EmbedOptions extends Partial<RuntimeOrgConfig> {
  /** When true, honor `start_url` query params like `?org=...&supabaseUrl=...`. */
  readUrlParams?: boolean
}

export function applyEmbedConfig(options: EmbedOptions) {
  const params = options.readUrlParams
    ? new URLSearchParams(window.location.search)
    : null
  const patch: Partial<RuntimeOrgConfig> = {
    supabaseUrl:
      options.supabaseUrl ?? params?.get('supabaseUrl') ?? undefined,
    supabaseAnonKey:
      options.supabaseAnonKey ?? params?.get('supabaseAnonKey') ?? undefined,
    googleMapsApiKey:
      options.googleMapsApiKey ??
      params?.get('googleMapsApiKey') ??
      undefined,
    organizationId:
      options.organizationId ?? params?.get('org') ?? undefined,
    inviteToken:
      options.inviteToken ?? params?.get('inviteToken') ?? undefined,
  }
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(
      ([, v]) => typeof v === 'string' && v.length > 0,
    ),
  ) as Partial<RuntimeOrgConfig>
  if (Object.keys(cleaned).length > 0) {
    useRuntimeConfigStore.getState().patch(cleaned)
  }
}

export function mountMissionGrid(target: Element, options: EmbedOptions = {}) {
  applyEmbedConfig(options)
  const existing = mountedRoots.get(target)
  if (existing) {
    existing.render(<App />)
    return existing
  }
  const root = createRoot(target)
  root.render(<App />)
  mountedRoots.set(target, root)
  return root
}

export function unmountMissionGrid(target: Element) {
  const existing = mountedRoots.get(target)
  if (existing) {
    existing.unmount()
    mountedRoots.delete(target)
  }
}
