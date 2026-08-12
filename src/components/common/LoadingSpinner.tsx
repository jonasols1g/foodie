export interface LoadingSpinnerProps {
  label?: string;
}

/** Delt lastings-tilstand. `role="status"` + `aria-live="polite"` gjør at
 * skjermlesere annonserer at noe laster uten å avbryte fokus. */
export function LoadingSpinner({ label = "Laster …" }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-text-muted flex items-center justify-center gap-3 py-8"
    >
      <span
        aria-hidden="true"
        className="border-surface-border border-t-brand h-6 w-6 animate-spin rounded-full border-2"
      />
      <span>{label}</span>
    </div>
  );
}
