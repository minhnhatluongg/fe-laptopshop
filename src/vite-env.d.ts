/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SITE_NAME: string;
  readonly VITE_DEFAULT_THEME: "light" | "dark";
  readonly VITE_TOKEN_STORAGE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
