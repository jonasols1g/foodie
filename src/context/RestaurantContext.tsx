import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RestaurantStorage } from "../services/storage/RestaurantRemoteStorage";
import type {
  NewRestaurantInput,
  Restaurant,
  RestaurantStatus,
} from "../types/restaurant";

export interface RestaurantContextValue {
  restaurants: Restaurant[];
  /** `true` under den første hentingen fra Firestore. */
  isLoading: boolean;
  /** `true` når siste lagringsforsøk feilet. */
  saveError: boolean;
  dismissSaveError: () => void;
  addRestaurant: (input: NewRestaurantInput, status?: RestaurantStatus) => void;
  setStatus: (id: string, status: RestaurantStatus) => void;
  updateRestaurant: (id: string, patch: Partial<Restaurant>) => void;
  removeRestaurant: (id: string) => void;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export interface RestaurantProviderProps {
  children: ReactNode;
  /**
   * `RestaurantStorage`-instansen som brukes som skriveputt mot Firestore i
   * produksjon (en testdobbel i tester) — injisert eksplisitt fremfor
   * konsumert fra en nestet context, for å gjøre testdobler trivielle.
   */
  storage: RestaurantStorage;
  /**
   * Anonym Firebase-sesjons-ID fra `AuthContext`. `null` inntil sesjonen er
   * klar (eller ved en autentiseringsfeil) — ingen henting/skriving skjer
   * før `userId` er satt.
   */
  userId: string | null;
}

/**
 * Global restaurant-state: React Context + lokal `restaurants`-state, med
 * optimistic update mot Firestore.
 *
 * Enklere enn watchlist sin tilsvarende kontekst (som håndterer en
 * localStorage->Firestore-migrering ved siden av en fortsatt aktiv
 * localStorage-skriveputt) — Foodie er greenfield, Firestore er eneste
 * datakilde, og det er derfor ikke behov for presis per-handling
 * angre/gjør-om-patching av samtidige handlinger under hydrering. Ved feilet
 * skriving rulles hele `restaurants`-arrayet tilbake til tilstanden rett før
 * handlingen (én bruker, typisk sekvensielle handlinger — risikoen for at
 * dette sletter en annen, uavhengig, nylig vellykket handling er lav).
 */
export function RestaurantProvider({
  children,
  storage,
  userId,
}: RestaurantProviderProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const restaurantsRef = useRef(restaurants);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(
    (uid: string, cancelledRef: { current: boolean }) => {
      // `isLoading` starter allerede som `true` (se useState over) — denne
      // effekten kjører kun én gang per app-sesjon (userId går fra `null`
      // til en stabil verdi idet den anonyme Firebase-sesjonen blir klar,
      // og endrer seg ikke igjen), så det trengs ingen ny `setIsLoading(true)`
      // her.
      storage
        .load(uid)
        .then((loaded) => {
          if (cancelledRef.current) {
            return;
          }
          restaurantsRef.current = loaded;
          setRestaurants(loaded);
          setIsLoading(false);
        })
        .catch((error: unknown) => {
          console.error(
            "[restaurants] Kunne ikke hente restaurantlisten fra Firestore",
            error,
          );
          if (cancelledRef.current) {
            return;
          }
          setIsLoading(false);
          setSaveError(true);
        });
    },
    [storage],
  );

  useEffect(() => {
    if (userId === null) {
      return;
    }

    const cancelledRef = { current: false };
    load(userId, cancelledRef);

    return () => {
      cancelledRef.current = true;
    };
  }, [load, userId]);

  const dismissSaveError = useCallback(() => {
    setSaveError(false);
  }, []);

  const addRestaurant = useCallback(
    (input: NewRestaurantInput, status: RestaurantStatus = "planned") => {
      if (userId === null) {
        return;
      }

      const previous = restaurantsRef.current;
      // Optimistisk midlertidig-ID (erstattes av Firestores ekte ID når
      // skrivingen lykkes) — nødvendig fordi `addDoc` genererer ID-en
      // server-side, i motsetning til watchlistens `setDoc` med kjent
      // `mediaId`.
      const tempId = `temp-${crypto.randomUUID()}`;
      const visitedAt = status === "visited" ? new Date().toISOString() : undefined;
      const optimisticRestaurant: Restaurant = {
        ...input,
        id: tempId,
        status,
        visitedAt,
        addedAt: new Date().toISOString(),
      };
      const next = [...previous, optimisticRestaurant];
      restaurantsRef.current = next;
      setRestaurants(next);

      storage
        .add(userId, {
          ...input,
          status,
          visitedAt,
          addedAt: optimisticRestaurant.addedAt,
        })
        .then((newId) => {
          const withRealId = restaurantsRef.current.map((restaurant) =>
            restaurant.id === tempId
              ? { ...restaurant, id: newId }
              : restaurant,
          );
          restaurantsRef.current = withRealId;
          setRestaurants(withRealId);
        })
        .catch((error: unknown) => {
          console.error(
            "[restaurants] Kunne ikke lagre ny restaurant til Firestore — ruller tilbake",
            error,
          );
          restaurantsRef.current = previous;
          setRestaurants(previous);
          setSaveError(true);
        });
    },
    [storage, userId],
  );

  const setStatus = useCallback(
    (id: string, status: RestaurantStatus) => {
      if (userId === null) {
        return;
      }

      const previous = restaurantsRef.current;
      const visitedAt = status === "visited" ? new Date().toISOString() : undefined;
      const next = previous.map((restaurant) =>
        restaurant.id === id
          ? { ...restaurant, status, visitedAt }
          : restaurant,
      );
      restaurantsRef.current = next;
      setRestaurants(next);

      storage.updateStatus(userId, id, status, visitedAt).catch((error: unknown) => {
        console.error(
          "[restaurants] Kunne ikke oppdatere status i Firestore — ruller tilbake",
          error,
        );
        restaurantsRef.current = previous;
        setRestaurants(previous);
        setSaveError(true);
      });
    },
    [storage, userId],
  );

  const updateRestaurant = useCallback(
    (id: string, patch: Partial<Restaurant>) => {
      if (userId === null) {
        return;
      }

      const previous = restaurantsRef.current;
      const next = previous.map((restaurant) =>
        restaurant.id === id ? { ...restaurant, ...patch } : restaurant,
      );
      restaurantsRef.current = next;
      setRestaurants(next);

      storage.update(userId, id, patch).catch((error: unknown) => {
        console.error(
          "[restaurants] Kunne ikke oppdatere restaurant i Firestore — ruller tilbake",
          error,
        );
        restaurantsRef.current = previous;
        setRestaurants(previous);
        setSaveError(true);
      });
    },
    [storage, userId],
  );

  const removeRestaurant = useCallback(
    (id: string) => {
      if (userId === null) {
        return;
      }

      const previous = restaurantsRef.current;
      const next = previous.filter((restaurant) => restaurant.id !== id);
      restaurantsRef.current = next;
      setRestaurants(next);

      storage.remove(userId, id).catch((error: unknown) => {
        console.error(
          "[restaurants] Kunne ikke fjerne restaurant i Firestore — ruller tilbake",
          error,
        );
        restaurantsRef.current = previous;
        setRestaurants(previous);
        setSaveError(true);
      });
    },
    [storage, userId],
  );

  const value = useMemo<RestaurantContextValue>(
    () => ({
      restaurants,
      isLoading,
      saveError,
      dismissSaveError,
      addRestaurant,
      setStatus,
      updateRestaurant,
      removeRestaurant,
    }),
    [
      restaurants,
      isLoading,
      saveError,
      dismissSaveError,
      addRestaurant,
      setStatus,
      updateRestaurant,
      removeRestaurant,
    ],
  );

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurants(): RestaurantContextValue {
  const context = useContext(RestaurantContext);
  if (context === null) {
    throw new Error("useRestaurants må brukes innenfor en RestaurantProvider");
  }
  return context;
}
