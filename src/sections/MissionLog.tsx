import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../utils/cn";
import { Arrow, Kicker, Magnetic, dv } from "../components/ui";
import { clamp, subscribe, scrollToTarget, refreshEngine } from "../lib/engine";

type Kind = "lens" | "star" | "ship" | "planet" | "hole" | "signal";

const LOG: { year: string; tag: string; title: string; text: string; rgb: string; kind: Kind }[] = [
  { year: "Feb 2019", tag: "Completed Event · Selection", title: "NASA MIDEX Mission Selection", text: "Completed Mission Event — NASA selects SPHEREx (Caltech/JPL) as a Medium-Class Explorer mission to map the entire sky across 102 near-infrared spectral channels (0.75–5.0 µm).", rgb: "155,123,255", kind: "lens" },
  { year: "Jan 2021", tag: "Completed Event · Phase C", title: "Instrument & Design Confirmation", text: "Completed Mission Event — NASA confirms SPHEREx for final design and construction, baselining the 20 cm all-aluminum telescope, 3.5° × 11.3° FOV, and six Linear Variable Filter arrays (D1–D6).", rgb: "108,229,255", kind: "star" },
  { year: "2022–2023", tag: "Completed Event · Hardware", title: "LVF Focal Plane Qualification", text: "Completed Mission Event — Six detector arrays (D1–D3 at R~41, D4 at R~35, D5 at R~110, D6 at R~130) and Linear Variable Filters complete optical and cryogenic qualification.", rgb: "236,232,225", kind: "ship" },
  { year: "2024", tag: "Completed Event · ATLO", title: "Observatory Assembly & Test", text: "Completed Mission Event — Spacecraft bus, V-groove passive thermal shields, and the Three-Mirror Anastigmat optical assembly complete integration and environmental testing.", rgb: "255,138,61", kind: "planet" },
  { year: "Mar 2025", tag: "Completed Event · Launch", title: "Launch to Sun-Synchronous Orbit", text: "Completed Mission Event — SPHEREx launches in March 2025 from Vandenberg Space Force Base into polar Sun-synchronous terminator orbit to begin orbital commissioning.", rgb: "108,229,255", kind: "star" },
  { year: "May 2025", tag: "Completed Event · Survey Ops", title: "All-Sky Survey Operations Begin", text: "Completed Mission Event — Following in-orbit checkout and first light, routine all-sky spectral mapping begins on a 6-month full-sky cadence toward four planned prime-mission maps.", rgb: "155,123,255", kind: "signal" },
  { year: "Jul 2025", tag: "Public Data Release · QR1", title: "SPHEREx Quick Release 1 (QR1)", text: "Completed Public Data Release — Initial public archive release of calibrated Level-2 SPHEREx spectral exposures and SIAv2 services at NASA/IPAC IRSA.", rgb: "236,232,225", kind: "ship" },
  { year: "Oct 2025", tag: "Public Data Release · QR2", title: "SPHEREx Quick Release 2 (QR2)", text: "Completed Public Data Release (October 2025) — NASA/IPAC IRSA publishes expanded Quick Release 2 calibrated Level-2 spectral exposures across all six detector arrays (D1–D6).", rgb: "255,138,61", kind: "hole" },
  { year: "Sep 2026", tag: "Planned Milestone · QR3", title: "SPHEREx Quick Release 3 (QR3)", text: "Planned Public Data Release (September 2026) — Scheduled NASA/IPAC IRSA archive release expanding multi-epoch sky coverage across the all-sky survey.", rgb: "255,192,138", kind: "hole" },
  { year: "Nov 2026", tag: "Planned Milestone · DR1", title: "Data Release 1 (DR1) & Prime Survey", text: "Planned Public Data Release & Future Event (November 2026) — Scheduled first major cumulative Data Release 1 (DR1) at NASA/IPAC IRSA, followed by completion of the four planned full-sky maps.", rgb: "108,229,255", kind: "signal" },
];

const TILTS = [-18, 12, -28, 22, -8, 32, -20, 14, -12, 26];

