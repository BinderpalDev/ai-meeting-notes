import { cn } from "@/lib/utils";

type Props = {
  bars?: number;
  active?: boolean;
  className?: string;
  tone?: "mint" | "primary";
  progress?: number;
};

const SEED = [
  0.4, 0.7, 0.35, 0.9, 0.55, 0.28, 0.75, 0.45, 0.95, 0.3, 0.62, 0.85, 0.42, 0.7, 0.33, 0.88, 0.5,
  0.25, 0.68, 0.8, 0.38, 0.58, 0.92, 0.44, 0.72, 0.3, 0.85, 0.5, 0.65, 0.35, 0.78, 0.48, 0.9, 0.32,
  0.6, 0.82, 0.4, 0.7, 0.55, 0.26,
];

export function Waveform({ bars = 40, active = false, className, tone = "mint", progress }: Props) {
  return (
    <div className={cn("flex h-full w-full items-center gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = SEED[i % SEED.length] ?? 0.5;
        const played = progress !== undefined && i / bars <= progress;
        return (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors duration-300",
              tone === "mint" ? "bg-mint" : "bg-primary",
              progress !== undefined && !played && "bg-muted-foreground/35",
              active && "origin-center",
            )}
            style={{
              height: `${Math.round(h * 100)}%`,
              minWidth: 2,
              animation: active ? `bar-pulse ${0.7 + (i % 5) * 0.13}s ease-in-out infinite` : undefined,
              animationDelay: active ? `${(i % 7) * 0.07}s` : undefined,
              opacity: active ? 1 : 0.85,
            }}
          />
        );
      })}
    </div>
  );
}
