import { describe, expect, it, vi } from "vitest";
import {
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore/lite";
import { FirestoreRestaurantStorage } from "./FirestoreRestaurantStorage";
import type { Restaurant } from "../../types/restaurant";

// `firebase/firestore/lite` mockes helt — testen skal verifisere
// `FirestoreRestaurantStorage` sin egen felt-mapping (til/fra Firestores
// dokumentform), ikke et ekte Firestore-oppsett. `collection`/`doc`/
// `deleteField` returnerer bevisst enkle, gjenkjennelige markørverdier
// fremfor å prøve å etterligne SDK-ens interne referanseobjekter.
vi.mock("firebase/firestore/lite", () => ({
  collection: vi.fn(() => "collection-ref"),
  doc: vi.fn(() => "doc-ref"),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deleteField: vi.fn(() => "DELETE_FIELD_SENTINEL"),
}));

const VALID_DOC: Record<string, unknown> = {
  name: "Maaemo",
  address: "Dronning Eufemias gate 23, Oslo",
  lat: 59.9075,
  lng: 10.7532,
  mapboxId: "poi-1",
  categories: ["restaurant"],
  websiteUrl: "https://maaemo.no",
  notes: "",
  status: "planned",
  addedAt: "2026-01-01T12:00:00.000Z",
};

function snapshotFor(docs: { id: string; data: Record<string, unknown> }[]) {
  return { docs: docs.map(({ id, data }) => ({ id, data: () => data })) };
}

describe("FirestoreRestaurantStorage", () => {
  const storage = new FirestoreRestaurantStorage({} as never);

  it("load() mapper gyldige dokumenter til Restaurant, med visitedAt kun til stede når satt", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotFor([
        { id: "r1", data: VALID_DOC },
        {
          id: "r2",
          data: {
            ...VALID_DOC,
            status: "visited",
            visitedAt: "2026-02-01T00:00:00.000Z",
          },
        },
      ]) as never,
    );

    const restaurants = await storage.load("user-1");

    expect(restaurants).toHaveLength(2);
    expect(restaurants[0]?.id).toBe("r1");
    expect("visitedAt" in (restaurants[0] as Restaurant)).toBe(false);
    expect(restaurants[1]?.visitedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("load() filtrerer bort korrupte dokumenter i stedet for å kaste", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshotFor([
        { id: "good", data: VALID_DOC },
        // `lat` er en streng i stedet for et tall — matcher ikke skjemaet.
        { id: "corrupt", data: { ...VALID_DOC, lat: "ikke-et-tall" } },
      ]) as never,
    );

    const restaurants = await storage.load("user-1");

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0]?.id).toBe("good");
  });

  it("add() returnerer Firestores server-genererte dokument-ID", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "generated-id" } as never);

    const id = await storage.add("user-1", {
      ...(VALID_DOC as Omit<Restaurant, "id">),
    });

    expect(id).toBe("generated-id");
  });

  it("updateStatus() sender deleteField()-sentinelen for visitedAt ved tilbakebytte til 'planned'", async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined);

    await storage.updateStatus("user-1", "r1", "planned", undefined);

    expect(updateDoc).toHaveBeenCalledWith("doc-ref", {
      status: "planned",
      visitedAt: "DELETE_FIELD_SENTINEL",
    });
  });

  it("updateStatus() setter visitedAt direkte ved overgang til 'visited'", async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined);

    await storage.updateStatus("user-1", "r1", "visited", "2026-03-01T00:00:00.000Z");

    expect(updateDoc).toHaveBeenCalledWith("doc-ref", {
      status: "visited",
      visitedAt: "2026-03-01T00:00:00.000Z",
    });
  });

  it("remove() sletter riktig dokumentreferanse", async () => {
    vi.mocked(deleteDoc).mockResolvedValue(undefined);

    await storage.remove("user-1", "r1");

    expect(deleteDoc).toHaveBeenCalledWith("doc-ref");
  });
});
