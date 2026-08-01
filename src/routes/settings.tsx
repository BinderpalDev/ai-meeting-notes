import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cpu, KeyRound, Moon, Sparkles, Sun } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { checkOllamaStatus } from "@/services/ollamaService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Summarix" },
      {
        name: "description",
        content: "Manage your profile, local AI runtime, mock AI mode, theme and API keys.",
      },
      { property: "og:title", content: "Settings — Summarix" },
      { property: "og:description", content: "Profile, AI runtime, theme and API keys." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { ready, user } = useRequireAuth();
  const { updateProfile, settings, updateSetting, theme, toggleTheme } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({ isRunning: false, models: [] as any[] });

  useEffect(() => {
    checkOllamaStatus().then((status) => {
      setOllamaStatus({ isRunning: status.isRunning, models: status.models || [] });
      if (status.isRunning) {
        updateSetting("localAi", true);
      }
    });
  }, []);

  if (!ready) return null;

  const save = () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Check your name and email");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      updateProfile({ name, email });
      setSaving(false);
      toast.success("Profile updated");
    }, 700);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace preferences and AI runtime status.
          </p>
        </header>

        <section className="panel space-y-4 p-6">
          <h2 className="text-base">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Name</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl bg-background/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl bg-background/50"
              />
            </div>
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-xl gradient-primary glow-primary active:scale-95"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="panel space-y-3 p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Cpu className="h-4 w-4 shrink-0 text-mint" />
                <h3 className="truncate text-sm font-semibold">Local AI (Ollama)</h3>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-xs",
                  ollamaStatus.isRunning
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {ollamaStatus.isRunning ? "Connected" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {ollamaStatus.isRunning
                ? `${ollamaStatus.models.length} Ollama model(s) available`
                : "Run 'ollama serve' at http://localhost:11434 to connect"}
            </p>
            <Switch
              checked={settings.localAi}
              onCheckedChange={(v) => updateSetting("localAi", v)}
              aria-label="Toggle local AI"
            />
          </div>

          <div className="panel space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="truncate text-sm font-semibold">Mock AI mode</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Return canned transcripts and summaries — no provider calls.
            </p>
            <Switch
              checked={settings.mockAi}
              onCheckedChange={(v) => updateSetting("mockAi", v)}
              aria-label="Toggle mock AI"
            />
          </div>

          <div className="panel space-y-3 p-5">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Sun className="h-4 w-4 shrink-0 text-primary" />
              )}
              <h3 className="truncate text-sm font-semibold">Theme</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Currently {theme === "dark" ? "Midnight Lab (dark)" : "Daylight (light)"}.
            </p>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
            />
          </div>

          <div className="panel space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-mint" />
              <h3 className="truncate text-sm font-semibold">Weekly digest</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Email a Monday recap of open action items.
            </p>
            <Switch
              checked={settings.emailDigest}
              onCheckedChange={(v) => updateSetting("emailDigest", v)}
              aria-label="Toggle weekly digest"
            />
          </div>
        </section>

        <section className="panel space-y-4 p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base">API keys</h2>
          </div>
          {[
            { id: "openai", label: "OpenAI API key", placeholder: "sk-••••••••••••••••" },
            { id: "whisper", label: "Whisper endpoint key", placeholder: "wsp-••••••••••••" },
            { id: "webhook", label: "Webhook signing secret", placeholder: "whsec-•••••••••" },
          ].map((k) => (
            <div key={k.id} className="space-y-1.5">
              <Label htmlFor={k.id}>{k.label}</Label>
              <Input
                id={k.id}
                type="password"
                placeholder={k.placeholder}
                className="h-11 rounded-xl bg-background/50 font-mono"
              />
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() => toast.success("Keys stored locally (demo only)")}
            className="rounded-xl border border-border active:scale-95"
          >
            Save keys
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
