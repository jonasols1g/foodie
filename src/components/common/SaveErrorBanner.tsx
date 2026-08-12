export interface SaveErrorBannerProps {
  onDismiss: () => void;
}

/** Vises når siste lagringsforsøk mot Firestore feilet (se RestaurantContext). */
export function SaveErrorBanner({ onDismiss }: SaveErrorBannerProps) {
  return (
    <div
      role="alert"
      className="border-brand/40 bg-brand/10 mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
    >
      <span>Kunne ikke lagre endringen. Prøv gjerne på nytt.</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Lukk feilmelding"
        className="text-text-muted hover:text-text-primary shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        ✕
      </button>
    </div>
  );
}
