import { useCallback, useEffect, useRef, useState } from "react";
import { MAPBOX_TOKEN } from "../services/map/mapboxConfig";
import type { PlaceSuggestion, RetrievedPlace } from "../types/place";

const SEARCH_BOX_URL = "https://api.mapbox.com/search/searchbox/v1";
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function parseSuggestions(data: unknown): PlaceSuggestion[] {
  if (typeof data !== "object" || data === null || !("suggestions" in data)) {
    return [];
  }
  const { suggestions } = data;
  if (!Array.isArray(suggestions)) {
    return [];
  }

  const result: PlaceSuggestion[] = [];
  for (const entry of suggestions) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate.mapbox_id !== "string" ||
      typeof candidate.name !== "string"
    ) {
      continue;
    }
    result.push({
      mapboxId: candidate.mapbox_id,
      name: candidate.name,
      address:
        typeof candidate.full_address === "string"
          ? candidate.full_address
          : typeof candidate.place_formatted === "string"
            ? candidate.place_formatted
            : null,
      categories: isStringArray(candidate.poi_category)
        ? candidate.poi_category
        : [],
    });
  }
  return result;
}

function parseRetrievedPlace(data: unknown): RetrievedPlace | null {
  if (typeof data !== "object" || data === null || !("features" in data)) {
    return null;
  }
  const { features } = data;
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }
  const feature = features[0] as Record<string, unknown>;
  const geometry = feature.geometry as Record<string, unknown> | undefined;
  const coordinates = geometry?.coordinates;
  const properties = feature.properties as Record<string, unknown> | undefined;

  if (
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== "number" ||
    typeof coordinates[1] !== "number" ||
    properties === undefined ||
    typeof properties.mapbox_id !== "string" ||
    typeof properties.name !== "string"
  ) {
    return null;
  }

  const metadata = properties.metadata as Record<string, unknown> | undefined;

  return {
    mapboxId: properties.mapbox_id,
    name: properties.name,
    address:
      typeof properties.full_address === "string"
        ? properties.full_address
        : typeof properties.place_formatted === "string"
          ? properties.place_formatted
          : "",
    lng: coordinates[0],
    lat: coordinates[1],
    categories: isStringArray(properties.poi_category)
      ? properties.poi_category
      : [],
    websiteUrl:
      typeof metadata?.website === "string" ? metadata.website : null,
  };
}

/**
 * Engangsoppslag for et POI klikket direkte i kartet (se RestaurantMap): ett
 * suggest-kall med `proximity` satt til klikkpunktet — for å treffe riktig
 * duplikat når flere steder deler navn — etterfulgt av ett retrieve-kall.
 * Egen sessionToken per kall, siden dette ikke er en interaktiv søkesesjon
 * som `usePlaceSearch` sin `suggest`/`retrieve` over.
 */
export async function retrievePlaceNearPoi(
  name: string,
  proximity: { lng: number; lat: number },
): Promise<RetrievedPlace | null> {
  const sessionToken = crypto.randomUUID();

  const suggestUrl = new URL(`${SEARCH_BOX_URL}/suggest`);
  suggestUrl.searchParams.set("q", name);
  suggestUrl.searchParams.set("access_token", MAPBOX_TOKEN);
  suggestUrl.searchParams.set("session_token", sessionToken);
  suggestUrl.searchParams.set("language", "no");
  suggestUrl.searchParams.set("poi_category", "restaurant,cafe,bar,fast_food");
  suggestUrl.searchParams.set("country", "no");
  suggestUrl.searchParams.set(
    "proximity",
    `${proximity.lng.toFixed(6)},${proximity.lat.toFixed(6)}`,
  );
  suggestUrl.searchParams.set("limit", "1");

  try {
    const suggestResponse = await fetch(suggestUrl);
    if (!suggestResponse.ok) {
      throw new Error(`Mapbox suggest feilet med status ${suggestResponse.status}`);
    }
    const suggestData: unknown = await suggestResponse.json();
    const [top] = parseSuggestions(suggestData);
    if (!top) {
      return null;
    }

    const retrieveUrl = new URL(`${SEARCH_BOX_URL}/retrieve/${top.mapboxId}`);
    retrieveUrl.searchParams.set("access_token", MAPBOX_TOKEN);
    retrieveUrl.searchParams.set("session_token", sessionToken);
    const retrieveResponse = await fetch(retrieveUrl);
    if (!retrieveResponse.ok) {
      throw new Error(`Mapbox retrieve feilet med status ${retrieveResponse.status}`);
    }
    const retrieveData: unknown = await retrieveResponse.json();
    return parseRetrievedPlace(retrieveData);
  } catch (error) {
    console.error("[retrievePlaceNearPoi] Kunne ikke slå opp sted", error);
    return null;
  }
}

