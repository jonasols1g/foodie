import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlaceSearch } from "./usePlaceSearch";

const SUGGEST_RESPONSE = {
  suggestions: [
    {
      mapbox_id: "poi-1",
      name: "Maaemo",
      full_address: "Dronning Eufemias gate 23, Oslo",
      poi_category: ["restaurant"],
    },
  ],
};

const RETRIEVE_RESPONSE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [10.7532, 59.9075] },
      properties: {
        mapbox_id: "poi-1",
        name: "Maaemo",
        full_address: "Dronning Eufemias gate 23, Oslo",
        poi_category: ["restaurant"],
        metadata: { website: "https://maaemo.no" },
      },
    },
  ],
};

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

function requestUrl(input: URL | RequestInfo): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

// Debounce i usePlaceSearch er 350ms — vent reelt forbi det i stedet for å
// kombinere fake timers med ekte fetch-promiser (samspillet mellom dem er
// upålitelig med Testing Librarys `waitFor`, som selv poller via timere).
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("usePlaceSearch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("kaller ikke suggest-endepunktet før query har minst 3 tegn", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => jsonResponse(SUGGEST_RESPONSE));
    const { result } = renderHook(() => usePlaceSearch());

    act(() => {
      result.current.search("ma");
    });
    await sleep(500);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("debouncer suggest-kallet og returnerer parsede forslag", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => jsonResponse(SUGGEST_RESPONSE));
    const { result } = renderHook(() => usePlaceSearch());

    act(() => {
      result.current.search("maa");
    });
    // Ikke kalt ennå — debounce har ikke rukket å utløpe.
    expect(fetchSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const calledUrl = new URL(fetchSpy.mock.calls[0]?.[0] as string);
    expect(calledUrl.pathname).toContain("/suggest");
    expect(calledUrl.searchParams.get("q")).toBe("maa");

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });
    expect(result.current.suggestions[0]?.name).toBe("Maaemo");
  }, 10000);

  it("gjenbruker samme sessionToken for suggest og det avsluttende retrieve-kallet, og genererer en ny etterpå", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input: URL | RequestInfo) => {
        const url = requestUrl(input);
        if (url.includes("/suggest")) {
          return jsonResponse(SUGGEST_RESPONSE);
        }
        return jsonResponse(RETRIEVE_RESPONSE);
      });
    const { result } = renderHook(() => usePlaceSearch());

    act(() => {
      result.current.search("maa");
    });
    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    const suggestUrl = new URL(fetchSpy.mock.calls[0]?.[0] as string);
    const sessionTokenDuringSuggest = suggestUrl.searchParams.get("session_token");

    let retrieved;
    await act(async () => {
      retrieved = await result.current.retrieve("poi-1");
    });

    const retrieveUrl = new URL(
      fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]?.[0] as string,
    );
    expect(retrieveUrl.searchParams.get("session_token")).toBe(
      sessionTokenDuringSuggest,
    );
    expect(retrieved).toEqual({
      mapboxId: "poi-1",
      name: "Maaemo",
      address: "Dronning Eufemias gate 23, Oslo",
      lat: 59.9075,
      lng: 10.7532,
      categories: ["restaurant"],
      websiteUrl: "https://maaemo.no",
    });

    // Forslagslisten nullstilles når interaksjonen avsluttes.
    expect(result.current.suggestions).toHaveLength(0);

    // Neste søk skal bruke en NY sessionToken (interaksjonen er avsluttet).
    act(() => {
      result.current.search("ny query");
    });
    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
    const nextSuggestUrl = new URL(
      fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]?.[0] as string,
    );
    expect(nextSuggestUrl.searchParams.get("session_token")).not.toBe(
      sessionTokenDuringSuggest,
    );
  }, 10000);

  it("tømmer forslag når query blir for kort igjen", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(SUGGEST_RESPONSE));
    const { result } = renderHook(() => usePlaceSearch());

    act(() => {
      result.current.search("maa");
    });
    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    act(() => {
      result.current.search("m");
    });
    expect(result.current.suggestions).toHaveLength(0);
  }, 10000);
});
