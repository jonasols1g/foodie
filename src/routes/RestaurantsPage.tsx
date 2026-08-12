import { useMemo, useState } from "react";
import { AddRestaurantModal } from "../components/restaurants/AddRestaurantModal";
import {
  RestaurantFilterBar,
  type RestaurantStatusFilter,
} from "../components/restaurants/RestaurantFilterBar";
import { RestaurantList } from "../components/restaurants/RestaurantList";
import { RestaurantMap } from "../components/map/RestaurantMap";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { useRestaurants } from "../context/RestaurantContext";

const EMPTY_MESSAGE: Record<RestaurantStatusFilter, string> = {
  all: "Ingen restauranter lagt til ennå.",
  planned: "Ingen planlagte restauranter.",
  visited: "Ingen besøkte restauranter ennå.",
};

export function RestaurantsPage() {
  const { restaurants, isLoading, setStatus, removeRestaurant } = useRestaurants();
  const [statusFilter, setStatusFilter] = useState<RestaurantStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? restaurants
        : restaurants.filter((restaurant) => restaurant.status === statusFilter),
    [restaurants, statusFilter],
  );

  if (isLoading) {
    return <LoadingSpinner label="Laster restauranter …" />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <RestaurantFilterBar value={statusFilter} onChange={setStatusFilter} />
        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
          }}
          className="bg-brand rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          + Legg til restaurant
        </button>
      </div>
      {/* Layout-valget (grid her, kan bli faner/stack senere når designet er
          bestemt) — RestaurantList og RestaurantMap er begge
          layout-agnostiske og deler kun `selectedId`, så de kan omorganiseres
          fritt uten å røre datalogikk. */}
      <div className="grid gap-4 md:grid-cols-2">
        <RestaurantList
          restaurants={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onStatusChange={setStatus}
          onRemove={removeRestaurant}
          emptyMessage={EMPTY_MESSAGE[statusFilter]}
        />
        <RestaurantMap
          restaurants={filtered}
          selectedId={selectedId}
          onSelectRestaurant={setSelectedId}
          className="md:sticky md:top-4 md:h-[calc(100vh-8rem)]"
        />
      </div>

      {isAddModalOpen && (
        <AddRestaurantModal
          onClose={() => {
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
