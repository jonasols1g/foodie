import type { RestaurantStatus } from "../../types/restaurant";

export interface RestaurantStatusToggleProps {
  status: RestaurantStatus;
  onChange: (status: RestaurantStatus) => void;
  className?: string;
}

// Se design/README.md — "Handlingsrad": planlagt -> "Marker som besøkt"
// (bg-accent, hvit tekst), besøkt -> "Sett som planlagt" (bg-surface,
// border, ink-tekst). Delt mellom RestaurantCard og kart-popupen.
export function RestaurantStatusToggle({
  status,
  onChange,
  className,
}: RestaurantStatusToggleProps) {
  const nextStatus: RestaurantStatus = status === "visited" ? "planned" : "visited";
  const label = status === "visited" ? "Sett som planlagt" : "Marker som besøkt";

  return (
    <button
      type="button"
      onClick={() => {
        onChange(nextStatus);
      }}
      className={`h-11 rounded-lg text-[14px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        status === "visited"
          ? "bg-surface border-border-strong text-ink border"
          : "bg-accent text-white"
      } ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
