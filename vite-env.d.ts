/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_LEGACY_AI_PROXY?: string;
  readonly VITE_ALLOW_LOCAL_PREMIUM_FALLBACK?: string;
  readonly VITE_APPLE_IAP_MONTHLY_PRODUCT_ID?: string;
  readonly VITE_APPLE_IAP_LIFETIME_PRODUCT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
