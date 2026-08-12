import { RESTAURANT_STATUS_LABEL, type RestaurantStatus } from "../../types/restaurant";

export interface RestaurantStatusBadgeProps {
  status: RestaurantStatus;
}

const STATUS_CLASSNAME: Record<RestaurantStatus, string> = {
  planned: "bg-planned/15 text-planned",
  visited: "bg-visited/15 text-visited",
};

export function RestaurantStatusBadge({ status }: RestaurantStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSNAME[status]}`}
    >
      {RESTAURANT_STATUS_LABEL[status]}
    </span>
  );
}
