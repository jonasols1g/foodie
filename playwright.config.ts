import { defineConfig, devices } from "@playwright/test";

// E2E kjører alltid mot produksjonsbygget (vite preview), aldri dev-serveren:
// `base: '/foodlist/'`, `basename` og 404.html-fallbacken finnes kun i bygget app.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",
  use: {
    baseURL: "http://localhost:4173/foodlist/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173/foodlist/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Kartet/søket krever en (ikke-tom) VITE_MAPBOX_TOKEN for å bygge inn i
    // bundelen (se RestaurantMap.tsx), men selve verdien treffer aldri et
    // ekte Mapbox-endepunkt — all trafikk stubbes (se
    // e2e/fixtures/mapboxStub.ts). Faller tilbake til en åpenbart falsk
    // placeholder lokalt; CI kan sette en ekte `VITE_MAPBOX_TOKEN`-secret om
    // ønskelig, men trenger det strengt tatt ikke siden trafikken stubbes.
    env: {
      // `||` (ikke `??`) med hensikt: en tom secret i CI (ikke satt ennå)
      // gir en tom streng, ikke `undefined` — som `??` ikke ville falt
      // tilbake fra.
      VITE_MAPBOX_TOKEN: process.env.VITE_MAPBOX_TOKEN || "pk.e2e-fake-token",
    },
  },
});