export interface UsePlaceSearchResult {
  suggestions: PlaceSuggestion[];
  isSearching: boolean;
  /** Debounced søk — kaller Mapbox `suggest` når query er lang nok. */
  search: (query: string) => void;
  /** Henter fullt sted for et valgt forslag og avslutter søkesesjonen. */
  retrieve: (mapboxId: string) => Promise<RetrievedPlace | null>;
  /** Nullstiller forslag og starter en ny søkesesjon (ny sessionToken). */
  reset: () => void;
}

/**
 * Restaurant-søk mot Mapbox Search Box API (suggest + retrieve), som REST-
 * kall uten SDK. `sessionToken` gjenbrukes gjennom hele interaksjonen (alle
 * suggest-kall + avsluttende retrieve = én "session" i Mapbox sin
 * fakturering — 500 gratis/måned), og genereres på nytt først når
 * interaksjonen avsluttes (retrieve fullført, eller `reset()` kalt).
 */
export function usePlaceSearch(): UsePlaceSearchResult {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const runSuggest = useCallback((query: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);

    const url = new URL(`${SEARCH_BOX_URL}/suggest`);
    url.searchParams.set("q", query);
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("session_token", sessionTokenRef.current);
    url.searchParams.set("language", "no");
    url.searchParams.set("poi_category", "restaurant,cafe,bar,fast_food");
    // Kun norske restauranter er aktuelle for brukeren — begrenser Search
    // Box-treffene til Norge (ISO 3166-1 alpha-2).
    url.searchParams.set("country", "no");
    url.searchParams.set("limit", "8");

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Mapbox suggest feilet med status ${response.status}`);
        }
        const data: unknown = await response.json();
        setSuggestions(parseSuggestions(data));
        setIsSearching(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("[usePlaceSearch] suggest-kall feilet", error);
        setSuggestions([]);
        setIsSearching(false);
      });
  }, []);

  const search = useCallback(
    (query: string) => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      if (query.trim().length < MIN_QUERY_LENGTH) {
        abortControllerRef.current?.abort();
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      debounceTimerRef.current = window.setTimeout(() => {
        runSuggest(query.trim());
      }, DEBOUNCE_MS);
    },
    [runSuggest],
  );

  const retrieve = useCallback(
    async (mapboxId: string): Promise<RetrievedPlace | null> => {
      const url = new URL(`${SEARCH_BOX_URL}/retrieve/${mapboxId}`);
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      url.searchParams.set("session_token", sessionTokenRef.current);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Mapbox retrieve feilet med status ${response.status}`);
        }
        const data: unknown = await response.json();
        const place = parseRetrievedPlace(data);

        // Interaksjonen er avsluttet — ny sessionToken for neste søk.
        sessionTokenRef.current = crypto.randomUUID();
        setSuggestions([]);

        return place;
      } catch (error) {
        console.error("[usePlaceSearch] retrieve-kall feilet", error);
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    abortControllerRef.current?.abort();
    setSuggestions([]);
    setIsSearching(false);
    sessionTokenRef.current = crypto.randomUUID();
  }, []);

  return { suggestions, isSearching, search, retrieve, reset };
}
