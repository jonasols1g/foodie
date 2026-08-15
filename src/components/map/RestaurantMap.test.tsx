import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantProvider } from "../../context/RestaurantContext";
import { createMockRestaurantStorage } from "../../test/mocks/createMockRestaurantStorage";
import { createRestaurant } from "../../test/fixtures/restaurant.fixtures";
import { retrievePlaceNearPoi } from "../../hooks/usePlaceSearch";
import type { RetrievedPlace } from "../../types/place";
import {
  extractPoiFeatureInfo,
  findExistingRestaurant,
  RestaurantMap,
  type PoiClickFeature,
} from "./RestaurantMap";

// Frikoblet fra faktiske miljøvariabler (se services/map/mapboxConfig.ts) —
// testene skal ikke avhenge av at et gyldig VITE_MAPBOX_TOKEN finnes i
// miljøet de kjører i (lokalt vs. CI).
vi.mock("../../services/map/mapboxConfig", () => ({
  MAPBOX_TOKEN: "test-token",
  MAPBOX_STYLE_URL: "mapbox://styles/test",
  DEFAULT_MAP_CENTER: { lat: 59.9139, lng: 10.7522 },
  DEFAULT_MAP_ZOOM: 11,
}));

vi.mock("../../hooks/usePlaceSearch", () => ({
  retrievePlaceNearPoi: vi.fn(),
}));

// Minimal test-dobbel for `react-map-gl/mapbox` — et ekte kart kan ikke
// initialiseres i jsdom (ingen WebGL). Fanger `onClick`-handleren slik at
// testene kan trigge den direkte med syntetiske klikk-eventer, akkurat som
// et ekte POI-klikk på `poi-label`-laget ville gjort.
let capturedOnClick: ((event: { features?: unknown }) => void) | undefined;

vi.mock("react-map-gl/mapbox", () => ({
  default: (props: { onClick?: (event: { features?: unknown }) => void; children?: ReactNode }) => {
    capturedOnClick = props.onClick;
    return <div data-testid="mock-map">{props.children}</div>;
  },
  Popup: (props: { children?: ReactNode }) => (
    <div data-testid="mock-popup">{props.children}</div>
  ),
  Marker: (props: { children?: ReactNode }) => (
    <div data-testid="mock-marker">{props.children}</div>
  ),
}));

