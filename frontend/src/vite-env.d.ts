/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_LOGGING: string
  readonly VITE_ASSET_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
