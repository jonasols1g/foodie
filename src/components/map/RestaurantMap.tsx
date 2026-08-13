import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { ExternalLink, List, Locate, X } from "lucide-react";
import type { Restaurant, RestaurantStatus } from "../../types/restaurant";
import { CategoryChip } from "../restaurants/CategoryChip";
import { RestaurantStatusBadge } from "../restaurants/RestaurantStatusBadge";
import { RestaurantStatusToggle } from "../restaurants/RestaurantStatusToggle";
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
  onStatusChange: (id: string, status: RestaurantStatus) => void;
  /** Se design/README.md — skjerm 2 ("Kart utvidet + popup"). */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /**
   * Mono-etikett for det dempede kartslør (se design/README.md, skjerm 7 —
   * "INGEN PINS I DETTE FILTERET"). Utelates (ingen etikett) for skjerm 6
   * (ingen restauranter i det hele tatt) — sløret vises da uansett siden
   * `restaurants` er tom.
   */
  emptyOverlayLabel?: string;
}

function RestaurantPopupContent({
  restaurant,
  onClose,
  onStatusChange,
}: {
  restaurant: Restaurant;
  onClose: () => void;
  onStatusChange: (id: string, status: RestaurantStatus) => void;
}) {
  return (
    <div className="flex w-[248px] flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-ink text-[17px] font-semibold">{restaurant.name}</p>
          <p className="text-ink-muted text-[13px]">{restaurant.address}</p>
        </div>
        <button
          type="button"
          aria-label="Lukk"
          onClick={onClose}
          className="bg-surface-sunken flex h-7 w-7 flex-none items-center justify-center rounded-[9px]"
        >
          <X size={16} strokeWidth={1.8} className="text-ink-soft" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <RestaurantStatusBadge status={restaurant.status} />
        {restaurant.categories[0] && (
          <CategoryChip category={restaurant.categories[0]} />
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <RestaurantStatusToggle
          status={restaurant.status}
          onChange={(status) => {
            onStatusChange(restaurant.id, status);
          }}
          className="flex-1"
        />
        {restaurant.websiteUrl && (
          <a
            href={restaurant.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nettside"
            className="border-border-strong flex h-11 w-11 flex-none items-center justify-center rounded-lg border"
          >
            <ExternalLink size={18} strokeWidth={1.8} className="text-ink-soft" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Se design/README.md — skjerm 1 (kartflate 236px) og skjerm 2 (kart
 * utvidet). Høyden styres internt av `expanded`-propen fremfor en ekstern
 * `className`, siden begge tilstandene er del av selve designspesifikasjonen
 * (ikke noe som varierer per plassering i DOM-treet).
 */
export function RestaurantMap({
  restaurants,
  selectedId,
  onSelectRestaurant,
  onStatusChange,
  expanded,
  onExpandedChange,
  emptyOverlayLabel,
}: RestaurantMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_MAP_CENTER.lng,
    latitude: DEFAULT_MAP_CENTER.lat,
    zoom: DEFAULT_MAP_ZOOM,
  });

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId) ?? null,
    [restaurants, selectedId],
  );

  // Fokus ved filterbytte (se design/README.md): fitBounds på synlige pins,
  // 48px padding, maks zoom 14. `restaurants` er allerede det filtrerte
  // utvalget (RestaurantsPage regner det ut på nytt per filterbytte).
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || restaurants.length === 0) {
      return;
    }
    const lngs = restaurants.map((restaurant) => restaurant.lng);
    const lats = restaurants.map((restaurant) => restaurant.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 14, duration: 400 },
    );
  }, [restaurants]);

  // Mapbox GL resizer canvasen automatisk ved vindusresize, men container-
  // høyden endrer seg her uten noen vindusresize (kun `expanded`-klassen
  // bytter). Uten dette blir canvasen stående i forrige størrelse med tomt
  // bakgrunnsfelt under når kartet utvides til fullskjerm.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }
    const id = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  // Delt seleksjon (se design/README.md): easeTo valgt punkt med offset
  // nedover så popupen får plass over pinnen.
  useEffect(() => {
    if (!selectedRestaurant) {
      return;
    }
    mapRef.current?.getMap().easeTo({
      center: [selectedRestaurant.lng, selectedRestaurant.lat],
      // Positiv y i mapbox sin `offset` flytter det fokuserte punktet NED på
      // skjermen (ikke opp) — gir dermed rom for popupen som åpner over
      // pinnen.
      offset: [0, 60],
      duration: 400,
    });
  }, [selectedRestaurant]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="border-border text-ink-muted flex h-[236px] items-center justify-center border-b p-4 text-center text-sm">
        Kartet er ikke tilgjengelig ennå — VITE_MAPBOX_TOKEN mangler.
      </div>
    );
  }

  return (
    <div
      className={
        expanded ? "fixed inset-0 z-30 mx-auto max-w-md" : "relative h-[236px] w-full"
      }
    >
      {/* `overflow-hidden` på selve containeren ville klippet popupen (som
          bevisst stikker opp over kartflaten når den er valgt nær toppen) —
          kart-canvasen klipper seg selv naturlig via egen width/height 100%. */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(event) => {
          setViewState(event.viewState);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        onClick={() => {
          if (expanded) {
            onSelectRestaurant(null);
            return;
          }
          onExpandedChange(true);
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
            anchor="bottom"
            offset={22}
            closeButton={false}
            closeOnClick={false}
            maxWidth="none"
            className="foodie-popup"
            onClose={() => {
              onSelectRestaurant(null);
            }}
          >
            <RestaurantPopupContent
              restaurant={selectedRestaurant}
              onClose={() => {
                onSelectRestaurant(null);
              }}
              onStatusChange={onStatusChange}
            />
          </Popup>
        )}
      </Map>

      {/* Kart-kontrollknapp — lokaliser meg (se design/README.md). */}
      <button
        type="button"
        aria-label="Vis min posisjon"
        onClick={(event) => {
          event.stopPropagation();
          if (!navigator.geolocation) {
            return;
          }
          navigator.geolocation.getCurrentPosition((position) => {
            mapRef.current?.getMap().easeTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 14,
              duration: 400,
            });
          });
        }}
        className="border-border-strong bg-bg absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border shadow-[0_2px_8px_rgba(42,37,32,0.14)]"
      >
        <Locate size={18} strokeWidth={1.8} className="text-ink-soft" />
      </button>

      {/* Tom tilstand (se design/README.md, skjerm 6/7): dempet slør over
          kartflaten når det ikke er noen synlige pins. */}
      {restaurants.length === 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "rgba(250,247,240,0.55)" }}
        />
      )}
      {restaurants.length === 0 && emptyOverlayLabel && (
        <div className="border-border-strong bg-bg text-ink-muted absolute inset-x-0 bottom-[14px] z-10 mx-auto flex h-[30px] w-fit items-center rounded-full border px-3 font-mono text-[10px] tracking-[0.04em] uppercase">
          {emptyOverlayLabel}
        </div>
      )}

      {!expanded && (
        <div
          aria-hidden="true"
          className="from-bg pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t to-transparent"
        />
      )}

      {expanded && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onExpandedChange(false);
          }}
          className="bg-bg border-border-strong text-ink absolute inset-x-0 bottom-[30px] z-10 mx-auto flex h-12 w-fit items-center gap-2 rounded-xl border px-[22px] text-[15px] font-semibold shadow-[0_8px_20px_rgba(42,37,32,0.18)]"
        >
          <List size={16} strokeWidth={1.8} />
          Vis liste
        </button>
      )}
    </div>
  );
}
