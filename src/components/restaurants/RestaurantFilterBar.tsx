import type { RestaurantStatus } from "../../types/restaurant";

export type RestaurantStatusFilter = RestaurantStatus | "all";

export interface RestaurantFilterBarProps {
  value: RestaurantStatusFilter;
  onChange: (value: RestaurantStatusFilter) => void;
}

const OPTIONS: { value: RestaurantStatusFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "planned", label: "Planlagt" },
  { value: "visited", label: "Besøkt" },
];

export function RestaurantFilterBar({ value, onChange }: RestaurantFilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer restauranter etter status"
      className="border-surface-border mb-4 inline-flex rounded-xl border p-1"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
            value === option.value
              ? "bg-brand text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
