import type { ReactNode } from "react";

export interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

/** Delt tom-tilstand, f.eks. når filteret ikke gir noen treff. */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-text-muted flex flex-col items-center gap-3 py-8 text-center">
      <p>{message}</p>
      {action}
    </div>
  );
}
