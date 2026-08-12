export interface CategoryChipProps {
  category: string;
}

// Se design/README.md — "Kategori-chip": høyde 22, px-2, rounded-sm,
// bg-surface-sunken, text-ink-muted, mono 11px, som de kommer fra Mapbox
// (ingen tekst-transform).
export function CategoryChip({ category }: CategoryChipProps) {
  return (
    <span className="bg-surface-sunken text-ink-muted font-mono inline-flex h-[22px] items-center rounded-sm px-2 text-[11px]">
      {category}
    </span>
  );
}
