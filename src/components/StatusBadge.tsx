import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/data/mockRecordings";

export function StatusBadge({ status }: { status: RecordingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "Transcribed" && "border-mint/30 bg-mint/10 text-mint",
        status === "Processing" && "border-primary/40 bg-primary/15 text-foreground",
        status === "Draft" && "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Transcribed" && "bg-mint",
          status === "Processing" && "animate-pulse bg-primary",
          status === "Draft" && "bg-muted-foreground",
        )}
      />
      {status}
    </span>
  );
}
