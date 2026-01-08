/// <reference types="node" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STRIPE_PRICE_FOUNDER?: string;
  readonly VITE_STRIPE_PRICE_REGULAR?: string;
  // Add other env vars here as needed
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}