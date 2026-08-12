import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defaultExclude, defineConfig, type Plugin } from "vitest/config";

// Content-Security-Policy som <meta http-equiv>, injisert kun ved build
// (GitHub Pages støtter ikke egendefinerte HTTP-headere). `apply: "build"`
// sikrer at dette ikke kjører i dev-modus, der Vites dev-server injiserer
// CSS via inline <style>-tagger for HMR (live-reload) — noe
// `style-src 'self'` uten `unsafe-inline` ville blokkert.
//
// connect-src/img-src inkluderer Firebase (Firestore + Anonymous Auth) og
// Mapbox (kart-styles/tiles + Search Box API). worker-src 'blob:' trengs
// fordi mapbox-gl bruker web workers lastet fra blob-URL-er for
// tile-parsing.
function cspMetaTagPlugin(): Plugin {
  return {
    name: "csp-meta-tag",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content:
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://api.mapbox.com; worker-src 'self' blob:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.mapbox.com https://events.mapbox.com; base-uri 'self'; form-action 'self'",
          },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "/foodlist/",
  plugins: [react(), tailwindcss(), cspMetaTagPlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.ts"],
    // Playwright-spec-ene i e2e/ matcher også `*.spec.ts` — uten denne
    // ekskluderingen forsøker Vitest å kjøre dem og feiler kryptisk.
    exclude: [...defaultExclude, "e2e/**"],
  },
});
