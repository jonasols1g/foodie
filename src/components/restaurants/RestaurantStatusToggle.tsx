import type { RestaurantStatus } from "../../types/restaurant";

export interface RestaurantStatusToggleProps {
  status: RestaurantStatus;
  onChange: (status: RestaurantStatus) => void;
}

export function RestaurantStatusToggle({
  status,
  onChange,
}: RestaurantStatusToggleProps) {
  const nextStatus: RestaurantStatus = status === "visited" ? "planned" : "visited";
  const label =
    status === "visited" ? "Sett som planlagt" : "Marker som besøkt";

  return (
    <button
      type="button"
      onClick={() => {
        onChange(nextStatus);
      }}
      className="border-surface-border hover:bg-surface-border/40 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      {label}
    </button>
  );
}
