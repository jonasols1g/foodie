import { RESTAURANT_STATUS_LABEL, type RestaurantStatus } from "../../types/restaurant";

export interface RestaurantStatusBadgeProps {
  status: RestaurantStatus;
}

// Se design/README.md — "Statusbadge": høyde 24, px-[9px], rounded-md,
// 11/600, letter-spacing 0.04em, uppercase.
const STATUS_CLASSNAME: Record<RestaurantStatus, string> = {
  planned: "bg-planned-soft text-planned-ink",
  visited: "bg-visited-soft text-visited-ink",
};

export function RestaurantStatusBadge({ status }: RestaurantStatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md px-[9px] text-[11px] font-semibold tracking-[0.04em] uppercase ${STATUS_CLASSNAME[status]}`}
    >
      {RESTAURANT_STATUS_LABEL[status]}
    </span>
  );
}
