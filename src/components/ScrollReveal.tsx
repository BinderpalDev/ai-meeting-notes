import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add("sr-visible");
          if (once) observer.disconnect();
        } else if (!once) {
          el.classList.remove("sr-visible");
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, once]);

  const dirClass = {
    up: "sr-up",
    down: "sr-down",
    left: "sr-left",
    right: "sr-right",
    none: "sr-fade",
  }[direction];

  return (
    <div ref={ref} className={`sr-base ${dirClass} ${className}`}>
      {children}
    </div>
  );
}
