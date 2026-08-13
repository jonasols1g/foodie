import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { useRestaurants } from "../../context/RestaurantContext";
import { usePlaceSearch } from "../../hooks/usePlaceSearch";
import type { PlaceSuggestion, RetrievedPlace } from "../../types/place";
import { RESTAURANT_STATUS_LABEL, type RestaurantStatus } from "../../types/restaurant";

export interface AddPlaceSheetProps {
  onClose: () => void;
}

const MIN_QUERY_LENGTH = 3;
const CLOSE_ANIMATION_MS = 240;
const SWIPE_DISMISS_THRESHOLD = 80;

const STATUS_OPTIONS: RestaurantStatus[] = ["planned", "visited"];

const STATUS_SELECTED_CLASSNAME: Record<RestaurantStatus, string> = {
  planned: "bg-planned-soft border-planned text-planned-ink",
  visited: "bg-visited-soft border-visited text-visited-ink",
};

const STATUS_DOT_CLASSNAME: Record<RestaurantStatus, string> = {
  planned: "bg-planned",
  visited: "bg-visited",
};

/**
 * Bottom sheet i to steg — søk (Mapbox Search Box) og bekreft (se
 * design/README.md, skjermene 3 og 4). Både sveip-ned-lukking (drag-håndtak)
 * og den vanlige åpne/lukke-transisjonen er implementert her, uavhengig av
 * `useRestaurants`/`usePlaceSearch` sin egen state.
 */
