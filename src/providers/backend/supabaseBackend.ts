import type { BackendProvider } from '@/providers/backend/BackendProvider'

/**
 * Phase 2: wire Supabase client, RLS policies, and realtime channels here.
 * Keep the same `BackendProvider` surface so UI and data hooks stay unchanged.
 */
export const supabaseBackend: BackendProvider = {
  async getAppConfiguration() {
    throw new Error('supabaseBackend.getAppConfiguration: not implemented (Phase 2)')
  },
  async updateAppConfiguration() {
    throw new Error(
      'supabaseBackend.updateAppConfiguration: not implemented (Phase 2)',
    )
  },
  async getOrganization() {
    throw new Error('supabaseBackend.getOrganization: not implemented (Phase 2)')
  },
  async listVolunteers() {
    throw new Error('supabaseBackend.listVolunteers: not implemented (Phase 2)')
  },
  async listLocations() {
    throw new Error('supabaseBackend.listLocations: not implemented (Phase 2)')
  },
  async claimLocation() {
    throw new Error('supabaseBackend.claimLocation: not implemented (Phase 2)')
  },
  async completeLocation() {
    throw new Error('supabaseBackend.completeLocation: not implemented (Phase 2)')
  },
  async skipLocation() {
    throw new Error('supabaseBackend.skipLocation: not implemented (Phase 2)')
  },
  async importLocationsFromCsv() {
    throw new Error(
      'supabaseBackend.importLocationsFromCsv: not implemented (Phase 2)',
    )
  },
  async getProgress() {
    throw new Error('supabaseBackend.getProgress: not implemented (Phase 2)')
  },
  subscribeLocations() {
    throw new Error('supabaseBackend.subscribeLocations: not implemented (Phase 2)')
  },
}
