import { useEffect, useRef, useState } from "react";
import prologueImg from "../assets/img/prologue.jpg";
import ignitionImg from "../assets/img/ignition.jpg";
import { cn } from "../utils/cn";
import { LogoMark } from "./ui";

const LINES = [
  "Calibrating Linear Variable Filters (0.75 – 5.00 µm)",
  "Aligning 6 Detector Arrays (2048×2048)",
  "Connecting NASA/IPAC IRSA Archive",
  "Resolving Target Coordinates via ICRS"
];

export default function Loader({ onComplete }: { onComplete: () => void }) {
  const numRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;
  const [phase, setPhase] = useState<"load" | "exit" | "done">("load");
  const [line, setLine] = useState(0);

  useEffect(() => {
    let real = 0;
    let shown = 0;
    let raf = 0;
    let finished = false;
    const t0 = performance.now();
    const timers: number[] = [];

    const tasks: Promise<unknown>[] = [document.fonts ? document.fonts.ready : Promise.resolve()];
    [prologueImg, ignitionImg].forEach((src) =>
      tasks.push(
        new Promise<void>((res) => {
          const im = new Image();
          im.onload = () => res();
          im.onerror = () => res();
          im.src = src;
        })
      )
    );
    let count = 0;
    tasks.forEach((t) =>
      t.then(() => {
        count += 1;
        real = count / tasks.length;
      })
    );
    const safety = window.setTimeout(() => {
      real = 1;
    }, 5000);
    const lineTimer = window.setInterval(() => setLine((l) => (l + 1) % LINES.length), 620);

    const tick = (now: number) => {
      const target = Math.min(real, Math.min(1, (now - t0) / 1800));
      shown += (target - shown) * 0.085;
      if (target >= 1 && shown > 0.996) shown = 1;
      if (numRef.current) numRef.current.textContent = String(Math.round(shown * 100)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown.toFixed(4)})`;
      if (shown >= 1 && !finished) {
        finished = true;
        timers.push(
          window.setTimeout(() => {
            setPhase("exit");
            doneRef.current();
          }, 260)
        );
        timers.push(window.setTimeout(() => setPhase("done"), 1800));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      window.clearInterval(lineTimer);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={cn("loader fixed inset-0 z-[96] flex flex-col bg-ink", phase === "exit" && "is-exit")}
      role="status"
      aria-live="polite"
      aria-label="Loading the MARSAD scientific observatory"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.12),rgba(107,70,255,0.06)_45%,transparent_70%)]" />
      <div className="shell relative flex h-[72px] items-center justify-between md:h-20">
        <div className="flex items-center gap-3">
          <LogoMark className="spin-slow h-7 w-7" />
          <span className="font-mono text-[11px] uppercase tracking-[0.42em]">MARSAD</span>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40 sm:block">NASA SPHEREx Mission · Calibration</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-[clamp(5rem,17vw,15rem)] leading-none tabular-nums tracking-[-0.02em]">
            <span ref={numRef}>000</span>
          </p>
          <p key={line} className="loader-line mt-5 font-mono text-[10.5px] uppercase tracking-[0.26em] text-bone/50">
            {LINES[line]}…
          </p>
        </div>
      </div>

      <div className="shell relative pb-10">
        <div className="h-px w-full bg-white/10">
          <div ref={barRef} className="h-full origin-left bg-linear-to-r from-ion via-nebula to-ember" style={{ transform: "scaleX(0)" }} />
        </div>
        <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">
          <span>NASA SPHEREx All-Sky Survey</span>
          <span>0.75 – 5.0 µm · 102 Channels</span>
        </div>
      </div>
    </div>
  );
}
