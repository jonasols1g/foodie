import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantProvider } from "../context/RestaurantContext";
import { createMockRestaurantStorage } from "../test/mocks/createMockRestaurantStorage";
import { createRestaurant } from "../test/fixtures/restaurant.fixtures";
import { RestaurantsPage } from "./RestaurantsPage";

// `RestaurantMap` mockes bort — disse testene dekker filter-/exit-animasjon-
// logikken i RestaurantsPage selv, og trenger ikke et ekte Mapbox-kart
// (som uansett ikke kan initialiseres i jsdom).
vi.mock("../components/map/RestaurantMap", () => ({
  RestaurantMap: () => <div data-testid="mock-map" />,
}));

function renderPage(storage = createMockRestaurantStorage()) {
  return render(
    <RestaurantProvider storage={storage} userId="user-1">
      <RestaurantsPage />
    </RestaurantProvider>,
  );
}

// Se RestaurantsPage.tsx — EXIT_ANIMATION_MS.
const EXIT_ANIMATION_MS = 200;

describe("RestaurantsPage — exit-animasjon ved statusendring (se design/README.md)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holder et sted synlig i det aktive filteret til exit-animasjonen er ferdig, deretter forsvinner det", async () => {
    const restaurant = createRestaurant({ id: "r1", name: "Maaemo", status: "planned" });
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([restaurant]),
    });
    renderPage(storage);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Maaemo" })).toBeInTheDocument();
    });

    // Aktiver "Planlagt"-filteret, velg kortet (åpner handlingsraden), og
    // marker stedet som besøkt — det faller dermed utenfor gjeldende filter.
    fireEvent.click(screen.getByRole("button", { name: "Planlagt" }));
    fireEvent.click(screen.getByRole("button", { name: /Maaemo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Marker som besøkt" }));

    // Statusen er endret, men stedet skal fortsatt vises helt til
    // exit-animasjonen er ferdig — ikke forsvinne momentant.
    expect(screen.getByRole("heading", { name: "Maaemo" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(EXIT_ANIMATION_MS);
    });

    expect(screen.queryByRole("heading", { name: "Maaemo" })).not.toBeInTheDocument();
  });

  it("viser riktig tom-tilstand for det gjeldende filteret først når exit-animasjonen er ferdig", async () => {
    const restaurant = createRestaurant({ id: "r1", name: "Maaemo", status: "planned" });
    const storage = createMockRestaurantStorage({
      load: () => Promise.resolve([restaurant]),
    });
    renderPage(storage);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Maaemo" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Planlagt" }));
    fireEvent.click(screen.getByRole("button", { name: /Maaemo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Marker som besøkt" }));

    expect(screen.queryByText("Ingen planlagte restauranter.")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(EXIT_ANIMATION_MS);
    });

    expect(screen.getByText("Ingen planlagte restauranter.")).toBeInTheDocument();
  });
});
