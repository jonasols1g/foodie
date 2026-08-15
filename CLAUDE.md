# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Foodie — a personal, single-user, mobile-only web app for tracking restaurants ("planned" vs "visited"), shown as a list and on a map. No login UI: an anonymous Firebase session acts as the device identity. React 19 + TypeScript + Vite + Tailwind CSS v4 + Mapbox GL JS (react-map-gl) + Firestore.

## Commands

```bash
npm run dev              # Vite dev server
npm run build             # tsc -b && vite build && cp dist/index.html dist/404.html
npm run lint               # eslint .
npm run format             # prettier --write .
npm test                    # vitest run (unit/component tests)
npm run test:watch          # vitest (watch mode)
npm run test:e2e            # playwright test — builds and runs against the PRODUCTION build (vite preview), not the dev server
```

Single test:
```bash
npx vitest run src/hooks/usePlaceSearch.test.ts
npx playwright test e2e/smoke.spec.ts --project=mobile-chromium
```

Requires `.env.local` (see `.env.example`) with `VITE_FIREBASE_*` and `VITE_MAPBOX_TOKEN`. `firebaseClient.ts` calls `getAuth()` synchronously at module load and throws on an empty/invalid config — the app cannot mount without real Firebase values, even in tests that never hit real Firebase (e2e stubs the network, but the SDK still needs a config to initialize with).

### Build-verification gotcha

The root `tsconfig.json` is references-only (`"files": []`) — running bare `tsc --noEmit` from the repo root silently type-checks **nothing** and always reports success. It does not reflect what CI/the real build checks. To actually validate types, run `npm run build` (which invokes `tsc -b`, compiling via `tsconfig.app.json`) — this has `strict: true` and `noUncheckedIndexedAccess: true`, which catches things a plain `tsc --noEmit` at root won't.

## Architecture

**Storage abstraction.** `RestaurantStorage` (`services/storage/RestaurantRemoteStorage.ts`) is the interface the rest of the app codes against; `FirestoreRestaurantStorage` is the only implementation, built on `firebase/firestore/lite` (not the full `firebase/firestore` SDK) since the app never uses realtime listeners (`onSnapshot`) — only one-shot `getDocs`/`addDoc`/`updateDoc`/`deleteDoc`. The lite SDK hits Firestore's REST API directly (one `fetch` per operation), which is what makes it practical to stub in Playwright (`e2e/fixtures/firestoreStub.ts`) instead of dealing with the full SDK's stateful WebChannel protocol. The composition root wiring this up is `services/storage/index.ts`.

**State: two contexts, composed in `App.tsx`.**
- `AuthContext` establishes the anonymous Firebase session (`signInAnonymously`) — this *is* the app's device identity, no login screen. `userId` is `null` until ready.
- `RestaurantContext` holds the restaurant list in local React state, synced with Firestore via the storage interface, with **optimistic updates**: every mutation (`addRestaurant`, `setStatus`, `updateRestaurant`, `removeRestaurant`) updates local state immediately and rolls the whole array back to its pre-mutation snapshot if the Firestore write fails (surfaced via `saveError`). New restaurants get a temporary `temp-{uuid}` id, swapped for Firestore's real id once `addDoc` resolves.
- `App.tsx` bridges the two via a small wrapper component (`AuthenticatedRestaurantProvider`) since `useAuth()` can only be called inside `AuthProvider`, which sits outside `RestaurantProvider` in the tree.

**Map (`components/map/RestaurantMap.tsx`).** Selection (`selectedId`) is shared between the list and the map — selecting a restaurant in either place opens the same popup and re-centers the map. Two independent restaurant sources exist on this component: the `restaurants` prop is already filtered by `RestaurantsPage` (for pins/list/fitBounds), while `useRestaurants()` is called directly inside `RestaurantMap` for the *full* unfiltered dataset (needed for map-click duplicate detection so a filtered-out restaurant isn't offered as "add again").

Two ways to add a restaurant, both going through Mapbox's Search Box API (`hooks/usePlaceSearch.ts`):
1. Manual search (`AddPlaceSheet.tsx`) — debounced `suggest` + `retrieve`, session-tokened per Mapbox's billing model.
2. Tapping a native Mapbox POI icon on the map itself (`interactiveLayerIds={["poi-label"]}` on `<Map>`) — one-shot `retrievePlaceNearPoi()` (suggest with `proximity` + retrieve, its own session token, not the interactive search session). The map's `poi-label` layer is filtered to `class == food_and_drink` only (`restrictPoiLabelsToFoodAndDrink`) so every clickable POI is a plausible restaurant/bar/cafe.

**CSP.** Injected as a `<meta http-equiv>` tag at build time only (`vite.config.ts`, `apply: "build"`) — GitHub Pages can't set custom HTTP headers, and dev mode needs inline `<style>` for Vite's HMR which the CSP would otherwise block.

**Testing.**
- Vitest (jsdom) for unit/component tests. `test.globals` is off, so `afterEach(cleanup)` is wired explicitly in `src/test/setupTests.ts` — Testing Library's own auto-cleanup only fires if it finds a *global* `afterEach`. `src/test/mocks/createMockRestaurantStorage.ts` is the standard test double for `RestaurantStorage`.
- Playwright e2e (`e2e/`) always runs against the production build (`vite preview`), never the dev server — `base: '/foodie/'`, the router `basename`, and the `404.html` SPA fallback only exist in the built output. Tests target a single mobile viewport project (`mobile-chromium`, Pixel 7) since the app is mobile-only by design. Firebase Auth, Firestore, and all Mapbox network traffic are stubbed via `page.route` (`e2e/fixtures/`) — no e2e test ever hits a real external service.

**CI/CD (`.github/workflows/ci.yml`).** Three jobs on every push to `main`: lint+unit-test+`npm audit`+build, then Playwright e2e, then (only after both succeed) deploy to GitHub Pages. A failing `npm run build` silently means nothing gets deployed — check `gh run list` after pushing to `main` if a change should be live and isn't.

## Conventions

- Code comments and commit messages are in Norwegian; this file and identifiers stay in their original form.
- The app is mobile-only by design (`max-w-md mx-auto` in `App.tsx`) — do not add `md:`/`lg:` responsive variants.
- The design reference lives in `design/README.md` (a detailed handoff spec from an HTML prototype). Only the color variant labeled `5a` ("Krem & paprika") is implemented; everything else in the prototype file is a discarded alternative.
