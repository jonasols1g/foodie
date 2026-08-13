import type { ReactNode } from "react";
import type { Restaurant, RestaurantStatus } from "../../types/restaurant";
import { EmptyState } from "../common/EmptyState";
import { RestaurantCard } from "./RestaurantCard";

export interface RestaurantListProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: RestaurantStatus) => void;
  onRemove: (id: string) => void;
  /**
   * Restauranter som er i ferd med å falle ut av gjeldende filter etter en
   * statusendring (se design/README.md — "Statusendring"). Eies av
   * `RestaurantsPage` (ikke utledet her via array-diffing — en midlertidig
   * Firestore-ID som byttes ut med den ekte ved vellykket lagring ser
   * identisk ut som en fjerning i en ren id-diff, noe som tidligere ga et
   * duplikatkort i det korte vinduet før IDen ble byttet).
   */
  exitingIds: ReadonlySet<string>;
  emptyVariant: "none" | "filter";
  emptyHeading: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
}

/** Se design/README.md — "Liste": px-4 pt-3 pb-28, gap-2.5. */
export function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  onStatusChange,
  onRemove,
  exitingIds,
  emptyVariant,
  emptyHeading,
  emptyMessage,
  emptyAction,
}: RestaurantListProps) {
  if (restaurants.length === 0) {
    return (
      <EmptyState
        variant={emptyVariant}
        heading={emptyHeading}
        message={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 px-4 pt-3 pb-28">
      {restaurants.map((restaurant) => {
        const isExiting = exitingIds.has(restaurant.id);
        return (
          <li
            key={restaurant.id}
            className={`card-collapse-row ${isExiting ? "card-collapse-row--collapsed" : ""}`}
          >
            <div>
              <RestaurantCard
                restaurant={restaurant}
                isSelected={restaurant.id === selectedId}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
                onRemove={onRemove}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
