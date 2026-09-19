import { cn } from "@/lib/utils";
import { normalizeStatusKey, statusLabel } from "@/lib/tender-constants";
import type { TenderStatus } from "@/types/tender";

const styles: Record<"draft" | "submitted" | "in_progress" | "completed" | "cancelled", string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-info/10 text-info border-info/25",
  in_progress: "bg-warning/15 text-warning-foreground border-warning/35",
  completed: "bg-success/12 text-success border-success/25",
  cancelled: "bg-destructive/10 text-destructive border-destructive/25",
};

const dots: Record<"draft" | "submitted" | "in_progress" | "completed" | "cancelled", string> = {
  draft: "bg-muted-foreground",
  submitted: "bg-info",
  in_progress: "bg-warning",
  completed: "bg-success",
  cancelled: "bg-destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TenderStatus | string;
  className?: string;
}) {
  const key = normalizeStatusKey(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[key],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dots[key])} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}
