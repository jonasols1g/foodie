export interface AddPlaceButtonProps {
  onClick: () => void;
  /** `"accent"` brukes når dette er skjermens eneste handling (se
   * design/README.md, skjerm 6 — tom tilstand uten restauranter). */
  variant?: "default" | "accent";
}

// Se design/README.md — "Bunnknapp": fixed container med en gradient fra
// transparent til --color-bg så listen glir under knappen.
export function AddPlaceButton({ onClick, variant = "default" }: AddPlaceButtonProps) {
  return (
    <div className="from-bg from-40% to-transparent pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t px-5 pt-4 pb-[30px]">
      <button
        type="button"
        onClick={onClick}
        className={`pointer-events-auto flex h-[52px] w-full items-center justify-center gap-[9px] rounded-xl text-[16px] font-semibold shadow-[0_8px_20px_rgba(42,37,32,0.22)] transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
          variant === "accent" ? "bg-accent text-white" : "bg-ink text-bg"
        }`}
      >
        <span className="text-[20px] leading-none">+</span>
        Legg til restaurant
      </button>
    </div>
  );
}
