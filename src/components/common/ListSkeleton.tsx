const PILL_WIDTHS = [74, 104, 92];
const CARD_LINE_WIDTHS = ["60%", "40%", "35%"];

/**
 * Se design/README.md, skjerm 5 ("Lastetilstand"). Filterrad med tomme
 * grå kapsler, kartflate med «KART LASTER», tre skjelettkort (det tredje
 * dempet), og en liten spinner med tekst nederst. Rendres i stedet for
 * filterrad/kart/liste — headeren rundt (tittel, uten teller) beholdes av
 * `RestaurantsPage`.
 */
export function ListSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Laster restauranter …</span>

      <div
        aria-hidden="true"
        className="border-border flex gap-2 border-b px-5 pt-3 pb-2.5"
      >
        {PILL_WIDTHS.map((width, index) => (
          <span
            key={index}
            className="bg-surface-sunken h-[38px] rounded-full"
            style={{ width }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="flex h-[236px] w-full items-center justify-center"
        style={{ background: "#E9E6DA" }}
      >
        <span className="text-ink-faint font-mono text-[11px] tracking-[0.04em] uppercase">
          Kart laster
        </span>
      </div>

      <div aria-hidden="true" className="flex flex-col gap-2.5 px-4 pt-3 pb-6">
        {CARD_LINE_WIDTHS.map((width, index) => (
          <div
            key={index}
            className={`bg-surface flex flex-col gap-[7px] rounded-2xl border px-4 py-[14px] ${
              index === 2 ? "opacity-60" : ""
            }`}
            style={{ borderColor: "#EDE8DC" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <span
                  className="h-[15px] rounded-sm"
                  style={{ width, background: "#EDE8DC" }}
                />
                <span
                  className="bg-surface-sunken h-[11px] rounded-sm"
                  style={{ width: "80%" }}
                />
              </div>
              <span
                className="bg-surface-sunken h-5 w-16 flex-none rounded-md"
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 pb-8">
        <span
          aria-hidden="true"
          className="border-border-strong border-t-accent h-3.5 w-3.5 animate-spin rounded-full border-2"
        />
        <span className="text-ink-muted text-[14px]">Laster restauranter …</span>
      </div>
    </div>
  );
}
