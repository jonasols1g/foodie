import type { Page } from "@playwright/test";

/**
 * Egne, lokale typer fremfor å importere fra `src/types/place.ts` — e2e/
 * hører til et eget TS-prosjekt (tsconfig.node.json), og krysser man
 * prosjektgrensen mister typesjekkeren treffsikker typeinferens for den
 * importerte modulen (samme prinsipp som firestoreStub.ts sin egen lokale
 * `FirestoreValue`-type, fremfor å importere fra src/).
 */
interface StubPlace {
  mapboxId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  websiteUrl: string | null;
}

/**
 * Stubbing av Mapbox for E2E — både kart-styles (GL JS) og Search Box
 * (suggest/retrieve). Ingen ekte nettverkskall mot `api.mapbox.com`, og
 * ingen ekte Mapbox-kvote forbrukes av testkjøringer.
 *
 * Kart-stilen stubbes med et minimalt, men gyldig Mapbox Style Spec-objekt
 * (tomme `sources`/`layers`) — akkurat nok til at `mapbox-gl` initialiserer
 * kartet uten å kaste, uten at det trigger noen tile-forespørsler i det hele
 * tatt (siden det ikke finnes noen kilder å hente fliser fra). Markers/
 * Popups fra react-map-gl er vanlige DOM-overlegg posisjonert via CSS, og
 * rendres uavhengig av om selve kartbunnen har synlige fliser.
 */
export async function registerMapboxStyleStub(page: Page): Promise<void> {
  await page.route("**/api.mapbox.com/styles/v1/**", async (route) => {
    await route.fulfill({
      json: {
        version: 8,
        name: "e2e-stub",
        sources: {},
        layers: [],
        glyphs: "https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf",
      },
    });
  });
}

function suggestionToApiShape(suggestion: Omit<StubPlace, "lat" | "lng" | "websiteUrl">) {
  return {
    mapbox_id: suggestion.mapboxId,
    name: suggestion.name,
    full_address: suggestion.address,
    poi_category: suggestion.categories,
  };
}

function placeToApiShape(place: StubPlace) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [place.lng, place.lat] },
        properties: {
          mapbox_id: place.mapboxId,
          name: place.name,
          full_address: place.address,
          poi_category: place.categories,
          metadata: place.websiteUrl ? { website: place.websiteUrl } : {},
        },
      },
    ],
  };
}

/**
 * Stubber Mapbox Search Box `suggest`/`retrieve`-endepunktene med ett fast
 * forslag/sted, uavhengig av søketekst — tilstrekkelig for E2E-flyten «søk
 * -> velg forslag -> legg til».
 */
export async function registerMapboxSearchStub(
  page: Page,
  place: StubPlace,
): Promise<void> {
  const suggestion = {
    mapboxId: place.mapboxId,
    name: place.name,
    address: place.address,
    categories: place.categories,
  };

  await page.route(
    "**/api.mapbox.com/search/searchbox/v1/suggest**",
    async (route) => {
      await route.fulfill({
        json: { suggestions: [suggestionToApiShape(suggestion)] },
      });
    },
  );

  await page.route(
    "**/api.mapbox.com/search/searchbox/v1/retrieve/**",
    async (route) => {
      await route.fulfill({ json: placeToApiShape(place) });
    },
  );
}
