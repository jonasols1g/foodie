import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createMockRestaurantStorage } from "../test/mocks/createMockRestaurantStorage";
import { createRestaurant } from "../test/fixtures/restaurant.fixtures";
import { RestaurantProvider, useRestaurants } from "./RestaurantContext";
import type { RestaurantStorage } from "../services/storage/RestaurantRemoteStorage";

function wrapperWithStorage(storage: RestaurantStorage, userId: string | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RestaurantProvider storage={storage} userId={userId}>
        {children}
      </RestaurantProvider>
    );
  };
}

describe("RestaurantContext", () => {
  it("er i loading-tilstand inntil userId er klar, deretter henter den restauranter", () => {
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([createRestaurant()]),
    });
    const { result, rerender } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, null),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.restaurants).toEqual([]);

    rerender();

    // userId er fortsatt null — ingen henting skal ha skjedd.
    expect(result.current.isLoading).toBe(true);
  });

  it("henter restauranter fra storage når userId er satt", async () => {
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([createRestaurant({ id: "r1", name: "Maaemo" })]),
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.restaurants).toHaveLength(1);
    expect(result.current.restaurants[0]?.name).toBe("Maaemo");
  });

  it("legger til en restaurant optimistisk og erstatter midlertidig ID med Firestores ekte ID", async () => {
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([]),
      add: () => Promise.resolve("real-id"),
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addRestaurant({
        name: "Ny restaurant",
        address: "Et sted",
        lat: 1,
        lng: 2,
        mapboxId: "mb-1",
        categories: [],
        websiteUrl: null,
        notes: "",
      });
    });

    // Optimistisk: dukker opp umiddelbart, før Firestore-kallet resolver.
    expect(result.current.restaurants).toHaveLength(1);

    await waitFor(() => {
      expect(result.current.restaurants[0]?.id).toBe("real-id");
    });
  });

  it("ruller tilbake til forrige tilstand når lagring feiler", async () => {
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([]),
      add: () => Promise.reject(new Error("nettverksfeil")),
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addRestaurant({
        name: "Feiler",
        address: "Et sted",
        lat: 1,
        lng: 2,
        mapboxId: "mb-2",
        categories: [],
        websiteUrl: null,
        notes: "",
      });
    });

    expect(result.current.restaurants).toHaveLength(1);

    await waitFor(() => {
      expect(result.current.saveError).toBe(true);
    });
    expect(result.current.restaurants).toHaveLength(0);
  });

  it("setStatus setter visitedAt ved overgang til 'visited' og fjerner den ved tilbakebytte", async () => {
    const restaurant = createRestaurant({ id: "r1", status: "planned" });
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([restaurant]),
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setStatus("r1", "visited");
    });

    await waitFor(() => {
      expect(result.current.restaurants[0]?.status).toBe("visited");
    });
    expect(result.current.restaurants[0]?.visitedAt).toBeDefined();

    act(() => {
      result.current.setStatus("r1", "planned");
    });

    await waitFor(() => {
      expect(result.current.restaurants[0]?.status).toBe("planned");
    });
    expect(result.current.restaurants[0]?.visitedAt).toBeUndefined();
  });

  it("oppdaterer en restaurant optimistisk og ruller tilbake når lagring feiler", async () => {
    const restaurant = createRestaurant({ id: "r1", notes: "" });
    // Egen lokal referanse til mock-funksjonen (i stedet for å hente den ut
    // igjen via `storage.update`) — å referere en grensesnitt-metode direkte
    // trigges av `@typescript-eslint/unbound-method`.
    const updateMock = vi.fn().mockRejectedValue(new Error("nettverksfeil"));
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([restaurant]),
      update: updateMock,
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.restaurants).toHaveLength(1);
    });

    act(() => {
      result.current.updateRestaurant("r1", { notes: "Bestill trøffelrisotto" });
    });

    // Optimistisk: notatet er oppdatert umiddelbart, før Firestore-kallet resolver.
    expect(result.current.restaurants[0]?.notes).toBe("Bestill trøffelrisotto");
    expect(updateMock).toHaveBeenCalledWith("user-1", "r1", {
      notes: "Bestill trøffelrisotto",
    });

    await waitFor(() => {
      expect(result.current.saveError).toBe(true);
    });
    expect(result.current.restaurants[0]?.notes).toBe("");
  });

  it("fjerner en restaurant optimistisk", async () => {
    const restaurant = createRestaurant({ id: "r1" });
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([restaurant]),
    });
    const { result } = renderHook(() => useRestaurants(), {
      wrapper: wrapperWithStorage(storage, "user-1"),
    });

    await waitFor(() => {
      expect(result.current.restaurants).toHaveLength(1);
    });

    act(() => {
      result.current.removeRestaurant("r1");
    });

    expect(result.current.restaurants).toHaveLength(0);
  });
});
