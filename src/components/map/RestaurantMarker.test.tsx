import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRestaurant } from "../../test/fixtures/restaurant.fixtures";
import { RestaurantMarker } from "./RestaurantMarker";

// `Marker` fra react-map-gl krever en ekte kart-instans/kontekst (som ikke
// kan initialiseres i jsdom) — mockes til en enkel DOM-wrapper som
// videresender klikk med samme eventform (`event.originalEvent`) som den
// ekte komponenten, slik at RestaurantMarker sin egen klikk-håndtering
// (stopPropagation + onClick(id)) kan testes via et vanlig DOM-klikk på
// den innkapslede knappen.
vi.mock("react-map-gl/mapbox", () => ({
  Marker: (props: {
    onClick?: (event: { originalEvent: { stopPropagation: () => void } }) => void;
    children?: ReactNode;
  }) => (
    <div
      onClick={() => {
        props.onClick?.({ originalEvent: { stopPropagation: vi.fn() } });
      }}
    >
      {props.children}
    </div>
  ),
}));

describe("RestaurantMarker", () => {
  it("kaller onClick med restaurantens id ved klikk på pinnen", () => {
    const restaurant = createRestaurant({ id: "r1", name: "Maaemo" });
    const onClick = vi.fn();
    render(<RestaurantMarker restaurant={restaurant} isSelected={false} onClick={onClick} />);

    screen.getByRole("button", { name: "Maaemo" }).click();

    expect(onClick).toHaveBeenCalledWith("r1");
  });

  it("reflekterer valgt tilstand via aria-pressed", () => {
    const restaurant = createRestaurant({ name: "Maaemo" });
    const { rerender } = render(
      <RestaurantMarker restaurant={restaurant} isSelected={false} onClick={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Maaemo" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    rerender(<RestaurantMarker restaurant={restaurant} isSelected={true} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Maaemo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
