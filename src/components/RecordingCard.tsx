import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock, FileText, Play, Trash2, Users } from "lucide-react";
import type { Recording } from "@/data/mockRecordings";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecordingCard({
  recording,
  onDelete,
}: {
  recording: Recording;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="panel group relative flex flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-mint/30 hover:shadow-[0_20px_48px_-16px_color-mix(in_oklab,var(--mint)_25%,oklch(0_0_0/35%))]">
      {/* Top-right hover arrow indicator */}
      <div className="absolute right-4 top-4 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-1">
        <ArrowUpRight className="h-4 w-4 text-mint" />
      </div>

      {/* Subtle corner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--mint) 8%, transparent) 0%, transparent 50%)" }}
      />

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link
            to="/meeting/$id"
            params={{ id: recording.id }}
            className="block truncate text-base font-semibold transition-colors hover:text-mint"
          >
            {recording.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(recording.date)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recording.duration}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recording.participants} {recording.participants === 1 ? "person" : "people"}
            </span>
          </div>
        </div>
        <StatusBadge status={recording.status} />
      </div>

      <p className="relative mt-3 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
        {recording.summary}
      </p>

      {/* Topics pills */}
      {recording.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recording.topics.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {recording.topics.length > 3 && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              +{recording.topics.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="relative mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Button
          asChild
          size="sm"
          className="h-8 gap-1.5 rounded-lg gradient-primary px-3 text-xs font-medium active:scale-95"
        >
          <Link to="/meeting/$id" params={{ id: recording.id }}>
            <Play className="h-3 w-3" /> Open
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-lg border border-border px-3 text-xs hover:border-mint/30 hover:text-mint active:scale-95"
        >
          <Link to="/meeting/$id" params={{ id: recording.id }}>
            <FileText className="h-3.5 w-3.5" /> Summary
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(recording.id)}
          className={cn(
            "ml-auto h-8 w-8 rounded-lg p-0 text-muted-foreground/50",
            "transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95",
          )}
          aria-label={`Delete ${recording.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}
