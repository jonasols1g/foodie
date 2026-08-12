import type { Restaurant, RestaurantStatus } from "../../types/restaurant";

/**
 * Async storage-grensesnitt for restaurantlisten mot en ekte, delt database
 * (i dag `FirestoreRestaurantStorage`). Konsumenten (`RestaurantContext`) er
 * uavhengig av hvilken database som faktisk brukes bak grensesnittet.
 */
export interface RestaurantStorage {
  /** Henter alle restauranter for brukeren fra databasen. */
  load(userId: string): Promise<Restaurant[]>;
  /** Oppretter en ny restaurant. Returnerer den Firestore-genererte ID-en. */
  add(
    userId: string,
    restaurant: Omit<Restaurant, "id">,
  ): Promise<string>;
  /**
   * Oppdaterer kun status (og `visitedAt`) på en eksisterende restaurant.
   * `visitedAt` utelates/fjernes når den er `undefined` (tilbakebytte til
   * "planned").
   */
  updateStatus(
    userId: string,
    restaurantId: string,
    status: RestaurantStatus,
    visitedAt?: string,
  ): Promise<void>;
  /** Oppdaterer vilkårlige felter (f.eks. notater, nettside-override). */
  update(
    userId: string,
    restaurantId: string,
    patch: Partial<Omit<Restaurant, "id">>,
  ): Promise<void>;
  /** Fjerner en restaurant fra listen. */
  remove(userId: string, restaurantId: string): Promise<void>;
}
