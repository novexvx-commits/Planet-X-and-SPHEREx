import { useEffect, useState } from "react";
import { scrollToTarget } from "../lib/engine";
import { cn } from "../utils/cn";

export const SCENES = [
  ["top", "Descent"],
  ["prologue", "Prologue"],
  ["voyage", "The Voyage"],
  ["meridian", "The Engine"],
  ["ark", "Life Aboard"],
  ["first-light", "First Light"],
  ["log", "Mission Log"],
  ["telemetry", "Telemetry"],
  ["systems", "Systems"],
  ["vision", "Vision"],
  ["manifest", "Manifest"],
] as const;

export default function SceneIndex() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = SCENES.map(([id]) => document.getElementById(id));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = els.indexOf(e.target as HTMLElement);
          if (i > -1) setActive(i);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    els.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Scenes"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 mix-blend-difference xl:flex"
    >
      {SCENES.map(([id, label], i) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToTarget(`#${id}`, { duration: 2 })}
          className="group flex items-center gap-3 py-[3px]"
          aria-label={`Go to scene ${i + 1}: ${label}`}
          aria-current={active === i ? "step" : undefined}
        >
          <span
            className={cn(
              "ease-expo font-mono text-[9px] uppercase tracking-[0.2em] text-white transition-all duration-500",
              active === i ? "translate-x-0 opacity-90" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
            )}
          >
            {String(i + 1).padStart(2, "0")} — {label}
          </span>
          <span
            className={cn(
              "ease-expo block h-px bg-white transition-all duration-500",
              active === i ? "w-9 opacity-100" : "w-3 opacity-40 group-hover:w-5 group-hover:opacity-80"
            )}
          />
        </button>
      ))}
    </nav>
  );
}
