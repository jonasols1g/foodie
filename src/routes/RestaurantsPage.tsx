import { useMemo, useRef, useState } from "react";
import { AddPlaceButton } from "../components/restaurants/AddPlaceButton";
import { AddPlaceSheet } from "../components/restaurants/AddPlaceSheet";
import {
  RestaurantFilterBar,
  type RestaurantStatusFilter,
} from "../components/restaurants/RestaurantFilterBar";
import { RestaurantList } from "../components/restaurants/RestaurantList";
import { RestaurantMap } from "../components/map/RestaurantMap";
import { ListSkeleton } from "../components/common/ListSkeleton";
import { SaveErrorBanner } from "../components/common/SaveErrorBanner";
import { useRestaurants } from "../context/RestaurantContext";
import type { RestaurantStatus } from "../types/restaurant";

const EXIT_ANIMATION_MS = 200;

// Se design/README.md, skjerm 7 — copy for filter-tom-tilstand per status.
// "Alle" dekkes ikke her: er datasettet ikke tomt, kan "Alle" aldri gi et
// tomt filtrert utvalg.
const FILTER_EMPTY_COPY: Record<
  Exclude<RestaurantStatusFilter, "all">,
  { heading: string; message: string }
> = {
  planned: {
    heading: "Ingen planlagte restauranter.",
    message: "Legg til et sted du har lyst til å prøve.",
  },
  visited: {
    heading: "Ingen besøkte restauranter ennå.",
    message: "Marker et sted som besøkt når du har vært der.",
  },
};

export function RestaurantsPage() {
  const {
    restaurants,
    isLoading,
    saveError,
    dismissSaveError,
    setStatus,
    removeRestaurant,
  } = useRestaurants();
  const [statusFilter, setStatusFilter] = useState<RestaurantStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  // Se design/README.md — "Statusendring": et sted som faller ut av
  // gjeldende filter holdes synlig litt lenger (animeres ut) istedenfor å
  // forsvinne momentant. Styrt eksplisitt fra `handleStatusChange` — ikke
  // utledet via array-diffing av `restaurants`, som ikke kan skille en reell
  // fjerning fra at en midlertidig Firestore-ID byttes ut med den ekte ved
  // vellykket lagring (se RestaurantContext.addRestaurant).
  const [exitingIds, setExitingIds] = useState<ReadonlySet<string>>(new Set());
  const exitTimersRef = useRef(new Map<string, number>());

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? restaurants
        : restaurants.filter(
            (restaurant) =>
              restaurant.status === statusFilter || exitingIds.has(restaurant.id),
          ),
    [restaurants, statusFilter, exitingIds],
  );

  function handleStatusChange(id: string, status: RestaurantStatus) {
    const willLeaveFilter = statusFilter !== "all" && status !== statusFilter;
    if (willLeaveFilter) {
      setExitingIds((previous) => new Set(previous).add(id));
      const existingTimer = exitTimersRef.current.get(id);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }
      const timer = window.setTimeout(() => {
        setExitingIds((previous) => {
          const next = new Set(previous);
          next.delete(id);
          return next;
        });
        exitTimersRef.current.delete(id);
      }, EXIT_ANIMATION_MS);
      exitTimersRef.current.set(id, timer);
    }
    setStatus(id, status);
  }

  // Antallene i filterpillene regnes alltid ut fra hele datasettet, ikke det
  // filtrerte utvalget (se design/README.md).
  const counts = useMemo<Record<RestaurantStatusFilter, number>>(
    () => ({
      all: restaurants.length,
      planned: restaurants.filter((restaurant) => restaurant.status === "planned")
        .length,
      visited: restaurants.filter((restaurant) => restaurant.status === "visited")
        .length,
    }),
    [restaurants],
  );

  // Delt seleksjon (se design/README.md): trykk på et allerede valgt kort/
  // pin, eller `null` eksplisitt (popup-lukk, kartbakgrunn), nullstiller.
  function handleSelect(id: string | null) {
    setSelectedId((previous) => (id !== null && previous === id ? null : id));
  }

  const hasAnyRestaurants = restaurants.length > 0;
  const filterEmptyCopy =
    statusFilter !== "all" ? FILTER_EMPTY_COPY[statusFilter] : null;

  const headerCounter = isLoading
    ? null
    : statusFilter !== "all" && filtered.length === 0 && hasAnyRestaurants
      ? `${filtered.length} AV ${restaurants.length}`
      : `${restaurants.length} ${restaurants.length === 1 ? "STED" : "STEDER"}`;

  return (
    <div>
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <h1 className="text-ink text-2xl font-bold tracking-[-0.02em]">Foodie</h1>
        {headerCounter && (
          <span className="text-ink-muted font-mono text-[11px] tracking-[0.04em] uppercase">
            {headerCounter}
          </span>
        )}
      </header>

      {saveError && (
        <div className="px-5 pb-3">
          <SaveErrorBanner onDismiss={dismissSaveError} />
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <>
          <RestaurantMap
            restaurants={filtered}
            selectedId={selectedId}
            onSelectRestaurant={handleSelect}
            onStatusChange={handleStatusChange}
            expanded={mapExpanded}
            onExpandedChange={setMapExpanded}
            emptyOverlayLabel={
              hasAnyRestaurants && filtered.length === 0
                ? "INGEN PINS I DETTE FILTERET"
                : undefined
            }
          />

          {mapExpanded ? (
            <div className="fixed inset-x-0 top-3 z-40 mx-auto flex max-w-md justify-center px-5">
              <div className="bg-bg rounded-full px-2 py-1.5 shadow-[0_3px_10px_rgba(42,37,32,0.14)]">
                <RestaurantFilterBar
                  value={statusFilter}
                  onChange={setStatusFilter}
                  counts={counts}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="border-border border-b px-5 pt-3 pb-2.5">
                <RestaurantFilterBar
                  value={statusFilter}
                  onChange={setStatusFilter}
                  counts={counts}
                />
              </div>

              <RestaurantList
                restaurants={filtered}
                selectedId={selectedId}
                onSelect={handleSelect}
                onStatusChange={handleStatusChange}
                onRemove={removeRestaurant}
                exitingIds={exitingIds}
                emptyVariant={hasAnyRestaurants ? "filter" : "none"}
                emptyHeading={
                  hasAnyRestaurants ? (filterEmptyCopy?.heading ?? "") : "Ingen steder ennå"
                }
                emptyMessage={
                  hasAnyRestaurants
                    ? filterEmptyCopy?.message
                    : "Legg til den første restauranten du har lyst til å prøve — den havner i listen og på kartet."
                }
                emptyAction={
                  hasAnyRestaurants && filterEmptyCopy ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                      }}
                      className="bg-surface border-border-strong text-ink h-11 rounded-lg border px-4 text-[14px] font-semibold"
                    >
                      Vis alle {restaurants.length}
                    </button>
                  ) : undefined
                }
              />

              <AddPlaceButton
                variant={hasAnyRestaurants ? "default" : "accent"}
                onClick={() => {
                  setIsAddSheetOpen(true);
                }}
              />
            </>
          )}
        </>
      )}

      {isAddSheetOpen && (
        <AddPlaceSheet
          onClose={() => {
            setIsAddSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
