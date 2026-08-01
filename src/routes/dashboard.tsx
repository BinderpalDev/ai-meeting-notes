import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Mic, Plus, Sparkles, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RecordingCard } from "@/components/RecordingCard";
import { Recorder } from "@/components/Recorder";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/data/mockRecordings";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Summarix" },
      {
        name: "description",
        content: "Your recorded meetings, transcription status, summaries and open action items.",
      },
    ],
  }),
  component: DashboardPage,
});

const FILTERS: Array<"All" | RecordingStatus> = ["All", "Transcribed", "Processing", "Draft"];

function DashboardPage() {
  const { ready, user } = useRequireAuth();
  const { recordings, deleteRecording } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [recorderOpen, setRecorderOpen] = useState(false);

  const filtered = useMemo(
    () =>
      recordings.filter((r) => {
        const matchesFilter = filter === "All" || r.status === filter;
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.topics.some((t) => t.toLowerCase().includes(q));
        return matchesFilter && matchesSearch;
      }),
    [recordings, filter, search],
  );

  const openItems = recordings.flatMap((r) => r.actionItems).filter((a) => !a.done).length;
  const totalMinutes = recordings.reduce((acc, r) => acc + Number(r.duration.split(":")[0] ?? 0), 0);

  if (!ready) return null;

  const stats = [
    { label: "Recordings", value: recordings.length, icon: Mic, tone: "primary" as const, suffix: "" },
    { label: "Minutes captured", value: totalMinutes, icon: Clock3, tone: "primary" as const, suffix: "min" },
    { label: "Open action items", value: openItems, icon: CheckCircle2, tone: "mint" as const, suffix: "" },
  ];

  return (
    <AppShell search={search} onSearchChange={setSearch}>
      <div className="mx-auto w-full max-w-6xl space-y-10 page-enter">

        {/* ── Hero Header ── */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-panel via-panel to-accent/20 p-6 sm:p-8">
          {/* Decorative glow orbs */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--mint) 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 left-1/3 h-40 w-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, oklch(0.7 0.1 280) 0%, transparent 70%)" }}
          />

          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
                Welcome back
              </p>
              <h1 className="truncate text-2xl font-semibold sm:text-3xl">
                {user?.name ?? "Your Workspace"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {recordings.length === 0
                  ? "Record your first meeting to get started."
                  : `${recordings.length} meeting${recordings.length !== 1 ? "s" : ""} recorded · ${openItems} action item${openItems !== 1 ? "s" : ""} pending`}
              </p>
            </div>
            <Button
              onClick={() => setRecorderOpen(true)}
              className="shrink-0 rounded-xl gradient-primary glow-primary gap-2 px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" /> New Recording
            </Button>
          </div>
        </header>

        {/* ── Stats Grid ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "panel relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1",
                `stagger-${i + 1}`,
              )}
            >
              {/* Subtle bg glow */}
              <div
                className="pointer-events-none absolute inset-0 opacity-5"
                style={{
                  background:
                    s.tone === "mint"
                      ? "radial-gradient(circle at 80% 20%, var(--mint) 0%, transparent 60%)"
                      : "radial-gradient(circle at 80% 20%, var(--foreground) 0%, transparent 60%)",
                }}
              />
              <div className="relative flex items-center gap-4">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                    s.tone === "mint" ? "bg-mint/15" : "gradient-primary glow-primary",
                  )}
                >
                  <s.icon className={cn("h-5 w-5", s.tone === "mint" ? "text-mint" : "text-primary-foreground")} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-3xl font-bold tabular-nums">
                    {s.value}
                    {s.suffix && <span className="ml-1 text-lg font-normal text-muted-foreground">{s.suffix}</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                </div>
                <TrendingUp className="ml-auto h-4 w-4 text-muted-foreground/30" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Recordings Section ── */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Recording history</h2>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95",
                    filter === f
                      ? "border-mint/40 bg-mint/15 text-mint shadow-sm"
                      : "border-border text-muted-foreground hover:border-border/60 hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel flex flex-col items-center gap-4 px-6 py-20 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 ring-1 ring-border">
                <Sparkles className="h-7 w-7 text-mint" />
              </span>
              <div>
                <p className="font-display text-xl">
                  {recordings.length === 0 ? "No recordings yet" : "Nothing matches that search"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {recordings.length === 0
                    ? "Start your first one — Summarix will transcribe, summarize, and extract action items automatically."
                    : "Try a different keyword or clear the status filter."}
                </p>
              </div>
              {recordings.length === 0 && (
                <Button
                  onClick={() => setRecorderOpen(true)}
                  className="mt-2 rounded-xl gradient-primary glow-primary gap-2 hover:scale-105 active:scale-95"
                >
                  <Mic className="h-4 w-4" /> Start recording
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((r, i) => (
                <div
                  key={r.id}
                  className={cn("sr-base sr-up sr-visible")}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <RecordingCard recording={r} onDelete={deleteRecording} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Recorder open={recorderOpen} onOpenChange={setRecorderOpen} />
    </AppShell>
  );
}
