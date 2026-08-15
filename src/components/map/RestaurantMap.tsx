import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { ExternalLink, List, Locate, Plus, X } from "lucide-react";
import type { Restaurant, RestaurantStatus } from "../../types/restaurant";
import type { RetrievedPlace } from "../../types/place";
import { RestaurantStatusBadge } from "../restaurants/RestaurantStatusBadge";
import { RestaurantStatusToggle } from "../restaurants/RestaurantStatusToggle";
import { useRestaurants } from "../../context/RestaurantContext";
import { retrievePlaceNearPoi } from "../../hooks/usePlaceSearch";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAPBOX_STYLE_URL,
  MAPBOX_TOKEN,
} from "../../services/map/mapboxConfig";
import { RestaurantMarker } from "./RestaurantMarker";

/** Ekte Mapbox-POI klikket i kartet, som ennå ikke finnes i brukerens liste. */
interface PendingPoi {
  /** `navn:lng:lat` — identifiserer klikket punkt, brukes til å forkaste et
   * asynkront oppslag-svar som kommer tilbake etter at et nytt punkt er
   * klikket (eller popupen lukket) i mellomtiden. */
  key: string;
  name: string;
  lng: number;
  lat: number;
  place: RetrievedPlace | null;
  lookupStatus: "loading" | "ready" | "error";
}

// Et POI regnes som samme sted som en eksisterende restaurant ved likt navn
// (case-insensitive) innenfor en grov ~50m-radius — presist nok til å unngå
// duplikater uten å måtte gjøre et nettverkskall for å sjekke.
const DUPLICATE_LAT_TOLERANCE = 0.0006;
const DUPLICATE_LNG_TOLERANCE = 0.001;

function findExistingRestaurant(
  restaurants: Restaurant[],
  name: string,
  lng: number,
  lat: number,
): Restaurant | null {
  const normalizedName = name.trim().toLowerCase();
  return (
    restaurants.find(
      (restaurant) =>
        restaurant.name.trim().toLowerCase() === normalizedName &&
        Math.abs(restaurant.lat - lat) < DUPLICATE_LAT_TOLERANCE &&
        Math.abs(restaurant.lng - lng) < DUPLICATE_LNG_TOLERANCE,
    ) ?? null
  );
}

// Lokal, minimal form for et Mapbox GL-feature — unngår å referere
// mapbox-gl sin egen `GeoJSONFeature`-type direkte, som typescript-eslint sin
// type-aware linting (i motsetning til `tsc` selv) ikke klarer å resolve
// nedover i geometri-/properties-unionene (feiler med "type that cannot be
// resolved" på nettopp de feltene, se PR-diskusjon).
interface PoiClickFeature {
  layer?: { id?: string };
  properties: Record<string, unknown> | null;
  geometry: { type: string; coordinates: number[] };
}

/** Plukker ut navn + posisjon fra et `poi-label`-treff i et kartklikk. */
function extractPoiFeatureInfo(
  feature: PoiClickFeature | undefined,
): { name: string; lng: number; lat: number } | null {
  if (!feature || feature.geometry.type !== "Point") {
    return null;
  }
  const [lng, lat] = feature.geometry.coordinates;
  const name = feature.properties?.name;
  if (typeof name !== "string" || name.trim() === "") {
    return null;
  }
  return { name, lng, lat };
}

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

function PendingPoiPopupContent({
  name,
  place,
  lookupStatus,
  onClose,
  onAdd,
}: {
  name: string;
  place: RetrievedPlace | null;
  lookupStatus: PendingPoi["lookupStatus"];
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex w-[248px] flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-ink text-[17px] font-semibold">{name}</p>
          <p className="text-ink-muted text-[13px]">
            {lookupStatus === "ready" && place
              ? place.address
              : lookupStatus === "error"
                ? "Fant ikke stedet — prøv søk i stedet."
                : "Henter informasjon …"}
          </p>
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
      <button
        type="button"
        onClick={onAdd}
        disabled={lookupStatus !== "ready"}
        className="bg-accent flex h-11 items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold text-white transition disabled:opacity-50"
      >
        <Plus size={16} strokeWidth={2} />
        Legg til restaurant
      </button>
    </div>
  );
}

