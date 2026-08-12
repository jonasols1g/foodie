import type { PlaceSuggestion } from "../../types/place";

export interface PlaceSearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: PlaceSuggestion[];
  isSearching: boolean;
  onSelect: (suggestion: PlaceSuggestion) => void;
}

export function PlaceSearchInput({
  query,
  onQueryChange,
  suggestions,
  isSearching,
  onSelect,
}: PlaceSearchInputProps) {
  return (
    <div>
      <label htmlFor="place-search" className="mb-1 block text-sm font-medium">
        Søk etter restaurant
      </label>
      <input
        id="place-search"
        type="text"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls="place-search-results"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
        placeholder="Skriv navn på restaurant …"
        className="border-surface-border w-full rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      />

      {isSearching && (
        <p className="text-text-muted mt-1 text-xs">Søker …</p>
      )}

      {suggestions.length > 0 && (
        <ul
          id="place-search-results"
          role="listbox"
          className="border-surface-border mt-2 max-h-64 divide-y overflow-y-auto rounded-lg border"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion.mapboxId} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onSelect(suggestion);
                }}
                className="hover:bg-surface-border/30 block w-full px-3 py-2 text-left text-sm"
              >
                <span className="block font-medium">{suggestion.name}</span>
                {suggestion.address && (
                  <span className="text-text-muted block text-xs">
                    {suggestion.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
