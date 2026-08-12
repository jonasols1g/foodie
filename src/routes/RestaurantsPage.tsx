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
      {/* Kontrollene stables vertikalt og bruker full bredde — plass er
          knapp på mobil, og et forsøk på å presse filter + legg-til-knapp
          inn på én rad klemmer dem for smale til å være gode trykkmål. */}
      <div className="mb-4 flex flex-col gap-3">
        <RestaurantFilterBar value={statusFilter} onChange={setStatusFilter} />
        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
          }}
          className="bg-brand w-full rounded-xl px-4 py-3 text-base font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          + Legg til restaurant
        </button>
      </div>
      {/* Liste og kart stables alltid under hverandre — appen brukes kun på
          mobil, så det finnes ingen bred nok skjerm å vise dem side ved
          side på. RestaurantList og RestaurantMap er begge layout-agnostiske
          og deler kun `selectedId`, så rekkefølgen kan endres fritt senere
          uten å røre datalogikk. */}
      <div className="flex flex-col gap-4">
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
          className="h-72"
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
