import { Marker } from "react-map-gl/mapbox";
import type { Restaurant } from "../../types/restaurant";

export interface RestaurantMarkerProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const STATUS_COLOR: Record<Restaurant["status"], string> = {
  planned: "#c9922f",
  visited: "#3f8f5f",
};

export function RestaurantMarker({
  restaurant,
  isSelected,
  onClick,
}: RestaurantMarkerProps) {
  return (
    <Marker
      longitude={restaurant.lng}
      latitude={restaurant.lat}
      anchor="bottom"
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onClick(restaurant.id);
      }}
    >
      <svg
        width={isSelected ? 34 : 26}
        height={isSelected ? 34 : 26}
        viewBox="0 0 24 24"
        fill={STATUS_COLOR[restaurant.status]}
        stroke="white"
        strokeWidth={1.5}
        className="cursor-pointer drop-shadow"
        role="img"
        aria-label={restaurant.name}
      >
        <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.72 11.13 7.01 11.38a1.5 1.5 0 0 0 1.98 0C13.28 21.13 20 15.25 20 10c0-4.42-3.58-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
      </svg>
    </Marker>
  );
}
