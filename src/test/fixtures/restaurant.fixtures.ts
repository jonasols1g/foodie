import type { Restaurant } from "../../types/restaurant";

export function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: "restaurant-1",
    name: "Maaemo",
    address: "Dronning Eufemias gate 23, Oslo",
    lat: 59.9075,
    lng: 10.7532,
    mapboxId: "mapbox-poi-1",
    categories: ["restaurant"],
    websiteUrl: "https://maaemo.no",
    notes: "",
    status: "planned",
    addedAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}