function poiClickEvent(name: string, lng: number, lat: number): { features: PoiClickFeature[] } {
  return {
    features: [
      {
        layer: { id: "poi-label" },
        properties: { name },
        geometry: { type: "Point", coordinates: [lng, lat] },
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function placeFixture(overrides: Partial<RetrievedPlace> = {}): RetrievedPlace {
  return {
    mapboxId: "poi-x",
    name: "Sted",
    address: "En adresse",
    lat: 60,
    lng: 10,
    categories: [],
    websiteUrl: null,
    ...overrides,
  };
}

function renderMap(
  storage = createMockRestaurantStorage(),
  overrides: Partial<{ onSelectRestaurant: (id: string | null) => void }> = {},
) {
  return render(
    <RestaurantProvider storage={storage} userId="user-1">
      <RestaurantMap
        restaurants={[]}
        selectedId={null}
        onSelectRestaurant={overrides.onSelectRestaurant ?? vi.fn()}
        onStatusChange={vi.fn()}
        expanded={false}
        onExpandedChange={vi.fn()}
      />
    </RestaurantProvider>,
  );
}

describe("findExistingRestaurant", () => {
  const restaurant = createRestaurant({ name: "Maaemo", lat: 59.9075, lng: 10.7532 });

  it("finner en restaurant med likt navn (case-insensitive) innenfor posisjonstoleransen", () => {
    expect(findExistingRestaurant([restaurant], "maaemo", 10.7532, 59.9075)).toBe(
      restaurant,
    );
  });

  it("returnerer null når navnet ikke matcher", () => {
    expect(findExistingRestaurant([restaurant], "Et annet sted", 10.7532, 59.9075)).toBeNull();
  });

  it("returnerer null når posisjonen er utenfor toleransen, selv med likt navn", () => {
    expect(findExistingRestaurant([restaurant], "Maaemo", 10.9, 60.2)).toBeNull();
  });
});

describe("extractPoiFeatureInfo", () => {
  it("plukker ut navn og posisjon fra et gyldig Point-feature", () => {
    expect(
      extractPoiFeatureInfo({
        properties: { name: "Maaemo" },
        geometry: { type: "Point", coordinates: [10.7532, 59.9075] },
      }),
    ).toEqual({ name: "Maaemo", lng: 10.7532, lat: 59.9075 });
  });

  it("returnerer null når det ikke finnes noe feature", () => {
    expect(extractPoiFeatureInfo(undefined)).toBeNull();
  });

  it("returnerer null når geometrien ikke er et Point", () => {
    expect(
      extractPoiFeatureInfo({
        properties: { name: "Maaemo" },
        geometry: { type: "Polygon", coordinates: [] },
      }),
    ).toBeNull();
  });

  it("returnerer null når navnet mangler eller er tomt", () => {
    expect(
      extractPoiFeatureInfo({
        properties: {},
        geometry: { type: "Point", coordinates: [10.7532, 59.9075] },
      }),
    ).toBeNull();
    expect(
      extractPoiFeatureInfo({
        properties: { name: "   " },
        geometry: { type: "Point", coordinates: [10.7532, 59.9075] },
      }),
    ).toBeNull();
  });
});

describe("RestaurantMap — POI-klikk", () => {
  beforeEach(() => {
    capturedOnClick = undefined;
    vi.mocked(retrievePlaceNearPoi).mockReset();
  });

  it("velger en eksisterende restaurant i stedet for å tilby å legge den til på nytt", async () => {
    const existing = createRestaurant({
      id: "r1",
      name: "Maaemo",
      lat: 59.9075,
      lng: 10.7532,
    });
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([existing]),
    });
    const onSelectRestaurant = vi.fn();

    renderMap(storage, { onSelectRestaurant });

    expect(capturedOnClick).toBeDefined();

    // Vent til `allRestaurants` faktisk er hentet fra (mock-)storage før
    // klikket trigges — ellers er datasettet fortsatt tomt og duplikatsjekken
    // finner ingenting å matche mot.
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      capturedOnClick?.(poiClickEvent("Maaemo", 10.7532, 59.9075));
    });

    expect(onSelectRestaurant).toHaveBeenCalledWith("r1");
    expect(retrievePlaceNearPoi).not.toHaveBeenCalled();
  });

  it("forkaster et forsinket oppslagssvar fra et eldre POI-klikk (race-guard via pendingPoi.key)", async () => {
    const responseForA = deferred<RetrievedPlace | null>();
    const responseForB = deferred<RetrievedPlace | null>();
    vi.mocked(retrievePlaceNearPoi)
      .mockReturnValueOnce(responseForA.promise)
      .mockReturnValueOnce(responseForB.promise);

    renderMap();

    expect(capturedOnClick).toBeDefined();

    act(() => {
      capturedOnClick?.(poiClickEvent("POI A", 10, 60));
    });
    act(() => {
      capturedOnClick?.(poiClickEvent("POI B", 11, 61));
    });

    expect(screen.getByText("POI B")).toBeInTheDocument();

    // Det forsinkede svaret for det FØRSTE (nå forlatte) klikket kommer
    // tilbake etter at brukeren allerede har klikket et nytt POI — skal
    // forkastes i stedet for å overskrive popupen for POI B.
    await act(async () => {
      responseForA.resolve(placeFixture({ name: "POI A", address: "Adresse A" }));
      await Promise.resolve();
    });

    expect(screen.getByText("POI B")).toBeInTheDocument();
    expect(screen.getByText("Henter informasjon …")).toBeInTheDocument();
    expect(screen.queryByText("Adresse A")).not.toBeInTheDocument();

    await act(async () => {
      responseForB.resolve(placeFixture({ name: "POI B", address: "Adresse B" }));
      await Promise.resolve();
    });

    expect(screen.getByText("Adresse B")).toBeInTheDocument();
  });
});
