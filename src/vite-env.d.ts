/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_SUPABASE?: string
  readonly VITE_USE_GOOGLE_MAPS?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
