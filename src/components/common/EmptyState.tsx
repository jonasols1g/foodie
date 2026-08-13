import type { ReactNode } from "react";
import { MapPin } from "lucide-react";

export interface EmptyStateProps {
  /** Se design/README.md, skjerm 6 ("none") og skjerm 7 ("filter"). */
  variant?: "none" | "filter";
  heading: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ variant = "filter", heading, message, action }: EmptyStateProps) {
  const isNone = variant === "none";

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {isNone && (
        <div
          aria-hidden="true"
          className="bg-surface-sunken border-[#D2C9B8] flex h-16 w-16 items-center justify-center rounded-[22px] border border-dashed"
        >
          <MapPin size={26} strokeWidth={1.6} className="text-ink-faint" />
        </div>
      )}
      <p className={`text-ink ${isNone ? "text-[20px] font-semibold" : "text-[17px] font-semibold"}`}>
        {heading}
      </p>
      {message && (
        <p
          className={`text-ink-muted ${
            isNone ? "max-w-[300px] text-[15px] leading-[1.5]" : "text-[14px]"
          }`}
        >
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
