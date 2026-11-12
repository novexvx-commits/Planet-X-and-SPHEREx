import { useEffect, useId, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { isCoarse } from "../lib/engine";
import { cn } from "../utils/cn";

/** Typed helper for inline CSS custom properties */
export const dv = (vars: Record<string, string | number>) => vars as CSSProperties;

/**
 * Word-masked headline reveal.
 *  "|" = line break,  *word word* = italic gradient emphasis
 */
export function SplitText({
  text,
  as,
  className,
  delay = 0,
  stagger = 55,
  emClass = "em",
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  emClass?: string;
}) {
  const Tag = (as ?? "h2") as ElementType;
  let index = 0;
  let inEm = false;
  const lines = text.split("|");
  const label = text.replace(/[|*]/g, " ").replace(/\s+/g, " ").trim();

  return (
    <Tag
      className={cn("split", className)}
      data-reveal="split"
      style={dv({ "--d": `${delay}ms`, "--st": `${stagger}ms` })}
      aria-label={label}
    >
      {lines.map((line, li) => {
        const words = line.trim().split(/\s+/);
        return (
          <span key={li} className="block" aria-hidden="true">
            {words.map((raw, wi) => {
              let w = raw;
              let em = inEm;
              if (w.startsWith("*")) {
                em = true;
                inEm = true;
                w = w.slice(1);
              }
              if (w.endsWith("*")) {
                inEm = false;
                w = w.slice(0, -1);
              }
              const i = index++;
              return (
                <span key={wi}>
                  <span className="split-w">
                    <span className={em ? emClass : undefined} style={dv({ "--i": i })}>
                      {w}
                    </span>
                  </span>
                  {wi < words.length - 1 ? " " : null}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}

export function Kicker({
  children,
  className,
  center = false,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <p
      data-reveal="fade"
      className={cn("kicker flex items-center gap-3 text-ember-soft", center && "justify-center", className)}
    >
      <span className="h-px w-8 bg-current opacity-60" />
      {children}
      {center && <span className="h-px w-8 bg-current opacity-60" />}
    </p>
  );
}

export function CountUp({
  to,
  decimals = 0,
  duration = 2200,
  prefix = "",
  suffix = "",
  group = true,
  className,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  group?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const formattedTarget =
    prefix +
    to.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: group,
    }) +
    suffix;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = formattedTarget;
  }, [formattedTarget, duration]);

  return (
    <span ref={ref} className={className}>
      {formattedTarget}
    </span>
  );
}

/** Magnetic wrapper: the first child is gently pulled toward the cursor. */
export function Magnetic({
  children,
  strength = 0.32,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isCoarse()) return;
    const target = el.firstElementChild as HTMLElement | null;
    if (!target) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      target.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <span ref={ref} className={cn("magnetic inline-block", className)}>
      {children}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  const id = "lm" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe2c2" />
          <stop offset="0.5" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#9b7bff" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="14.5" ry="4.6" stroke={`url(#${id})`} strokeWidth="1.2" transform="rotate(-16 16 16)" />
      <circle cx="16" cy="16" r="6.3" fill="#05060a" stroke={`url(#${id})`} strokeWidth="1.2" />
      <path
        d="M1.5 16 A14.5 4.6 0 0 0 30.5 16"
        stroke={`url(#${id})`}
        strokeWidth="1.2"
        transform="rotate(-16 16 16)"
      />
    </svg>
  );
}

export function Arrow({ className, dir = "right" }: { className?: string; dir?: "right" | "left" | "up" | "down" | "ne" }) {
  const rot = { right: 0, left: 180, up: -90, down: 90, ne: -45 }[dir];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rot}deg)` }}
      aria-hidden="true"
    >
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
