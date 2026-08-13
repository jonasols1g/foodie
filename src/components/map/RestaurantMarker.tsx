import { Marker } from "react-map-gl/mapbox";
import type { Restaurant } from "../../types/restaurant";

export interface RestaurantMarkerProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: (id: string) => void;
}

// Se design/README.md — "Pin": rounded-full + éi skarp hjørne + rotate-45
// gir en dråpe-/diamantform. `rounded-br` (ikke `-bl`) er bevisst: etter 45°
// rotasjon er det det hjørnet som ender opp pekende ned, som en vanlig
// kartnål. Planlagt/besøkt-farge, valgt = større + accent.
const STATUS_BG_CLASS: Record<Restaurant["status"], string> = {
  planned: "bg-planned",
  visited: "bg-visited",
};

export function RestaurantMarker({
  restaurant,
  isSelected,
  onClick,
}: RestaurantMarkerProps) {
  const size = isSelected ? 34 : 22;

  return (
    <Marker
      longitude={restaurant.lng}
      latitude={restaurant.lat}
      anchor="center"
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onClick(restaurant.id);
      }}
    >
      {/* 44×44 usynlig treffsone rundt selve pinnen (se design/README.md —
          "Touch-mål"), sentrert uavhengig av pinnens variable størrelse. */}
      <button
        type="button"
        aria-label={restaurant.name}
        aria-pressed={isSelected}
        className="flex h-11 w-11 cursor-pointer items-center justify-center"
      >
        <span
          aria-hidden="true"
          className={`rounded-full rounded-br-[2px] transition-all duration-150 ${
            isSelected ? "z-10 bg-accent" : STATUS_BG_CLASS[restaurant.status]
          }`}
          style={{
            width: size,
            height: size,
            border: `${isSelected ? 3 : 2}px solid var(--color-bg)`,
            transform: "rotate(45deg)",
            boxShadow: isSelected
              ? "0 4px 12px rgba(42,37,32,0.35)"
              : "0 2px 6px rgba(42,37,32,0.30)",
          }}
        />
      </button>
    </Marker>
  );
}
