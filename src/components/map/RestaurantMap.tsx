import { useMemo, useState } from "react";
import Map, { Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Restaurant } from "../../types/restaurant";
import { RestaurantStatusBadge } from "../restaurants/RestaurantStatusBadge";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAPBOX_STYLE_URL,
  MAPBOX_TOKEN,
} from "../../services/map/mapboxConfig";
import { RestaurantMarker } from "./RestaurantMarker";

export interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelectRestaurant: (id: string | null) => void;
  className?: string;
}

/**
 * Layout-agnostisk komponent — fyller sin container (ingen fast
 * bredde/høyde), ingen antagelse om hvor den plasseres i DOM-treet.
 */
export function RestaurantMap({
  restaurants,
  selectedId,
  onSelectRestaurant,
  className,
}: RestaurantMapProps) {
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_MAP_CENTER.lng,
    latitude: DEFAULT_MAP_CENTER.lat,
    zoom: DEFAULT_MAP_ZOOM,
  });

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`border-surface-border text-text-muted flex min-h-64 items-center justify-center rounded-xl border p-4 text-center text-sm ${className ?? ""}`}
      >
        Kartet er ikke tilgjengelig ennå — VITE_MAPBOX_TOKEN mangler.
      </div>
    );
  }

  return (
    <div className={`min-h-64 overflow-hidden rounded-xl ${className ?? ""}`}>
      <Map
        {...viewState}
        onMove={(event) => {
          setViewState(event.viewState);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE_URL}
        style={{ width: "100%", height: "100%", minHeight: "16rem" }}
        onClick={() => {
          onSelectRestaurant(null);
        }}
      >
        {restaurants.map((restaurant) => (
          <RestaurantMarker
            key={restaurant.id}
            restaurant={restaurant}
            isSelected={restaurant.id === selectedId}
            onClick={onSelectRestaurant}
          />
        ))}

        {selectedRestaurant && (
          <Popup
            longitude={selectedRestaurant.lng}
            latitude={selectedRestaurant.lat}
            anchor="top"
            onClose={() => {
              onSelectRestaurant(null);
            }}
            closeOnClick={false}
          >
            <div className="min-w-40 text-sm">
              <div className="flex items-start justify-between gap-2">
                <strong>{selectedRestaurant.name}</strong>
                <RestaurantStatusBadge status={selectedRestaurant.status} />
              </div>
              <p className="text-text-muted">{selectedRestaurant.address}</p>
              {selectedRestaurant.websiteUrl && (
                <a
                  href={selectedRestaurant.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  Nettside
                </a>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
