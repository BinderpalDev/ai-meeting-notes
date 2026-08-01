import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RecordingCard } from "@/components/RecordingCard";
import { Recorder } from "@/components/Recorder";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export const Route = createFileRoute("/recordings")({
  head: () => ({
    meta: [
      { title: "Recordings — Summarix" },
      {
        name: "description",
        content: "Browse every captured meeting, filter by status and open its AI transcript.",
      },
      { property: "og:title", content: "Recordings — Summarix" },
      { property: "og:description", content: "Every captured meeting in one searchable library." },
    ],
  }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const { ready } = useRequireAuth();
  const { recordings, deleteRecording } = useApp();
  const [search, setSearch] = useState("");
  const [recorderOpen, setRecorderOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recordings;
    return recordings.filter(
      (r) => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q),
    );
  }, [recordings, search]);

  if (!ready) return null;

  return (
    <AppShell search={search} onSearchChange={setSearch}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl">Recordings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {recordings.length} recordings in this workspace
            </p>
          </div>
          <Button
            onClick={() => setRecorderOpen(true)}
            className="shrink-0 rounded-xl gradient-primary glow-primary active:scale-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New
          </Button>
        </header>

        {filtered.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Mic className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-lg">No recordings yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Start your first one and Summarix will handle the transcript, summary and follow-ups.
            </p>
            <Button
              onClick={() => setRecorderOpen(true)}
              className="mt-2 rounded-xl gradient-primary glow-primary"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Start recording
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <RecordingCard key={r.id} recording={r} onDelete={deleteRecording} />
            ))}
          </div>
        )}
      </div>

      <Recorder open={recorderOpen} onOpenChange={setRecorderOpen} />
    </AppShell>
  );
}
