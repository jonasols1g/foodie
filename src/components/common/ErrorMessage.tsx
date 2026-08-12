export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="border-brand/40 bg-brand/10 flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 text-center"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-brand rounded-xl px-4 py-2 font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Prøv igjen
        </button>
      )}
    </div>
  );
}
