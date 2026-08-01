import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      // Dot (arrow tip) follows exactly
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;

      // Detect interactive element under cursor
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el?.closest("button, a, [role='button'], input, select, textarea, label, [tabindex]");
      setIsInteractive(!!interactive);
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      ringPosRef.current.x = lerp(ringPosRef.current.x, posRef.current.x, 0.1);
      ringPosRef.current.y = lerp(ringPosRef.current.y, posRef.current.y, 0.1);
      ring.style.transform = `translate(${ringPosRef.current.x - 22}px, ${ringPosRef.current.y - 22}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    const onDown = () => setIsClicking(true);
    const onUp   = () => setIsClicking(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* ── Trailing ring ── */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isInteractive ? 52 : 44,
          height: isInteractive ? 52 : 44,
          borderRadius: "50%",
          border: `1.5px solid ${isInteractive ? "oklch(0.82 0.04 190)" : "oklch(0.82 0.04 190 / 55%)"}`,
          background: isInteractive ? "oklch(0.82 0.04 190 / 10%)" : "transparent",
          pointerEvents: "none",
          zIndex: 99998,
          willChange: "transform",
          transition: "width 0.2s ease, height 0.2s ease, border-color 0.2s ease, background 0.2s ease",
        }}
      />

      {/* ── Arrow cursor dot ── */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 99999,
          willChange: "transform",
          // offset so the SVG arrow tip lands at cursor point
          marginLeft: "-2px",
          marginTop: "-2px",
        }}
      >
        <svg
          width={isClicking ? 20 : isInteractive ? 26 : 22}
          height={isClicking ? 20 : isInteractive ? 26 : 22}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            display: "block",
            transition: "width 0.15s ease, height 0.15s ease, filter 0.15s ease",
            filter: isInteractive
              ? "drop-shadow(0 0 6px oklch(0.82 0.04 190))"
              : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            transform: isClicking ? "scale(0.85)" : "scale(1)",
          }}
        >
          {/* Arrow pointer shape */}
          <path
            d="M4 2L20 12L12 13.5L8.5 20L4 2Z"
            fill={isInteractive ? "oklch(0.82 0.04 190)" : "white"}
            stroke={isInteractive ? "oklch(0.5 0.08 190)" : "oklch(0.2 0 0)"}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}
