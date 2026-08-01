import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waveform } from "@/components/Waveform";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Summarix — AI Meeting Notes & Action Items" },
      {
        name: "description",
        content:
          "Sign in to Summarix: record meetings, get speaker-labeled transcripts, executive summaries and tracked action items.",
      },
      { property: "og:title", content: "Summarix — AI Meeting Notes & Action Items" },
      {
        property: "og:description",
        content: "Record, transcribe, summarize and assign action items from every meeting.",
      },
    ],
  }),
  component: AuthPage,
});

type Errors = { name?: string; email?: string; password?: string };

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const { login, user, hydrated } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && user) navigate({ to: "/dashboard" });
  }, [hydrated, user, navigate]);

  const validate = () => {
    const next: Errors = {};
    if (mode === "signup" && name.trim().length < 2) next.name = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address";
    if (password.length < 8) next.password = "Password must be at least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      login(email, mode === "signup" ? name : undefined);
      navigate({ to: "/dashboard" });
    }, 900);
  };

  const google = () => {
    setLoading(true);
    window.setTimeout(() => {
      login("ava@summarix.ai", "Ava Lindqvist");
      navigate({ to: "/dashboard" });
    }, 900);
  };

  return (
    <div className="aurora grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary glow-primary">
            <span className="h-3 w-3 rounded-full bg-mint" />
          </span>
          <span className="font-display text-lg font-semibold">Summarix</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            Every meeting, distilled into <span className="text-mint">decisions</span> and{" "}
            <span className="text-primary">owners</span>.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Speaker-labeled transcripts, executive summaries, and action items that actually get
            assigned — in 40+ languages.
          </p>
          <div className="mt-10 h-20 w-full opacity-80">
            <Waveform bars={44} active tone="mint" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>38% MoM processed minutes</span>
          <span>·</span>
          <span>4.6/5 summary quality</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="panel w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-xl gradient-primary glow-primary">
              <span className="h-2.5 w-2.5 rounded-full bg-mint" />
            </span>
            <span className="font-display font-semibold">Summarix</span>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/50 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErrors({});
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-all duration-200",
                  mode === m
                    ? "gradient-primary text-primary-foreground glow-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <h2 className="font-display text-2xl">
            {mode === "login" ? "Welcome back" : "Create your workspace"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Pick up where your last meeting left off."
              : "Free for your first 500 processed minutes."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ava Lindqvist"
                  className="h-11 rounded-xl bg-background/50"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 rounded-xl bg-background/50"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11 rounded-xl bg-background/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl gradient-primary glow-primary transition-transform active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {mode === "login" ? "Log in" : "Create account"}
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="ghost"
            onClick={google}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-border transition-transform active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.96 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Demo build — any valid-looking credentials will sign you in.
          </p>
        </div>
      </section>
    </div>
  );
}
