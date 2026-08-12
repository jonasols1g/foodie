import { firestore } from "../auth/firebaseClient";
import { FirestoreRestaurantStorage } from "./FirestoreRestaurantStorage";
import type { RestaurantStorage } from "./RestaurantRemoteStorage";

/**
 * Sammensetningsrot for `RestaurantStorage`. `App.tsx` injiserer denne
 * instansen inn i `RestaurantProvider` (se `context/RestaurantContext.tsx`).
 */
export const restaurantStorage: RestaurantStorage = new FirestoreRestaurantStorage(
  firestore,
);
