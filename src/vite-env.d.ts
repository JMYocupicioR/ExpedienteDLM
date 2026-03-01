/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_HCAPTCHA_SITE_KEY: string
  readonly VITE_DEEPSEEK_API_KEY: string
  readonly VITE_DEEPSEEK_API_URL: string
  /** Base URL of the Pacientes app (e.g. https://pacientes.yourapp.com) for "Ver perfil público" link */
  readonly VITE_PACIENTES_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}