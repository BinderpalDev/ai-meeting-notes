import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  NotebookPen,
  Search,
  Settings,
  Sun,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/context/AppContext";
import { Recorder } from "@/components/Recorder";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/recordings", label: "Recordings", icon: Mic },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-3 group">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary glow-primary transition-transform group-hover:scale-105">
        <span className="h-3 w-3 rounded-full bg-mint shadow-[0_0_8px_var(--mint)]" />
      </span>
      <div className="flex flex-col leading-none">
        <span className="font-display text-base font-bold tracking-tight">Summarix</span>
        <span className="text-[10px] text-muted-foreground">AI Meeting Notes</span>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "border border-mint/25 bg-mint/10 text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/6%)]"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-1",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-mint" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span className="flex-1">{item.label}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_var(--mint)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  search,
  onSearchChange,
}: {
  children: ReactNode;
  search?: string;
  onSearchChange?: (v: string) => void;
}) {
  const { user, logout, theme, toggleTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const sidebarInner = (
    <div className="flex h-full flex-col gap-5 p-4">
      <Logo />

      {/* Quick record CTA */}
      <Button
        onClick={() => {
          setRecorderOpen(true);
          setMobileOpen(false);
        }}
        className="w-full rounded-xl gradient-primary glow-primary gap-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
      >
        <Mic className="h-4 w-4" />
        <span>New Recording</span>
        <Plus className="ml-auto h-3.5 w-3.5" />
      </Button>

      <div className="h-px bg-border" />

      <NavLinks onNavigate={() => setMobileOpen(false)} />

      {/* Bottom user section */}
      <div className="mt-auto space-y-2">
        <div className="rounded-xl border border-border bg-accent/30 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
              {user?.initials ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user?.name ?? "User"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>
        </div>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="aurora min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">{sidebarInner}</div>
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 border-border bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarInner}
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                disabled={!onSearchChange}
                placeholder="Search meetings, notes, action items…"
                className="h-10 rounded-xl border-border bg-panel/60 pl-9 text-sm placeholder:text-muted-foreground/60 focus:border-mint/40 focus:ring-mint/20"
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Quick record button on top bar */}
              <Button
                onClick={() => setRecorderOpen(true)}
                size="sm"
                className="hidden gap-1.5 rounded-xl gradient-primary px-3 text-xs font-semibold active:scale-95 sm:flex"
              >
                <Mic className="h-3.5 w-3.5" /> Record
              </Button>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-xl transition-all hover:scale-110 active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-mint" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground ring-2 ring-border ring-offset-1 ring-offset-background transition-all hover:scale-105 hover:ring-mint/40 active:scale-95"
                    aria-label="Account menu"
                  >
                    {user?.initials ?? "??"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel className="min-w-0">
                    <p className="truncate text-sm">{user?.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRecorderOpen(true)}>
                    <Mic className="mr-2 h-4 w-4" />New recording
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={doLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <Recorder open={recorderOpen} onOpenChange={setRecorderOpen} />
    </div>
  );
}
