import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Chatbot } from "@/components/Chatbot";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Summarix" },
      {
        name: "description",
        content: "Ask questions across all of your meetings and get grounded answers with sources.",
      },
      { property: "og:title", content: "Chat — Summarix" },
      { property: "og:description", content: "Ask anything about your meeting history." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { ready } = useRequireAuth();
  const { recordings } = useApp();

  if (!ready) return null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl">Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grounded across {recordings.length} recordings in this workspace.
          </p>
        </header>
        <Chatbot contextLabel={`Across all ${recordings.length} meetings`} />
      </div>
    </AppShell>
  );
}
