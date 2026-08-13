import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import type { Restaurant, RestaurantStatus } from "../../types/restaurant";
import { RestaurantStatusBadge } from "./RestaurantStatusBadge";
import { RestaurantStatusToggle } from "./RestaurantStatusToggle";

export interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: RestaurantStatus) => void;
  onRemove: (id: string) => void;
}

/**
 * Se design/README.md — "Komponent: RestaurantCard". To visuelle
 * tilstander styrt av `isSelected` (kollapset/valgt), pluss en tredje,
 * lokal tilstand (slett-bekreftelse) som erstatter kortets innhold
 * in-line — ingen egen dialog, ingen undo.
 */
export function RestaurantCard({
  restaurant,
  isSelected,
  onSelect,
  onStatusChange,
  onRemove,
}: RestaurantCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const borderClass = isSelected
    ? "border-[1.5px] border-accent"
    : "border border-border";
  const cardStyle = isSelected
    ? { boxShadow: "0 4px 14px rgba(184,92,51,0.14)" }
    : undefined;

  if (confirmingDelete) {
    return (
      <div
        className={`bg-surface rounded-2xl px-4 py-[14px] ${borderClass}`}
        style={cardStyle}
      >
        <p className="text-ink text-[15px] font-semibold">
          Fjerne «{restaurant.name}» fra listen?
        </p>
        <p className="text-ink-muted mt-1 text-[13px]">Handlingen kan ikke angres.</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
            }}
            className="bg-surface border-border-strong text-ink-soft h-11 flex-1 rounded-lg border text-[14px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => {
              onRemove(restaurant.id);
            }}
            className="bg-accent-strong h-11 flex-1 rounded-lg text-[14px] font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Fjern
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface flex flex-col gap-[7px] rounded-2xl px-4 py-[14px] transition-[border-color,box-shadow] duration-150 ${borderClass}`}
      style={cardStyle}
    >
      <button
        type="button"
        onClick={() => {
          onSelect(restaurant.id);
        }}
        className="flex w-full flex-col gap-[7px] text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-ink text-[17px] font-semibold tracking-[-0.01em]">
              {restaurant.name}
            </h3>
            <p className="text-ink-muted text-[13px]">{restaurant.address}</p>
          </div>
          <RestaurantStatusBadge status={restaurant.status} />
        </div>
      </button>

      {isSelected && (
        <>
          {restaurant.notes && (
            <p className="text-ink-soft text-[13px] leading-[1.45]">
              {restaurant.notes}
            </p>
          )}
          <div className="border-border flex items-center gap-2 border-t pt-1.5">
            <RestaurantStatusToggle
              status={restaurant.status}
              onChange={(status) => {
                onStatusChange(restaurant.id, status);
              }}
              className="flex-1"
            />
            {restaurant.websiteUrl && (
              <a
                href={restaurant.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Nettside"
                className="border-border-strong flex h-11 w-11 flex-none items-center justify-center rounded-lg border"
              >
                <ExternalLink size={18} strokeWidth={1.8} className="text-ink-soft" />
              </a>
            )}
            <button
              type="button"
              aria-label={`Slett ${restaurant.name}`}
              onClick={() => {
                setConfirmingDelete(true);
              }}
              className="border-border-strong flex h-11 w-11 flex-none items-center justify-center rounded-lg border"
            >
              <Trash2 size={18} strokeWidth={1.8} className="text-accent-strong" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
