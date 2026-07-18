/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_API_BASE?: string;
  readonly VITE_AUTH_MODE?: 'local' | 'keycloak';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
