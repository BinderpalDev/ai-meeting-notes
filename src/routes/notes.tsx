import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import type { Note } from "@/data/mockNotes";
import { toast } from "sonner";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes — Summarix" },
      {
        name: "description",
        content: "A fast scratchpad for meeting prep, demo scripts and open questions.",
      },
      { property: "og:title", content: "Notes — Summarix" },
      { property: "og:description", content: "Capture quick notes alongside your meetings." },
    ],
  }),
  component: NotesPage,
});

const empty = (): Note => ({
  id: `n_${Date.now()}`,
  title: "",
  body: "",
  updatedAt: new Date().toISOString(),
  color: "indigo",
});

function NotesPage() {
  const { ready } = useRequireAuth();
  const { notes, saveNote, deleteNote } = useApp();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Note | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }, [notes, search]);

  if (!ready) return null;

  return (
    <AppShell search={search} onSearchChange={setSearch}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl">Notes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Local scratchpad, saved in session.</p>
          </div>
          <Button
            onClick={() => setDraft(empty())}
            className="shrink-0 rounded-xl gradient-primary glow-primary active:scale-95"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New note
          </Button>
        </header>

        {filtered.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground" />
            <p className="font-display text-lg">
              {notes.length === 0 ? "No notes yet" : "Nothing matches that search"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Jot down prep, questions, or anything the transcript won't catch.
            </p>
            <Button
              onClick={() => setDraft(empty())}
              className="mt-2 rounded-xl gradient-primary glow-primary"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Create a note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => setDraft(note)}
                className={cn(
                  "panel group relative overflow-hidden p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-0 top-0 h-0.5",
                    note.color === "indigo" && "gradient-primary",
                    note.color === "mint" && "bg-mint",
                    note.color === "plain" && "bg-border",
                  )}
                />
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <h2 className="truncate text-base font-semibold">{note.title || "Untitled"}</h2>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                      toast("Note deleted");
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {note.body}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="glass max-w-xl rounded-2xl">
          <DialogTitle>Edit note</DialogTitle>
          {draft && (
            <div className="space-y-4">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Note title"
                className="h-11 rounded-xl bg-background/50 text-base"
              />
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Start typing…"
                className="min-h-48 rounded-xl bg-background/50 leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2">
                {(["indigo", "mint", "plain"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    aria-label={`${c} accent`}
                    className={cn(
                      "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                      c === "indigo" && "gradient-primary",
                      c === "mint" && "bg-mint",
                      c === "plain" && "bg-muted",
                      draft.color === c ? "border-foreground" : "border-transparent",
                    )}
                  />
                ))}
                <Button
                  onClick={() => {
                    saveNote({ ...draft, updatedAt: new Date().toISOString() });
                    setDraft(null);
                    toast.success("Note saved");
                  }}
                  className="ml-auto rounded-xl gradient-primary glow-primary active:scale-95"
                >
                  Save note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
