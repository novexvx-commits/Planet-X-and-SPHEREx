import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../utils/cn";
import { Arrow, Kicker, Magnetic, SplitText, dv } from "../components/ui";

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

/** Scene 7 — Interactive horizontal timeline: drag inertia, touch swipe, wheel, keys & arrows */
export default function MissionLog() {
  const vpRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ go: (dir: number) => void }>({ go: () => {} });
  const [idx, setIdx] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const vp = vpRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;

    let x = 0;
    let v = 0;
    let target = 0;
    let min = 0;
    let raf = 0;
    let dragging = false;
    let startX = 0;
    let startPos = 0;
    let lastX = 0;
    let lastT = 0;
    let snaps: number[] = [0];
    let curIdx = -1;
    let curStart = true;
    let curEnd = false;
    let wheelTimer = 0;

    const render = () => {
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      const prog = min < 0 ? Math.min(1, Math.max(0, x / min)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0.06, prog).toFixed(4)})`;
      const di = Math.round(prog * (LOG.length - 1));
      if (di !== curIdx) {
        curIdx = di;
        setIdx(di);
      }
      const s = x > -2;
      const e = x < min + 2;
      if (s !== curStart || e !== curEnd) {
        curStart = s;
        curEnd = e;
        setEdges({ start: s, end: e });
      }
    };

    const measure = () => {
      const cards = Array.from(track.children) as HTMLElement[];
      const pad = cards[0] ? cards[0].offsetLeft : 0;
      min = Math.min(0, vp.clientWidth - track.offsetWidth);
      snaps = cards.map((c) => Math.max(min, Math.min(0, -(c.offsetLeft - pad))));
      x = Math.max(min, Math.min(0, x));
      target = Math.max(min, Math.min(0, target));
      render();
    };

    const nearest = (pos: number) => {
      let best = 0;
      let bd = Infinity;
      snaps.forEach((s, i) => {
        const d = Math.abs(s - pos);
        if (d < bd - 0.5) {
          bd = d;
          best = i;
        }
      });
      return best;
    };

    const tick = () => {
      if (!dragging) {
        v += (target - x) * 0.07;
        v *= 0.76;
        x += v;
        if (Math.abs(v) < 0.02 && Math.abs(target - x) < 0.3) {
          x = target;
          v = 0;
          render();
          raf = 0;
          return;
        }
      }
      render();
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      startX = lastX = e.clientX;
      startPos = x;
      lastT = performance.now();
      v = 0;
      try {
        vp.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      vp.classList.add("is-dragging");
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      let nx = startPos + (e.clientX - startX);
      if (nx > 0) nx *= 0.35;
      else if (nx < min) nx = min + (nx - min) * 0.35;
      const dt = Math.max(1, now - lastT);
      const inst = ((e.clientX - lastX) / dt) * 16.67;
      v = v * 0.55 + inst * 0.45;
      lastX = e.clientX;
      lastT = now;
      x = nx;
      render();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      vp.classList.remove("is-dragging");
      try {
        vp.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      if (performance.now() - lastT > 90) v = 0;
      const projected = Math.max(min, Math.min(0, x + v * 14));
      target = snaps[nearest(projected)];
      kick();
    };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x = Math.max(min, Math.min(0, x - e.deltaX));
      target = x;
      v = 0;
      render();
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        target = snaps[nearest(x)];
        kick();
      }, 160);
    };

    api.current.go = (dir: number) => {
      const i = nearest(x);
      let ni = Math.max(0, Math.min(snaps.length - 1, i + dir));
      while (dir > 0 && ni < snaps.length - 1 && snaps[ni] === snaps[i]) ni++;
      target = snaps[ni];
      kick();
    };

    vp.addEventListener("pointerdown", down);
    vp.addEventListener("pointermove", move);
    vp.addEventListener("pointerup", up);
    vp.addEventListener("pointercancel", up);
    vp.addEventListener("wheel", wheel, { passive: false });
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(track);
    measure();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(wheelTimer);
      ro.disconnect();
      vp.removeEventListener("pointerdown", down);
      vp.removeEventListener("pointermove", move);
      vp.removeEventListener("pointerup", up);
      vp.removeEventListener("pointercancel", up);
      vp.removeEventListener("wheel", wheel);
    };
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      api.current.go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      api.current.go(-1);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section id="log" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-px w-[80%] -translate-x-1/2 bg-linear-to-r from-transparent via-white/15 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-[20vw] left-1/2 h-[50vw] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(107,70,255,0.1),transparent_65%)]" />

      <div className="shell relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Kicker>Chapter VII — Mission Chronology</Kicker>
          <SplitText text="Survey Cadence, | *logged across epochs.*" className="mt-6 font-serif text-[clamp(2.9rem,7vw,7.2rem)] leading-[0.9] tracking-[-0.015em]" />
        </div>
        <div data-reveal="fade" style={dv({ "--d": "300ms" })} className="flex items-center gap-5">
          <span className="mr-2 font-mono text-xs tabular-nums text-bone/45">
            <span className="text-bone">{pad(idx + 1)}</span> / {pad(LOG.length)}
          </span>
          <Magnetic>
            <button type="button" aria-label="Previous milestone" disabled={edges.start} onClick={() => api.current.go(-1)} className="arrow-btn">
              <Arrow className="h-5 w-5" dir="left" />
            </button>
          </Magnetic>
          <Magnetic>
            <button type="button" aria-label="Next milestone" disabled={edges.end} onClick={() => api.current.go(1)} className="arrow-btn">
              <Arrow className="h-5 w-5" />
            </button>
          </Magnetic>
        </div>
      </div>

      <div
        ref={vpRef}
        data-cursor="drag"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Mission log timeline. Use arrow keys to navigate."
        onKeyDown={onKey}
        className="log-vp relative mt-14 cursor-grab touch-pan-y select-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-white/25 md:mt-20"
      >
        <div ref={trackRef} className="log-track flex w-max gap-4 py-4 will-change-transform md:gap-6">
          {LOG.map((m, i) => (
            <article
              key={m.year}
              className="log-card group relative w-[80vw] shrink-0 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025] p-6 sm:w-[380px] md:p-8 lg:w-[410px]"
            >
              <div className="shine" />
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgb(${m.rgb})` }}>
                  {m.tag}
                </span>
                <span className="font-mono text-[10px] tracking-[0.22em] text-bone/35">M-{pad(i + 1)}</span>
              </div>
              <div className="relative mt-6 h-32 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 md:h-36">
                <Orbit i={i} rgb={m.rgb} kind={m.kind} />
              </div>
              <p className="mt-7 font-serif text-6xl leading-none tracking-tight md:text-7xl">{m.year}</p>
              <h3 className="mt-4 text-lg font-medium tracking-tight md:text-xl">{m.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-bone/55">{m.text}</p>
              <div className={cn("mt-7 h-px w-full", i === 7 || i === 8 ? "bg-linear-to-r from-ember/60 to-transparent" : "bg-white/[0.07]")} />
            </article>
          ))}
        </div>
      </div>

      <div className="shell mt-10 flex items-center gap-6">
        <div className="h-px flex-1 bg-white/10">
          <div ref={barRef} className="h-full origin-left bg-linear-to-r from-ion via-nebula to-ember" style={{ transform: "scaleX(0.06)" }} />
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40 sm:block">Drag · Swipe · ← →</span>
      </div>
    </section>
  );
}
