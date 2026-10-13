import { useRef, type RefObject } from "react";
import { clamp } from "../lib/engine";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { cn } from "../utils/cn";
import { Kicker, SplitText, dv } from "../components/ui";

/* Schwarzschild radius of a 7.8 solar-mass black hole ≈ 23 km
   Static-observer time dilation at altitude h above the horizon: γ = √((rs + h) / h) */
const RS = 23000;
const ALTS = [1e7, 1e6, 1e5, 1e4, 1e3, 1e2, 1e1, 1];
const ALT_LABELS = ["10⁴ km", "10³ km", "100 km", "10 km", "1 km", "100 m", "10 m", "1 m"];
const gamma = (h: number) => Math.sqrt((RS + h) / h);
const G = ALTS.map(gamma);
const LOGMAX = Math.log10(G[G.length - 1]);
const HEIGHTS = G.map((g) => Math.max(0.035, Math.log10(g) / LOGMAX));

const MESSAGES: [number, string][] = [
  [0, "Lantern released from Meridian. Descent nominal."],
  [0.22, "Tidal stretch detectable. Onboard clocks diverging."],
  [0.45, "Signal redshifting into the infrared."],
  [0.68, "Each Lantern second now lasts minutes at home."],
  [0.92, "Final frame received. Lantern falls silent."],
];

const fmtAlt = (h: number) => {
  if (h >= 1000) {
    const km = h / 1000;
    return `${km.toLocaleString("en-US", { maximumFractionDigits: km < 10 ? 2 : km < 100 ? 1 : 0 })} km`;
  }
  return `${h.toFixed(h < 10 ? 2 : h < 100 ? 1 : 0)} m`;
};
const fmtGamma = (g: number) => `×${g < 10 ? g.toFixed(3) : g < 100 ? g.toFixed(2) : g.toFixed(1)}`;
const fmtHome = (g: number) => (g < 60 ? `${g.toFixed(g < 2 ? 4 : 2)} s` : `${Math.floor(g / 60)} min ${String(Math.floor(g % 60)).padStart(2, "0")} s`);

const barColor = (i: number) => {
  const t = i / 7;
  const r = Math.round(108 + (255 - 108) * t);
  const g = Math.round(229 + (138 - 229) * t);
  const b = Math.round(255 + (61 - 255) * t);
  return `linear-gradient(to top, rgba(${r},${g},${b},0.06), rgba(${r},${g},${b},0.95))`;
};

function Kpi({ label, refEl, init, accent, className }: { label: string; refEl: RefObject<HTMLSpanElement | null>; init: string; accent?: boolean; className?: string }) {
  return (
    <div className={cn("bg-ink-2 p-4 md:p-5", className)}>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-bone/45 md:text-[9.5px]">{label}</p>
      <p className={cn("mt-2 text-xl font-light tabular-nums tracking-tight md:text-[1.65rem]", accent && "text-ember-soft")}>
        <span ref={refEl}>{init}</span>
      </p>
    </div>
  );
}

