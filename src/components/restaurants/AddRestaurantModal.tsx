import { useState } from "react";
import { useRestaurants } from "../../context/RestaurantContext";
import { usePlaceSearch } from "../../hooks/usePlaceSearch";
import type { PlaceSuggestion, RetrievedPlace } from "../../types/place";
import { PlaceSearchInput } from "../search/PlaceSearchInput";

export interface AddRestaurantModalProps {
  onClose: () => void;
}

/**
 * Legg-til-flyt: søk (Mapbox Search Box) -> velg forslag -> retrieve ->
 * bekreft med notater/nettside-override -> lagre. Modal fremfor egen rute
 * for enklere flyt tilbake til liste/kart (design ikke bestemt ennå, se
 * docs/plan).
 */
export function AddRestaurantModal({ onClose }: AddRestaurantModalProps) {
  const { addRestaurant } = useRestaurants();
  const { suggestions, isSearching, search, retrieve, reset } = usePlaceSearch();
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<RetrievedPlace | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");

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
        console.error("[AddRestaurantModal] Kunne ikke hente sted", error);
        setIsRetrieving(false);
      });
  }

  function handleBackToSearch() {
    setSelectedPlace(null);
    setWebsiteUrl("");
    setNotes("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedPlace === null) {
      return;
    }
    addRestaurant({
      name: selectedPlace.name,
      address: selectedPlace.address,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      mapboxId: selectedPlace.mapboxId,
      categories: selectedPlace.categories,
      websiteUrl: websiteUrl.trim() === "" ? null : websiteUrl.trim(),
      notes: notes.trim(),
    });
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Legg til restaurant"
      className="fixed inset-0 z-20 flex items-start justify-center bg-black/40 p-4 pt-16"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-surface w-full max-w-md rounded-2xl p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Legg til restaurant</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Lukk"
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {selectedPlace === null ? (
          <div>
            <PlaceSearchInput
              query={query}
              onQueryChange={handleQueryChange}
              suggestions={suggestions}
              isSearching={isSearching || isRetrieving}
              onSelect={handleSelectSuggestion}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <p className="font-medium">{selectedPlace.name}</p>
              <p className="text-text-muted text-sm">{selectedPlace.address}</p>
            </div>

            <div>
              <label htmlFor="website-url" className="mb-1 block text-sm font-medium">
                Nettside (valgfritt)
              </label>
              <input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(event) => {
                  setWebsiteUrl(event.target.value);
                }}
                placeholder="https://…"
                className="border-surface-border w-full rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                Notater (valgfritt)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                }}
                rows={3}
                className="border-surface-border w-full rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
            </div>

            <div className="mt-2 flex justify-between gap-2">
              <button
                type="button"
                onClick={handleBackToSearch}
                className="text-text-muted hover:text-text-primary text-sm underline"
              >
                Tilbake til søk
              </button>
              <button
                type="submit"
                className="bg-brand rounded-xl px-4 py-2 font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Legg til
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
