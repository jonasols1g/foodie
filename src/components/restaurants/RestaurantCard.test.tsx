import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createRestaurant } from "../../test/fixtures/restaurant.fixtures";
import { RestaurantCard } from "./RestaurantCard";

describe("RestaurantCard", () => {
  it("viser handlingsraden (statusknapp/nettside/slett) kun når kortet er valgt", () => {
    const restaurant = createRestaurant();
    const { rerender } = render(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={false}
        onSelect={vi.fn()}
        onStatusChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: `Slett ${restaurant.name}` }),
    ).not.toBeInTheDocument();

    rerender(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={true}
        onSelect={vi.fn()}
        onStatusChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: `Slett ${restaurant.name}` }),
    ).toBeInTheDocument();
  });

  it("krever inline-bekreftelse før onRemove kalles, og 'Avbryt' viser kortet igjen uten å fjerne det", async () => {
    const user = userEvent.setup();
    const restaurant = createRestaurant();
    const onRemove = vi.fn();
    render(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={true}
        onSelect={vi.fn()}
        onStatusChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: `Slett ${restaurant.name}` }));

    expect(
      screen.getByText(`Fjerne «${restaurant.name}» fra listen?`),
    ).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(
      screen.queryByText(`Fjerne «${restaurant.name}» fra listen?`),
    ).not.toBeInTheDocument();
    expect(screen.getByText(restaurant.name)).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("kaller onRemove med restaurantens id når sletting bekreftes med 'Fjern'", async () => {
    const user = userEvent.setup();
    const restaurant = createRestaurant({ id: "r-42" });
    const onRemove = vi.fn();
    render(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={true}
        onSelect={vi.fn()}
        onStatusChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: `Slett ${restaurant.name}` }));
    await user.click(screen.getByRole("button", { name: "Fjern" }));

    expect(onRemove).toHaveBeenCalledWith("r-42");
  });

  it("kaller onSelect med restaurantens id ved klikk på selve kortet", async () => {
    const user = userEvent.setup();
    const restaurant = createRestaurant({ id: "r-1" });
    const onSelect = vi.fn();
    render(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={false}
        onSelect={onSelect}
        onStatusChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: new RegExp(restaurant.name) }));

    expect(onSelect).toHaveBeenCalledWith("r-1");
  });
});