// Skjul andre POI-er enn mat/drikke (hotell, museer, skoler, kirker,
// matbutikker osv.) i standardstilen `streets-v12` — bruker er kun
// interessert i restauranter/barer/lignende på selve kartflaten.
// `poi-label` (kilde-lag `poi_label`) er Mapbox sitt generelle POI-lag; klassen
// "food_and_drink" dekker restaurant/bar/cafe/pub/fast food/nightclub, mens
// f.eks. matbutikker ligger i en egen klasse ("food_and_drink_stores") og
// filtreres dermed bort med resten. Kollektivstopp (T-bane/buss/trikk) ligger
// i et helt separat lag (`transit-label`, kilde-lag `transit_stop_label`) og
// berøres ikke av dette.
function restrictPoiLabelsToFoodAndDrink(map: ReturnType<MapRef["getMap"]>) {
  if (!map.getLayer("poi-label")) {
    return;
  }
  const existingFilter = map.getFilter("poi-label");
  const nextFilter = [
    "all",
    ...(existingFilter ? [existingFilter] : []),
    ["==", ["get", "class"], "food_and_drink"],
  ];
  map.setFilter("poi-label", nextFilter as never);
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
  const [pendingPoi, setPendingPoi] = useState<PendingPoi | null>(null);
  // Hele (ufiltrerte) datasettet — `restaurants`-propen er allerede filtrert
  // av RestaurantsPage, men duplikatsjekken ved POI-klikk må gjelde alle
  // brukerens steder uansett gjeldende filter.
  const { restaurants: allRestaurants, addRestaurant } = useRestaurants();

  // Slår opp i hele (ufiltrerte) datasettet, ikke bare `restaurants`-propen —
  // et POI-klikk (under) kan velge en restaurant som finnes i listen, men som
  // faller utenfor gjeldende statusfilter og dermed ikke har en egen pin.
  const selectedRestaurant = useMemo(
    () => allRestaurants.find((restaurant) => restaurant.id === selectedId) ?? null,
    [allRestaurants, selectedId],
  );

  // Et POI som allerede finnes i listen skal ikke tilby "legg til" på nytt —
  // klikk på det velger heller det eksisterende stedet, med samme popup som
  // ellers.
  function handlePoiClick(name: string, lng: number, lat: number) {
    const existing = findExistingRestaurant(allRestaurants, name, lng, lat);
    if (existing) {
      setPendingPoi(null);
      onSelectRestaurant(existing.id);
      return;
    }

    onSelectRestaurant(null);
    const key = `${name}:${lng}:${lat}`;
    setPendingPoi({ key, name, lng, lat, place: null, lookupStatus: "loading" });

    retrievePlaceNearPoi(name, { lng, lat })
      .then((place) => {
        setPendingPoi((current) => {
          if (!current || current.key !== key) {
            return current;
          }
          return place
            ? { ...current, place, lookupStatus: "ready" }
            : { ...current, lookupStatus: "error" };
        });
      })
      .catch((error: unknown) => {
        console.error("[RestaurantMap] Kunne ikke slå opp POI", error);
        setPendingPoi((current) =>
          current && current.key === key ? { ...current, lookupStatus: "error" } : current,
        );
      });
  }

  function handleAddPendingPoi() {
    if (!pendingPoi?.place) {
      return;
    }
    const place = pendingPoi.place;
    addRestaurant(
      {
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        mapboxId: place.mapboxId,
        categories: place.categories,
        websiteUrl: place.websiteUrl,
        notes: "",
      },
      "planned",
    );
    setPendingPoi(null);
  }

  // Fokus på klikket POI, samme oppførsel som ved valg av egen pin (se
  // useEffect for `selectedRestaurant` under).
  useEffect(() => {
    if (!pendingPoi) {
      return;
    }
    mapRef.current?.getMap().easeTo({
      center: [pendingPoi.lng, pendingPoi.lat],
      offset: [0, 60],
      duration: 400,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPoi?.key]);

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
        ref={(instance) => {
          // `onLoad` (native 'load') fyres upålitelig her — kartet er en
          // kontrollert komponent (viewState går tur-retur via onMove), noe
          // som ser ut til å holde `map.loaded()` evig `false` og dermed
          // aldri trigge 'load'. Ref-callbacken kjører derimot pålitelig med
          // det samme instansen blir klar (se @vis.gl/react-mapbox sin
          // useImperativeHandle), og 'style.load' venter kun på selve
          // stilen/kildene — ikke på at alle fliser er ferdig lastet.
          mapRef.current = instance;
          if (!instance) {
            return;
          }
          const map = instance.getMap();
          if (map.isStyleLoaded()) {
            restrictPoiLabelsToFoodAndDrink(map);
          } else {
            map.once("style.load", () => {
              restrictPoiLabelsToFoodAndDrink(map);
            });
          }
        }}
        {...viewState}
        onMove={(event) => {
          setViewState(event.viewState);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        // `poi-label` er allerede filtrert til mat/drikke-POI-er (se
        // restrictPoiLabelsToFoodAndDrink) — et klikk som treffer laget er
        // dermed alltid en restaurant/bar/kafé man kan legge til.
        interactiveLayerIds={["poi-label"]}
        onClick={(event) => {
          const features = event.features as unknown as PoiClickFeature[] | undefined;
          const poi = extractPoiFeatureInfo(
            features?.find((feature) => feature.layer?.id === "poi-label"),
          );
          if (poi) {
            handlePoiClick(poi.name, poi.lng, poi.lat);
            return;
          }

          setPendingPoi(null);
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
            onClick={(id) => {
              setPendingPoi(null);
              onSelectRestaurant(id);
            }}
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

        {pendingPoi && (
          <Popup
            longitude={pendingPoi.lng}
            latitude={pendingPoi.lat}
            anchor="bottom"
            offset={22}
            closeButton={false}
            closeOnClick={false}
            maxWidth="none"
            className="foodie-popup"
            onClose={() => {
              setPendingPoi(null);
            }}
          >
            <PendingPoiPopupContent
              name={pendingPoi.name}
              place={pendingPoi.place}
              lookupStatus={pendingPoi.lookupStatus}
              onClose={() => {
                setPendingPoi(null);
              }}
              onAdd={handleAddPendingPoi}
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
        className={`border-border-strong bg-bg absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border shadow-[0_2px_8px_rgba(42,37,32,0.14)] ${
          // I utvidet visning flyter filterpillene (RestaurantsPage) over
          // kartet fra top-3 og ned — knappen må stå lavere enn dem for ikke
          // å bli dekket.
          expanded ? "top-20" : "top-3"
        }`}
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
