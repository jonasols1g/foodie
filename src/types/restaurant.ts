export type RestaurantStatus = "planned" | "visited";

/** Delt norsk visningstekst per status. */
export const RESTAURANT_STATUS_LABEL: Record<RestaurantStatus, string> = {
  planned: "Planlagt",
  visited: "Besøkt",
};

export interface Restaurant {
  id: string; // Firestore auto-genererer denne (addDoc)
  name: string;
  address: string; // fra Mapbox full_address/place_formatted
  lat: number;
  lng: number;
  mapboxId: string; // POI-id fra Search Box API — metadata, ikke primærnøkkel
  categories: string[]; // Mapbox poi_category
  websiteUrl: string | null; // manuelt felt — Mapbox har ikke alltid website i metadata
  notes: string;
  status: RestaurantStatus;
  addedAt: string; // ISO-tidsstempel
  visitedAt?: string; // settes når status settes til "visited"
}

/** Felter brukeren fyller ut/velger når en restaurant legges til. */
export type NewRestaurantInput = Omit<
  Restaurant,
  "id" | "status" | "addedAt" | "visitedAt"
>;
