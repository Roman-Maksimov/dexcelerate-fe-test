/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_DATA_UPDATE_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
