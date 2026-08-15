import type { RestaurantStatus } from "../../types/restaurant";

export type RestaurantStatusFilter = RestaurantStatus | "all";

export interface RestaurantFilterBarProps {
  value: RestaurantStatusFilter;
  onChange: (value: RestaurantStatusFilter) => void;
  counts: Record<RestaurantStatusFilter, number>;
}

const OPTIONS: { value: RestaurantStatusFilter; label: string }[] = [
  { value: "planned", label: "Planlagt" },
  { value: "visited", label: "Besøkt" },
  { value: "all", label: "Alle" },
];

// Prikkfarge foran inaktive Planlagt/Besøkt-piller (se design/README.md).
const DOT_CLASSNAME: Partial<Record<RestaurantStatusFilter, string>> = {
  planned: "bg-planned",
  visited: "bg-visited",
};

export function RestaurantFilterBar({
  value,
  onChange,
  counts,
}: RestaurantFilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer restauranter etter status"
      className="flex gap-2"
    >
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        const dotClassName = DOT_CLASSNAME[option.value];
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              onChange(option.value);
            }}
            className={`flex h-[38px] items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${
              isActive
                ? "bg-ink text-bg"
                : "bg-surface border-border-strong text-ink-soft border"
            }`}
          >
            {!isActive && dotClassName && (
              <span
                aria-hidden="true"
                className={`h-[7px] w-[7px] rounded-full ${dotClassName}`}
              />
            )}
            <span>{option.label}</span>
            <span
              aria-hidden="true"
              className={isActive ? "opacity-55" : "text-ink-faint"}
            >
              {counts[option.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
