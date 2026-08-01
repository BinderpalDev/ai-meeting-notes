import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Languages, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ActionItems } from "@/components/ActionItems";
import { Chatbot } from "@/components/Chatbot";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export const Route = createFileRoute("/meeting/$id")({
  head: () => ({
    meta: [
      { title: "Meeting detail — Summarix" },
      {
        name: "description",
        content:
          "Transcript, executive summary, action items and meeting chat for a single recording.",
      },
      { property: "og:title", content: "Meeting detail — Summarix" },
      {
        property: "og:description",
        content: "Speaker-labeled transcript, summary, owners and due dates.",
      },
    ],
  }),
  component: MeetingPage,
});

function MeetingPage() {
  const { ready } = useRequireAuth();
  const { id } = useParams({ from: "/meeting/$id" });
  const { recordings, toggleActionItem } = useApp();
  const [tab, setTab] = useState("transcript");
  const recording = recordings.find((r) => r.id === id);

  if (!ready) return null;

  if (!recording) {
    return (
      <AppShell>
        <div className="panel mx-auto max-w-md p-10 text-center">
          <p className="font-display text-lg">Recording not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted from this workspace.
          </p>
          <Button asChild className="mt-4 rounded-xl gradient-primary glow-primary">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl sm:text-3xl">{recording.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(recording.date).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {recording.duration} · {recording.participants} participants
            </p>
          </div>
          <StatusBadge status={recording.status} />
        </header>

        <AudioPlayer duration={recording.duration} audioUrl={recording.audioUrl} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-panel/70 p-1">
            {[
              ["transcript", "Transcript"],
              ["summary", "Summary"],
              ["actions", "Action Items"],
              ["chat", "Chat"],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v as string}
                className="rounded-lg px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="transcript" className="mt-4">
            {recording.transcript.length === 0 ? (
              <div className="panel p-10 text-center">
                <p className="font-display text-lg">No transcript yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This recording is still {recording.status.toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="panel divide-y divide-border">
                <div className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground">
                  <Languages className="h-3.5 w-3.5 text-mint" /> Auto-detected: English, Swedish,
                  Spanish
                </div>
                {recording.transcript.map((line, i) => (
                  <div key={i} className="flex gap-4 px-5 py-4 transition-colors hover:bg-accent/30">
                    <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                      {line.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">{line.speaker}</p>
                      <p className="mt-1 text-sm leading-relaxed">{line.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="panel relative p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full gradient-primary glow-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </span>
                <h2 className="text-base">Executive summary</h2>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{recording.summary}</p>
            </div>
            {recording.topics.length > 0 && (
              <div className="panel p-6">
                <h3 className="mb-3 text-sm font-semibold">Key topics</h3>
                <div className="flex flex-wrap gap-2">
                  {recording.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs text-mint"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <ActionItems
              items={recording.actionItems}
              onToggle={(itemId) => toggleActionItem(recording.id, itemId)}
            />
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Chatbot
              contextLabel={recording.title}
              transcriptContext={recording.transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