export function AddPlaceSheet({ onClose }: AddPlaceSheetProps) {
  const { addRestaurant } = useRestaurants();
  const { suggestions, isSearching, search, retrieve, reset } = usePlaceSearch();
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<RetrievedPlace | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<RestaurantStatus>("planned");

  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  // `isDragging` styrer render (transition på/av) og må derfor være state.
  // `draggingRef` er en ren guard brukt inne i pointer-handlerne, for å
  // unngå at et pointermove/-up som kommer rett etter et pointerdown leser
  // en state-oppdatering som ennå ikke er committet.
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  function requestClose() {
    setEntered(false);
    window.setTimeout(() => {
      reset();
      onClose();
    }, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) {
      return;
    }
    setDragY(Math.max(0, event.clientY - dragStartYRef.current));
  }

  function handlePointerUp() {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    setIsDragging(false);
    if (dragY > SWIPE_DISMISS_THRESHOLD) {
      requestClose();
      return;
    }
    setDragY(0);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    search(nextQuery);
  }

  function handleSelectSuggestion(suggestion: PlaceSuggestion) {
    setIsRetrieving(true);
    retrieve(suggestion.mapboxId)
      .then((place) => {
        setIsRetrieving(false);
        if (place === null) {
          return;
        }
        setSelectedPlace(place);
        setWebsiteUrl(place.websiteUrl ?? "");
      })
      .catch((error: unknown) => {
        console.error("[AddPlaceSheet] Kunne ikke hente sted", error);
        setIsRetrieving(false);
      });
  }

  function handleBackToSearch() {
    setSelectedPlace(null);
    setWebsiteUrl("");
    setNotes("");
    setStatus("planned");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedPlace === null) {
      return;
    }
    addRestaurant(
      {
        name: selectedPlace.name,
        address: selectedPlace.address,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        mapboxId: selectedPlace.mapboxId,
        categories: selectedPlace.categories,
        websiteUrl: websiteUrl.trim() === "" ? null : websiteUrl.trim(),
        notes: notes.trim(),
      },
      status,
    );
    requestClose();
  }

  const showHitCounter =
    selectedPlace === null && query.trim().length >= MIN_QUERY_LENGTH && !isSearching;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={selectedPlace === null ? "Legg til restaurant" : "Bekreft stedet"}
      className="fixed inset-0 z-40 mx-auto flex max-w-md items-end"
    >
      <div
        aria-hidden="true"
        onClick={requestClose}
        className={`absolute inset-0 bg-black/42 transition-opacity duration-[240ms] ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className="bg-bg relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-[0_-8px_30px_rgba(42,37,32,0.24)]"
        style={{
          height: selectedPlace === null ? 660 : 620,
          transform: `translateY(${entered ? dragY : "100%"}px)`,
          transition: isDragging ? "none" : "transform 240ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex touch-none flex-col items-center pt-3.5 pb-1"
        >
          <span aria-hidden="true" className="bg-border-strong h-1 w-10 rounded-full" />
        </div>

        {selectedPlace === null ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-ink text-[20px] font-bold tracking-[-0.02em]">
                Legg til restaurant
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Lukk"
                className="bg-surface-sunken flex h-8 w-8 items-center justify-center rounded-[10px]"
              >
                <X size={18} strokeWidth={1.8} className="text-ink-soft" />
              </button>
            </div>

            <label htmlFor="place-search" className="sr-only">
              Søk etter restaurant
            </label>
            <div
              className={`bg-surface flex h-[52px] items-center gap-2 rounded-lg border px-3.5 transition ${
                "border-border-strong focus-within:border-accent focus-within:ring-accent/12 focus-within:ring-3"
              }`}
            >
              <Search size={16} strokeWidth={1.8} className="text-ink-faint flex-none" />
              <input
                id="place-search"
                type="text"
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="place-search-results"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  handleQueryChange(event.target.value);
                }}
                placeholder="Skriv navn på restaurant …"
                className="text-ink placeholder:text-ink-faint h-full w-full bg-transparent text-[16px] outline-none"
              />
            </div>

            {showHitCounter && (
              <p className="text-ink-faint mt-3 mb-1 font-mono text-[11px] tracking-[0.04em] uppercase">
                {suggestions.length} TREFF I NORGE
              </p>
            )}

            <div
              id="place-search-results"
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {(isRetrieving || isSearching) && (
                <p className="text-ink-muted py-3 text-sm">Søker …</p>
              )}
              {!isSearching &&
                !isRetrieving &&
                showHitCounter &&
                suggestions.length === 0 && (
                  <p className="text-ink-muted py-3 text-sm">
                    Ingen steder matchet søket.
                  </p>
                )}
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.mapboxId}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    handleSelectSuggestion(suggestion);
                  }}
                  className="border-border hover:bg-surface-sunken active:bg-surface-sunken -mx-2 flex min-h-16 w-[calc(100%+16px)] flex-col justify-center rounded-[14px] border-b px-2 py-2 text-left transition last:border-b-0"
                >
                  <span className="text-ink text-[16px] font-semibold">
                    {suggestion.name}
                  </span>
                  {suggestion.address && (
                    <span className="text-ink-muted text-[13px]">
                      {suggestion.address}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-ink-faint mt-2 text-center font-mono text-[10px] tracking-[0.04em] uppercase">
              Søk levert av Mapbox
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToSearch}
                aria-label="Tilbake til søk"
                className="bg-surface-sunken flex h-9 w-9 flex-none items-center justify-center rounded-xl"
              >
                <ChevronLeft size={18} strokeWidth={1.8} className="text-ink-soft" />
              </button>
              <h2 className="text-ink text-[20px] font-bold tracking-[-0.02em]">
                Bekreft stedet
              </h2>
            </div>

            <div className="bg-surface border-border rounded-2xl border p-4">
              <p className="text-ink text-[19px] font-semibold">{selectedPlace.name}</p>
              <p className="text-ink-muted text-[14px]">{selectedPlace.address}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="bg-surface-sunken text-ink-muted inline-flex h-[22px] items-center rounded-sm px-2 font-mono text-[11px]">
                  {selectedPlace.lat.toFixed(3)}, {selectedPlace.lng.toFixed(3)}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <label
                  htmlFor="website-url"
                  className="text-ink-soft text-[13px] font-semibold"
                >
                  Nettside
                </label>
                <span className="text-ink-faint text-[13px]">valgfritt</span>
              </div>
              <input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(event) => {
                  setWebsiteUrl(event.target.value);
                }}
                placeholder="https://…"
                className="bg-surface border-border-strong text-ink h-[50px] w-full rounded-lg border px-3.5 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <label htmlFor="notes" className="text-ink-soft text-[13px] font-semibold">
                  Notater
                </label>
                <span className="text-ink-faint text-[13px]">valgfritt</span>
              </div>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                }}
                rows={3}
                className="bg-surface border-border-strong text-ink h-24 w-full resize-none rounded-lg border px-3.5 py-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
            </div>

            <div>
              <p className="text-ink-soft mb-1.5 text-[13px] font-semibold">Status</p>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setStatus(option);
                      }}
                      className={`flex h-[46px] flex-1 items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition ${
                        isSelected
                          ? `border-[1.5px] ${STATUS_SELECTED_CLASSNAME[option]}`
                          : "bg-surface border-border-strong text-ink-muted border"
                      }`}
                    >
                      {!isSelected && (
                        <span
                          aria-hidden="true"
                          className="bg-ink-faint h-[7px] w-[7px] rounded-full"
                        />
                      )}
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className={`h-[7px] w-[7px] rounded-full ${STATUS_DOT_CLASSNAME[option]}`}
                        />
                      )}
                      {RESTAURANT_STATUS_LABEL[option]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={requestClose}
                className="bg-surface-sunken text-ink-soft h-[52px] w-[100px] flex-none rounded-xl text-[16px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="bg-accent h-[52px] flex-1 rounded-xl text-[16px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Lagre restaurant
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