/** Scene 8 — Pinned, scroll-linked data visualisation (bars driven by a single CSS variable) */
export default function Telemetry() {
  const ref = useRef<HTMLElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const gamRef = useRef<HTMLSpanElement>(null);
  const homeRef = useRef<HTMLSpanElement>(null);
  const zRef = useRef<HTMLSpanElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);
  const capRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastMsg = useRef(0);

  useScrollProgress(
    ref,
    (p, el) => {
      const d = clamp((p - 0.05) / 0.85);
      el.style.setProperty("--d", d.toFixed(4));
      const h = Math.pow(10, 8 - 8 * d);
      const g = gamma(h);
      if (altRef.current) altRef.current.textContent = fmtAlt(h);
      if (gamRef.current) gamRef.current.textContent = fmtGamma(g);
      if (homeRef.current) homeRef.current.textContent = fmtHome(g);
      if (zRef.current) zRef.current.textContent = (g - 1).toFixed(g - 1 < 1 ? 4 : g - 1 < 10 ? 3 : 1);
      capRefs.current.forEach((cap, i) => {
        if (!cap) return;
        const f = clamp(d * 8 - i);
        cap.textContent = fmtGamma(1 + (G[i] - 1) * f);
      });
      let m = 0;
      MESSAGES.forEach(([th], i) => {
        if (d >= th) m = i;
      });
      const msg = msgRef.current;
      if (msg && m !== lastMsg.current) {
        lastMsg.current = m;
        msg.textContent = MESSAGES[m][1];
        msg.classList.remove("msg-in");
        void msg.offsetWidth;
        msg.classList.add("msg-in");
      }
    },
    "pin"
  );

  return (
    <section id="telemetry" ref={ref} className="relative h-[400vh]" style={dv({ "--d": 0 })}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-[10vw] top-[8%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.12),transparent_60%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[12%] -left-[15vw] h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(108,229,255,0.08),transparent_60%)]" />

        <div className="shell relative grid w-full items-center gap-7 pt-14 lg:grid-cols-12 lg:gap-14 lg:pt-0">
          <div className="lg:col-span-4">
            <Kicker>Chapter VIII — Telemetry</Kicker>
            <SplitText text="Where time | *runs thin.*" className="mt-5 font-serif text-[clamp(2.5rem,5.8vw,6rem)] leading-[0.92]" />
            <p data-reveal="up" style={dv({ "--d": "200ms" })} className="mt-6 hidden max-w-sm text-[15px] leading-[1.75] text-bone/60 sm:block">
              In 2259 Meridian lowered a probe named Lantern toward the horizon of Erebus and listened to its clock. Keep scrolling to follow its fall.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] lg:mt-10">
              <Kpi label="Altitude" refEl={altRef} init="100,000 km" />
              <Kpi label="Time dilation γ" refEl={gamRef} init="×1.000" accent />
              <Kpi label="Home time / probe second" refEl={homeRef} init="1.0001 s" className="hidden sm:block" />
              <Kpi label="Redshift z" refEl={zRef} init="0.0001" className="hidden sm:block" />
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="glass rounded-[24px] p-5 md:rounded-[30px] md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/45 md:text-[10px]">Lantern probe · Gravitational time dilation</p>
                  <p className="mt-1 hidden text-sm text-bone/70 md:block">Seconds that pass on Meridian for every second on Lantern</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="chip hidden text-bone/70 sm:inline-flex">Log scale</span>
                  <span className="chip text-ember-soft">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                    Live
                  </span>
                </div>
              </div>

              <div className="relative mt-6 h-[30vh] md:mt-8 md:h-[44vh]">
                {[
                  [0, "1×"],
                  [1 / LOGMAX, "10×"],
                  [2 / LOGMAX, "100×"],
                ].map(([pos, label]) => (
                  <div key={label as string} className="absolute inset-x-0 border-t border-dashed border-white/10" style={{ bottom: `${(pos as number) * 100}%` }}>
                    <span className="absolute -top-2 right-0 font-mono text-[9px] text-bone/35">{label}</span>
                  </div>
                ))}
                <div aria-hidden="true" className="tl-marker pointer-events-none absolute inset-y-0 z-10 w-px bg-linear-to-b from-transparent via-ember/80 to-transparent">
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-ember shadow-[0_0_12px_#ff8a3d]" />
                </div>
                <div className="relative flex h-full items-end gap-2 pr-10 md:gap-4">
                  {G.map((_, i) => (
                    <div key={i} className="tl-bar relative h-full flex-1" style={dv({ "--i": i, "--h": HEIGHTS[i] })}>
                      <div className="absolute inset-0 rounded-t-md border border-white/[0.05] bg-white/[0.02] md:rounded-t-lg" />
                      <div className="tl-bar-fill absolute inset-0 rounded-t-md md:rounded-t-lg" style={{ background: barColor(i) }} />
                      <span
                        ref={(el) => {
                          capRefs.current[i] = el;
                        }}
                        className="tl-bar-cap absolute left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] tabular-nums text-bone sm:text-[9.5px] md:text-[11px]"
                      >
                        ×1.000
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-2 pr-10 md:gap-4">
                {ALT_LABELS.map((l) => (
                  <span key={l} className="flex-1 text-center font-mono text-[7.5px] text-bone/40 sm:text-[9px] md:text-[10px]">
                    {l}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-white/[0.08] pt-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bone/65 md:mt-6 md:pt-5 md:text-[11px]">
                <span className="text-ember">›</span>
                <span ref={msgRef} className="msg-in">
                  {MESSAGES[0][1]}
                </span>
                <span className="caret" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
