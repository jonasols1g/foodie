import type { Restaurant } from "../../types/restaurant";
import { EmptyState } from "../common/EmptyState";
import { RestaurantListItem } from "./RestaurantListItem";

export interface RestaurantListProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: Restaurant["status"]) => void;
  onRemove: (id: string) => void;
  emptyMessage: string;
  className?: string;
}

/**
 * Ren, layout-agnostisk komponent — tar kun data + callbacks, ingen
 * antagelse om hvor den plasseres i DOM-treet (design/layout er ikke
 * bestemt ennå, se docs/plan).
 */
export function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  onStatusChange,
  onRemove,
  emptyMessage,
  className,
}: RestaurantListProps) {
  if (restaurants.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ul className={`flex flex-col gap-3 ${className ?? ""}`}>
      {restaurants.map((restaurant) => (
        <RestaurantListItem
          key={restaurant.id}
          restaurant={restaurant}
          isSelected={restaurant.id === selectedId}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
