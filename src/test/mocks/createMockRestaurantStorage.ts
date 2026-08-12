import { vi } from "vitest";
import type { RestaurantStorage } from "../../services/storage/RestaurantRemoteStorage";

/**
 * Testdobbel for `RestaurantStorage` til komponent-/hook-tester — ingen ekte
 * Firebase-kall fra Vitest. Alle metoder er `vi.fn()`-stubber med ufarlige
 * defaults (tom liste ved `load`, vellykkede no-op-skrivinger ellers).
 * Overstyr per test etter behov, f.eks.
 * `createMockRestaurantStorage({ add: vi.fn().mockRejectedValue(...) })`.
 */
export function createMockRestaurantStorage(
  overrides: Partial<RestaurantStorage> = {},
): RestaurantStorage {
  return {
    load: vi.fn<RestaurantStorage["load"]>().mockResolvedValue([]),
    add: vi.fn<RestaurantStorage["add"]>().mockResolvedValue("new-id"),
    updateStatus: vi
      .fn<RestaurantStorage["updateStatus"]>()
      .mockResolvedValue(undefined),
    update: vi.fn<RestaurantStorage["update"]>().mockResolvedValue(undefined),
    remove: vi.fn<RestaurantStorage["remove"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}
