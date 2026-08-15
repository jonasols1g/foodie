import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantProvider } from "../../context/RestaurantContext";
import { createMockRestaurantStorage } from "../../test/mocks/createMockRestaurantStorage";
import { usePlaceSearch } from "../../hooks/usePlaceSearch";
import type { PlaceSuggestion, RetrievedPlace } from "../../types/place";
import { AddPlaceSheet } from "./AddPlaceSheet";

// `usePlaceSearch` mockes helt — debounce/fetch-mekanikken er allerede
// dekket av usePlaceSearch.test.ts. Disse testene skal verifisere
// AddPlaceSheet sin egen steg 1 -> steg 2-flyt og skjemahåndtering.
vi.mock("../../hooks/usePlaceSearch", () => ({
  usePlaceSearch: vi.fn(),
}));

const SUGGESTION: PlaceSuggestion = {
  mapboxId: "poi-1",
  name: "Maaemo",
  address: "Dronning Eufemias gate 23, Oslo",
  categories: ["restaurant"],
};

const RETRIEVED_PLACE: RetrievedPlace = {
  mapboxId: "poi-1",
  name: "Maaemo",
  address: "Dronning Eufemias gate 23, Oslo",
  lat: 59.9075,
  lng: 10.7532,
  categories: ["restaurant"],
  websiteUrl: "https://maaemo.no",
};

function mockPlaceSearch(overrides: Partial<ReturnType<typeof usePlaceSearch>> = {}) {
  const value: ReturnType<typeof usePlaceSearch> = {
    suggestions: [],
    isSearching: false,
    search: vi.fn(),
    retrieve: vi.fn().mockResolvedValue(null),
    reset: vi.fn(),
    ...overrides,
  };
  vi.mocked(usePlaceSearch).mockReturnValue(value);
  return value;
}

function renderSheet(
  storage = createMockRestaurantStorage(),
  onClose: () => void = vi.fn(),
) {
  return render(
    <RestaurantProvider storage={storage} userId="user-1">
      <AddPlaceSheet onClose={onClose} />
    </RestaurantProvider>,
  );
}

// Se AddPlaceSheet.tsx — CLOSE_ANIMATION_MS.
const CLOSE_ANIMATION_MS = 240;

describe("AddPlaceSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("kaller search() ved søketekst og går til bekreftelsessteget når et forslag velges", async () => {
    const placeSearch = mockPlaceSearch({
      suggestions: [SUGGESTION],
      retrieve: vi.fn().mockResolvedValue(RETRIEVED_PLACE),
    });
    renderSheet();

    fireEvent.change(screen.getByLabelText("Søk etter restaurant"), {
      target: { value: "Maaemo" },
    });
    expect(placeSearch.search).toHaveBeenCalledWith("Maaemo");

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Maaemo/ }));
      await Promise.resolve();
    });

    expect(placeSearch.retrieve).toHaveBeenCalledWith("poi-1");
    expect(screen.getByText("Bekreft stedet")).toBeInTheDocument();
    // Nettsiden fra Mapbox-metadata er forhåndsutfylt.
    expect(screen.getByLabelText("Nettside")).toHaveValue("https://maaemo.no");
  });

  it("viser 'Ingen steder matchet søket' når søket ikke gir treff", () => {
    mockPlaceSearch({ suggestions: [] });
    renderSheet();

    fireEvent.change(screen.getByLabelText("Søk etter restaurant"), {
      target: { value: "Finnesikke" },
    });

    expect(screen.getByText("Ingen steder matchet søket.")).toBeInTheDocument();
  });

  it("lagrer restauranten med valgt status og trimmede felter, og lukker sheeten", async () => {
    mockPlaceSearch({
      suggestions: [SUGGESTION],
      retrieve: vi.fn().mockResolvedValue(RETRIEVED_PLACE),
    });
    const addMock = vi.fn().mockResolvedValue("new-id");
    const storage = createMockRestaurantStorage({ add: addMock });
    const onClose = vi.fn();
    renderSheet(storage, onClose);

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Maaemo/ }));
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("Notater"), {
      target: { value: "  Bestill trøffelrisotto  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Besøkt" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre restaurant" }));

    expect(addMock).toHaveBeenCalledWith("user-1", {
      name: "Maaemo",
      address: "Dronning Eufemias gate 23, Oslo",
      lat: 59.9075,
      lng: 10.7532,
      mapboxId: "poi-1",
      categories: ["restaurant"],
      websiteUrl: "https://maaemo.no",
      notes: "Bestill trøffelrisotto",
      status: "visited",
      visitedAt: expect.any(String) as string,
      addedAt: expect.any(String) as string,
    });

    act(() => {
      vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("nullstiller nettside/notater/status når man går tilbake til søket", async () => {
    mockPlaceSearch({
      suggestions: [SUGGESTION],
      retrieve: vi.fn().mockResolvedValue(RETRIEVED_PLACE),
    });
    renderSheet();

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Maaemo/ }));
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("Notater"), {
      target: { value: "Et notat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Besøkt" }));

    fireEvent.click(screen.getByRole("button", { name: "Tilbake til søk" }));

    expect(screen.getByText("Legg til restaurant")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Maaemo/ }));
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Notater")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Planlagt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("lukker sheeten uten å legge til noen restaurant når Lukk-knappen trykkes", () => {
    mockPlaceSearch();
    const addMock = vi.fn();
    const storage = createMockRestaurantStorage({ add: addMock });
    const onClose = vi.fn();
    renderSheet(storage, onClose);

    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));

    act(() => {
      vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("lukker sheeten når Escape trykkes", () => {
    mockPlaceSearch();
    const onClose = vi.fn();
    renderSheet(undefined, onClose);

    fireEvent.keyDown(window, { key: "Escape" });

    act(() => {
      vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
