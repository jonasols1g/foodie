import type { Restaurant } from "../../types/restaurant";
import { RestaurantStatusBadge } from "./RestaurantStatusBadge";
import { RestaurantStatusToggle } from "./RestaurantStatusToggle";

export interface RestaurantListItemProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: Restaurant["status"]) => void;
  onRemove: (id: string) => void;
}

export function RestaurantListItem({
  restaurant,
  isSelected,
  onSelect,
  onStatusChange,
  onRemove,
}: RestaurantListItemProps) {
  return (
    <li
      className={`border-surface-border rounded-xl border p-4 transition ${
        isSelected ? "ring-brand ring-2" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => {
          onSelect(restaurant.id);
        }}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{restaurant.name}</h3>
          <RestaurantStatusBadge status={restaurant.status} />
        </div>
        <p className="text-text-muted text-sm">{restaurant.address}</p>
        {restaurant.categories.length > 0 && (
          <p className="text-text-muted mt-1 text-xs">
            {restaurant.categories.join(", ")}
          </p>
        )}
        {restaurant.notes && <p className="mt-2 text-sm">{restaurant.notes}</p>}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {restaurant.websiteUrl && (
          <a
            href={restaurant.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand text-sm underline"
          >
            Nettside
          </a>
        )}
        <RestaurantStatusToggle
          status={restaurant.status}
          onChange={(status) => {
            onStatusChange(restaurant.id, status);
          }}
        />
        <button
          type="button"
          onClick={() => {
            onRemove(restaurant.id);
          }}
          className="text-text-muted hover:text-brand ml-auto text-sm underline"
        >
          Fjern
        </button>
      </div>
    </li>
  );
}
