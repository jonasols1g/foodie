import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  updateDoc,
  type Firestore,
} from "firebase/firestore/lite";
import type {
  Restaurant,
  RestaurantStatus,
} from "../../types/restaurant";
import type { RestaurantStorage } from "./RestaurantRemoteStorage";

const RESTAURANTS_SUBCOLLECTION = "restaurants";

function isRestaurantStatus(value: unknown): value is RestaurantStatus {
  return value === "planned" || value === "visited";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/**
 * Mapper et Firestore-dokument (`users/{uid}/restaurants/{restaurantId}`) til
 * en `Restaurant`. Feil form (korrupt/manipulert data) behandles som fravær
 * av elementet, ikke en krasj.
 */
function toRestaurant(
  id: string,
  data: Record<string, unknown>,
): Restaurant | null {
  if (
    typeof data.name !== "string" ||
    typeof data.address !== "string" ||
    typeof data.lat !== "number" ||
    typeof data.lng !== "number" ||
    typeof data.mapboxId !== "string" ||
    !isStringArray(data.categories) ||
    (data.websiteUrl !== null && typeof data.websiteUrl !== "string") ||
    typeof data.notes !== "string" ||
    !isRestaurantStatus(data.status) ||
    typeof data.addedAt !== "string" ||
    (data.visitedAt !== undefined && typeof data.visitedAt !== "string")
  ) {
    return null;
  }

  const restaurant: Restaurant = {
    id,
    name: data.name,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    mapboxId: data.mapboxId,
    categories: data.categories,
    websiteUrl: data.websiteUrl,
    notes: data.notes,
    status: data.status,
    addedAt: data.addedAt,
  };
  if (typeof data.visitedAt === "string") {
    restaurant.visitedAt = data.visitedAt;
  }
  return restaurant;
}

function toFirestoreData(
  restaurant: Omit<Restaurant, "id">,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: restaurant.name,
    address: restaurant.address,
    lat: restaurant.lat,
    lng: restaurant.lng,
    mapboxId: restaurant.mapboxId,
    categories: restaurant.categories,
    websiteUrl: restaurant.websiteUrl,
    notes: restaurant.notes,
    status: restaurant.status,
    addedAt: restaurant.addedAt,
  };
  if (restaurant.visitedAt !== undefined) {
    data.visitedAt = restaurant.visitedAt;
  }
  return data;
}

/**
 * `RestaurantStorage` mot Firestore. Bygget mot `firebase/firestore/lite`
 * (ikke den fulle `firebase/firestore`) — se `services/auth/firebaseClient.ts`
 * for begrunnelsen (ingen realtime-lyttere brukes her).
 */
export class FirestoreRestaurantStorage implements RestaurantStorage {
  private readonly firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  private collectionRef(userId: string) {
    return collection(this.firestore, "users", userId, RESTAURANTS_SUBCOLLECTION);
  }

  private docRef(userId: string, restaurantId: string) {
    return doc(
      this.firestore,
      "users",
      userId,
      RESTAURANTS_SUBCOLLECTION,
      restaurantId,
    );
  }

  async load(userId: string): Promise<Restaurant[]> {
    const snapshot = await getDocs(this.collectionRef(userId));
    const restaurants: Restaurant[] = [];
    for (const documentSnapshot of snapshot.docs) {
      const restaurant = toRestaurant(
        documentSnapshot.id,
        documentSnapshot.data(),
      );
      if (restaurant !== null) {
        restaurants.push(restaurant);
      }
    }
    return restaurants;
  }

  async add(userId: string, restaurant: Omit<Restaurant, "id">): Promise<string> {
    const docRef = await addDoc(
      this.collectionRef(userId),
      toFirestoreData(restaurant),
    );
    return docRef.id;
  }

  async updateStatus(
    userId: string,
    restaurantId: string,
    status: RestaurantStatus,
    visitedAt?: string,
  ): Promise<void> {
    await updateDoc(this.docRef(userId, restaurantId), {
      status,
      // `visitedAt` fjernes eksplisitt (ikke satt til `undefined`, som
      // Firestore ikke tillater) ved tilbakebytte til "planned".
      visitedAt: visitedAt === undefined ? deleteField() : visitedAt,
    });
  }

  async update(
    userId: string,
    restaurantId: string,
    patch: Partial<Omit<Restaurant, "id">>,
  ): Promise<void> {
    await updateDoc(this.docRef(userId, restaurantId), { ...patch });
  }

  async remove(userId: string, restaurantId: string): Promise<void> {
    await deleteDoc(this.docRef(userId, restaurantId));
  }
}