function Orbit({ i, rgb, kind }: { i: number; rgb: string; kind: Kind }) {
  const id = "o" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tilt = TILTS[i % TILTS.length];
  const phi = ((i * 67 + 30) % 360) * (Math.PI / 180);
  const dx = 100 + 62 * Math.cos(phi);
  const dy = 60 + 15 * Math.sin(phi);
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity="0.55" />
          <stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fe9ff" />
          <stop offset="1" stopColor="#1b3b66" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="60" r="46" fill={`url(#${id}-g)`} />
      <g className="orbit-spin">
        <g transform={`rotate(${tilt} 100 60)`} strokeWidth="0.8">
          <ellipse cx="100" cy="60" rx="88" ry="22" stroke={`rgba(${rgb},0.35)`} strokeDasharray="2 4" />
          <ellipse cx="100" cy="60" rx="62" ry="15" stroke={`rgba(${rgb},0.6)`} />
          <ellipse cx="100" cy="60" rx="38" ry="9" stroke="rgba(255,255,255,0.16)" />
          <circle cx={dx} cy={dy} r="2.6" fill={`rgb(${rgb})`} />
          <circle cx={dx} cy={dy} r="6" stroke={`rgba(${rgb},0.5)`} />
        </g>
      </g>
      {kind === "hole" && (
        <>
          <ellipse cx="100" cy="60" rx="30" ry="5" stroke="rgba(255,170,100,0.9)" strokeWidth="1.4" transform="rotate(-10 100 60)" />
          <circle cx="100" cy="60" r="11" fill="#000" stroke="rgba(255,220,180,0.95)" strokeWidth="1.2" />
          <path d="M70 60.5 A30 5 0 0 0 130 59.5" stroke="rgba(255,190,130,0.95)" strokeWidth="1.4" transform="rotate(-10 100 60)" />
        </>
      )}
      {kind === "star" && (
        <>
          <circle cx="100" cy="60" r="6" fill="#fff" />
          <path d="M100 44v32M84 60h32" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
        </>
      )}
      {kind === "planet" && (
        <>
          <circle cx="100" cy="60" r="12" fill={`url(#${id}-p)`} />
          <path d="M88 60 A12 12 0 0 0 112 60" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
        </>
      )}
      {kind === "ship" && (
        <>
          <rect x="80" y="58.5" width="40" height="3" rx="1.5" fill="rgba(236,232,225,0.9)" />
          <circle cx="92" cy="60" r="5" stroke="rgba(236,232,225,0.8)" strokeWidth="1" />
          <path d="M120 60 H146" stroke="rgba(108,229,255,0.9)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {kind === "lens" && (
        <>
          <circle cx="100" cy="60" r="16" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" strokeDasharray="1 3" />
          <circle cx="100" cy="60" r="4" fill="#000" stroke="rgba(255,255,255,0.8)" />
          <circle cx="116" cy="56" r="1.8" fill="#fff" />
          <circle cx="86" cy="66" r="1.2" fill="#fff" />
        </>
      )}
      {kind === "signal" && (
        <>
          <circle cx="100" cy="60" r="3" fill={`rgb(${rgb})`} />
          <path d="M110 48 A16 16 0 0 1 110 72 M118 40 A28 28 0 0 1 118 80 M126 32 A40 40 0 0 1 126 88" stroke={`rgba(${rgb},0.7)`} strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

/**
 * Scene 7 — Spacious Pinned Horizontal Scrollytelling Timeline:
 * Seamlessly locks on-screen while scrolling vertically down the page, gliding the 10
 * milestone cards horizontally on the X-axis with zero clipping and generous breathing room.
 */
export default function MissionLog() {
  const sectionRef = useRef<HTMLElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  // Sync horizontal translation with vertical scroll progress
  useEffect(() => {
    refreshEngine();

    let lastP = -1;
    const unsubscribe = subscribe(({ vh }) => {
      const sec = sectionRef.current;
      const track = trackRef.current;
      if (!sec || !track) return;

      const rect = sec.getBoundingClientRect();
      const scrollDist = rect.height - vh;
      if (scrollDist <= 0) return;

      // Calculate scroll progress p [0, 1] through the pinned section
      const p = clamp(-rect.top / scrollDist);
      if (Math.abs(p - lastP) < 0.0001) return;
      lastP = p;

      // Translate track horizontally along X-axis with generous end clearance
      const maxTranslate = Math.max(0, track.scrollWidth - window.innerWidth);
      const currentX = -p * maxTranslate;

      track.style.transform = `translate3d(${currentX.toFixed(2)}px, 0, 0)`;

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.max(0.06, p).toFixed(4)})`;
      }

      const activeIdx = Math.min(LOG.length - 1, Math.round(p * (LOG.length - 1)));
      setIdx(activeIdx);
      setEdges({ start: p <= 0.02, end: p >= 0.98 });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Pointer drag to scroll interaction
  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;

    let dragging = false;
    let startX = 0;
    let startScrollY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startScrollY = window.scrollY;
      try {
        vp.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      vp.classList.add("is-dragging");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const sec = sectionRef.current;
      const track = trackRef.current;
      if (!sec || !track) return;

      const dx = e.clientX - startX;
      const maxTranslate = Math.max(1, track.scrollWidth - window.innerWidth);
      const totalScrollable = sec.getBoundingClientRect().height - window.innerHeight;
      const deltaScrollY = -(dx / maxTranslate) * totalScrollable;
      window.scrollTo({
        top: startScrollY + deltaScrollY,
        behavior: "auto"
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      vp.classList.remove("is-dragging");
      try {
        vp.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };

    vp.addEventListener("pointerdown", onPointerDown);
    vp.addEventListener("pointermove", onPointerMove);
    vp.addEventListener("pointerup", onPointerUp);
    vp.addEventListener("pointercancel", onPointerUp);

    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      vp.removeEventListener("pointermove", onPointerMove);
      vp.removeEventListener("pointerup", onPointerUp);
      vp.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const go = (direction: number) => {
    if (!sectionRef.current) return;
    const nextIdx = Math.max(0, Math.min(LOG.length - 1, idx + direction));
    const targetP = nextIdx / (LOG.length - 1);
    const rect = sectionRef.current.getBoundingClientRect();
    const secTop = window.scrollY + rect.top;
    const totalScrollable = rect.height - window.innerHeight;
    const targetY = secTop + targetP * totalScrollable;
    scrollToTarget(targetY, { duration: 0.8 });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section ref={sectionRef} id="log" className="relative h-[360vh] bg-ink">
      {/* Sticky Fullscreen Stage: Centered with ample vertical room */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center gap-5 sm:gap-6 py-4 select-none">
        {/* Ambient Top Glow */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-[10vw] left-1/2 h-[40vw] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(107,70,255,0.12),transparent_65%)]" />

        {/* Compact, High-Impact Header Bar */}
        <div className="shell relative flex flex-wrap items-end justify-between gap-4 shrink-0">
          <div>
            <Kicker>Chapter VII — Mission Chronology</Kicker>
            <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight text-slate-100">
              Survey Cadence, <em className="italic text-ember-soft">logged across epochs.</em>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs tabular-nums text-bone/60">
              <span className="text-amber-400 font-bold">{pad(idx + 1)}</span> / {pad(LOG.length)}
            </span>
            <Magnetic>
              <button type="button" aria-label="Previous milestone" disabled={edges.start} onClick={() => go(-1)} className="arrow-btn cursor-pointer">
                <Arrow className="h-4 w-4" dir="left" />
              </button>
            </Magnetic>
            <Magnetic>
              <button type="button" aria-label="Next milestone" disabled={edges.end} onClick={() => go(1)} className="arrow-btn cursor-pointer">
                <Arrow className="h-4 w-4" />
              </button>
            </Magnetic>
          </div>
        </div>

        {/* Horizontal Track Viewport: Unclipped vertically with generous card padding */}
        <div
          ref={vpRef}
          data-cursor="drag"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Mission log timeline. Scroll vertically to explore along the X-axis."
          onKeyDown={onKey}
          className="log-vp relative w-full overflow-visible outline-none cursor-grab active:cursor-grabbing py-4"
        >
          <div
            ref={trackRef}
            className="log-track flex w-max gap-6 md:gap-8 pl-6 sm:pl-12 md:pl-20 xl:pl-28 pr-16 sm:pr-24 md:pr-36 xl:pr-48 will-change-transform"
            style={{ transform: "translate3d(0, 0, 0)", transition: "none" }}
          >
            {LOG.map((m, i) => (
              <article
                key={m.year}
                className="log-card group relative w-[85vw] sm:w-[380px] md:w-[410px] lg:w-[430px] shrink-0 rounded-[28px] border border-white/10 bg-[#0d1322]/85 backdrop-blur-xl p-6 sm:p-7 md:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-white/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
              >
                <div className="shine" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[10.5px] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full border border-white/10 bg-white/[0.04]"
                      style={{ color: `rgb(${m.rgb})` }}
                    >
                      {m.tag}
                    </span>
                    <span className="font-mono text-xs tracking-wider text-bone/40">M-{pad(i + 1)}</span>
                  </div>

                  <div className="relative h-28 sm:h-32 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/50">
                    <Orbit i={i} rgb={m.rgb} kind={m.kind} />
                  </div>

                  <div>
                    <p className="font-serif text-4xl sm:text-5xl font-normal leading-none tracking-tight text-white">{m.year}</p>
                    <h3 className="mt-2.5 text-base sm:text-lg font-medium tracking-tight text-slate-100">{m.title}</h3>
                    <p className="mt-2 text-xs sm:text-[13.5px] leading-relaxed text-bone/65">{m.text}</p>
                  </div>
                </div>

                <div className={cn("mt-5 h-px w-full", i === 7 || i === 8 ? "bg-linear-to-r from-ember/60 to-transparent" : "bg-white/[0.08]")} />
              </article>
            ))}
          </div>
        </div>

        {/* Footer Progress Bar & Interaction Hint */}
        <div className="shell flex items-center justify-between gap-6 shrink-0 pt-1">
          <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div
              ref={barRef}
              className="h-full origin-left rounded-full bg-linear-to-r from-ion via-nebula to-ember transition-transform duration-75"
              style={{ transform: "scaleX(0.06)" }}
            />
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-bone/50 shrink-0">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Scroll to navigate timeline · Drag · ← →</span>
          </div>
        </div>
      </div>
    </section>
  );
}
