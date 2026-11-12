import { useRef, type RefObject } from "react";
import { clamp } from "../lib/engine";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { cn } from "../utils/cn";
import { Kicker, SplitText, dv } from "../components/ui";

/* SPHEREx Cosmic Lookback & Redshift Mapping:
   Redshift z from local Universe (z = 0.2) to Cosmic Dawn (z = 6.2)
   Lookback time in Billions of Years (Gyr) */
const REDSHIFTS = [0.2, 0.5, 1.0, 1.8, 2.5, 3.5, 4.8, 6.2];
const ALT_LABELS = ["z = 0.2", "z = 0.5", "z = 1.0", "z = 1.8", "z = 2.5", "z = 3.5", "z = 4.8", "z = 6.2"];
const LOOKBACK_GYR = [2.45, 5.18, 7.93, 10.08, 11.16, 11.98, 12.52, 12.88];
const HEIGHTS = LOOKBACK_GYR.map((t, i) => Number((0.20 + 0.80 * (t / 12.88)).toFixed(3)));

const MESSAGES: [number, string][] = [
  [0, "SPHEREx Sun-synchronous polar orbit nominal. 20 cm telescope & 6 LVF arrays (D1–D6) active."],
  [0.22, "Short-wavelength arrays D1–D3 (0.75–2.42 µm, R ~ 41): 102-channel all-sky survey calibrated."],
  [0.45, "Mid-wavelength array D4 (2.42–3.82 µm, R ~ 35): mapping H2O ice and extragalactic clustering."],
  [0.68, "Long-wavelength arrays D5–D6 (3.82–5.00 µm, R ~ 110–130): resolving CO2 and CO ice bands."],
  [0.92, "Cosmic Dawn threshold: measuring extragalactic background fluctuations across 4 planned sky maps."],
];

const fmtLookback = (progress: number) => {
  const gyr = 2.45 + (12.88 - 2.45) * progress;
  return `${gyr.toFixed(2)} Gyr`;
};
const fmtExpansion = (progress: number) => {
  const exp = 1.20 + (7.20 - 1.20) * progress;
  return `×${exp.toFixed(2)}`;
};
const fmtVolume = (progress: number) => {
  const vol = Math.round(15 + (415 - 15) * Math.pow(progress, 1.5));
  return `${vol} Gpc³`;
};
const fmtZ = (progress: number) => {
  const z = 0.20 + (6.20 - 0.20) * progress;
  return z.toFixed(2);
};

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
      // Smooth progress driving bars and cosmological values
      const progress = clamp((p - 0.04) / 0.78);
      el.style.setProperty("--p", progress.toFixed(4));
      el.style.setProperty("--d", progress.toFixed(4));

      if (altRef.current) altRef.current.textContent = fmtLookback(progress);
      if (gamRef.current) gamRef.current.textContent = fmtExpansion(progress);
      if (homeRef.current) homeRef.current.textContent = fmtVolume(progress);
      if (zRef.current) zRef.current.textContent = fmtZ(progress);

      capRefs.current.forEach((cap, i) => {
        if (!cap) return;
        const curExp = 1 + (REDSHIFTS[i] * progress);
        cap.textContent = `z=${(REDSHIFTS[i] * progress).toFixed(2)}`;
      });

      let m = 0;
      MESSAGES.forEach(([th], i) => {
        if (progress >= th) m = i;
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
    <section id="telemetry" ref={ref} className="relative h-[400vh]" style={dv({ "--p": 0, "--d": 0 })}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-[10vw] top-[8%] h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.12),transparent_60%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[12%] -left-[15vw] h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(108,229,255,0.08),transparent_60%)]" />

        <div className="shell relative grid w-full items-center gap-7 pt-14 lg:grid-cols-12 lg:gap-14 lg:pt-0">
          <div className="lg:col-span-4">
            <Kicker>Chapter VIII — Cosmic Epochs & Telemetry</Kicker>
            <SplitText text="Mapping the light of | *Cosmic Dawn.*" className="mt-5 font-serif text-[clamp(2.5rem,5.8vw,6rem)] leading-[0.92]" />
            <p data-reveal="up" style={dv({ "--d": "200ms" })} className="mt-6 hidden max-w-sm text-[15px] leading-[1.75] text-bone/60 sm:block">
              SPHEREx maps 3D large-scale galaxy clustering across 102 near-infrared channels (0.75–5.0 µm) with a 3.5° × 11.3° field of view, testing models of cosmic inflation across cosmic time.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] lg:mt-10">
              <Kpi label="Lookback Time" refEl={altRef} init="2.45 Gyr" />
              <Kpi label="Expansion (1 + z)" refEl={gamRef} init="×1.20" accent />
              <Kpi label="Co-moving Volume" refEl={homeRef} init="15 Gpc³" className="hidden sm:block" />
              <Kpi label="Redshift z" refEl={zRef} init="0.20" className="hidden sm:block" />
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="glass rounded-[24px] p-5 md:rounded-[30px] md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/45 md:text-[10px]">SPHEREx Extragalactic Survey · Redshift & Lookback Depth</p>
                  <p className="mt-1 hidden text-sm text-bone/70 md:block">Spectroscopic clustering volume across 102 near-infrared bands (0.75 – 5.0 µm)</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="chip hidden text-bone/70 sm:inline-flex">All-Sky Cadence</span>
                  <span className="chip text-ember-soft">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                    Cryo Active
                  </span>
                </div>
              </div>

              <div className="relative mt-6 h-[30vh] md:mt-8 md:h-[44vh]">
                <div className="relative flex h-full items-end gap-2 md:gap-4">
                  {LOOKBACK_GYR.map((_, i) => (
                    <div
                      key={i}
                      className="tl-bar relative h-full flex-1"
                      style={dv({
                        "--i": i,
                        "--h": `${(HEIGHTS[i] * 100).toFixed(2)}%`,
                        "--val": HEIGHTS[i],
                      })}
                    >
                      <div className="tl-bar-track">
                        <div className="pointer-events-none absolute inset-0 rounded-t-md border border-white/[0.05] bg-white/[0.02] md:rounded-t-lg" />
                        <div className="tl-bar-fill" style={{ background: barColor(i) }} />
                        <span
                          ref={(el) => {
                            capRefs.current[i] = el;
                          }}
                          className="tl-bar-cap"
                        >
                          ×1.000
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-2 md:gap-4">
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
