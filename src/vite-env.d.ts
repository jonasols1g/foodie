/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Firebase-prosjektkonfigurasjon. Brukes av
   * `src/services/auth/firebaseClient.ts`.
   */
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Mapbox public access token — kart (GL JS) + Search Box API. */
  readonly VITE_MAPBOX_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
