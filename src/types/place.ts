/** Ett forslag fra Mapbox Search Box `suggest`-endepunktet. */
export interface PlaceSuggestion {
  mapboxId: string;
  name: string;
  address: string | null;
  categories: string[];
}

/** Fullt sted hentet via Mapbox Search Box `retrieve`-endepunktet. */
export interface RetrievedPlace {
  mapboxId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  websiteUrl: string | null;
}
