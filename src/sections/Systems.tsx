import type { PointerEvent as RPointerEvent, ReactNode } from "react";
import { Kicker, SplitText, dv } from "../components/ui";

function IconDrive() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="sys-icon h-full w-full">
      <ellipse className="draw" cx="24" cy="12" rx="11" ry="4.5" pathLength={1} />
      <path className="draw" d="M13 12 L17.5 29 H30.5 L35 12" pathLength={1} />
      <path className="draw" d="M17.5 29 Q24 33.5 30.5 29" pathLength={1} />
      <path className="flow" d="M20 35 L18 45 M24 35 V46 M28 35 L30 45" />
      <circle cx="24" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconRing() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="sys-icon h-full w-full">
      <g className="spin">
        <circle className="draw" cx="24" cy="24" r="18" pathLength={1} />
        <circle cx="24" cy="24" r="12.5" strokeDasharray="2 3" opacity="0.7" />
        <path d="M24 6v5.5M24 36.5V42M6 24h5.5M36.5 24H42" />
        <circle cx="24" cy="6" r="1.8" fill="currentColor" stroke="none" />
      </g>
      <circle className="draw" cx="24" cy="24" r="4.2" pathLength={1} />
    </svg>
  );
}

function IconMind() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="sys-icon h-full w-full">
      <path className="draw" d="M4 24 C11 13 37 13 44 24 C37 35 11 35 4 24 Z" pathLength={1} />
      <circle className="draw" cx="24" cy="24" r="7.5" pathLength={1} />
      <circle cx="24" cy="24" r="2.3" fill="currentColor" stroke="none" />
      <path className="flow" d="M24 3v5M24 40v5M8.5 8.5l3 3M39.5 8.5l-3 3" />
    </svg>
  );
}

const SYSTEMS: { code: string; cat: string; title: string; rgb: string; icon: ReactNode; desc: string; bullets: string[]; stat: [string, string] }[] = [
  {
    code: "SYS-01",
    cat: "Propulsion",
    title: "Casimir Lattice Drive",
    rgb: "108,229,255",
    icon: <IconDrive />,
    desc: "A crystal of engineered vacuum that harvests zero-point energy and pours it through a magnetic nozzle.",
    bullets: ["4.1 × 10¹⁹ joules held in the lattice", "3.4 meganewtons of continuous thrust", "A 22-year burn without a single shutdown"],
    stat: ["Peak", "0.21c"],
  },
  {
    code: "SYS-02",
    cat: "Habitat",
    title: "The Verdance Ring",
    rgb: "255,138,61",
    icon: <IconRing />,
    desc: "A 1.2-kilometre toroid spun to nine-tenths of Earth’s gravity, wrapped around a living forest.",
    bullets: ["2,814 species in a closed biosphere", "99.97% water recovery — every drop", "A ribbon sun that keeps Earth’s hours"],
    stat: ["Crew", "108 → 145"],
  },
  {
    code: "SYS-03",
    cat: "Intelligence",
    title: "Vesper Cognitive Core",
    rgb: "155,123,255",
    icon: <IconMind />,
    desc: "A photonic mind cooled to four kelvin — navigator, physician, engineer and, in the long dark, companion.",
    bullets: ["1.6 billion autonomous repair decisions", "Zero critical failures in 71 years", "One symphony composed for every year"],
    stat: ["Uptime", "99.9998%"],
  },
];

const onMove = (e: RPointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
  e.currentTarget.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
};

/** Scene 9 — Three-column glassmorphism grid with bespoke micro-icons */
export default function Systems() {
  return (
    <section id="systems" className="relative overflow-hidden py-28 md:py-44">
      <div aria-hidden="true" className="orb orb-a" />
      <div aria-hidden="true" className="orb orb-b" />
      <div aria-hidden="true" className="orb orb-c" />
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-60" />

      <div className="shell relative grid gap-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <Kicker>Chapter IX — Engineering the Impossible</Kicker>
          <SplitText text="Three systems. | *Zero margin.*" className="mt-6 font-serif text-[clamp(3rem,7.4vw,7.6rem)] leading-[0.9] tracking-[-0.015em]" />
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <p data-reveal="up" className="text-[16px] leading-[1.75] text-bone/60">
            Seventy-one years from the nearest spare part, every system aboard Meridian had to be self-healing, redundant, and quietly brilliant.
            Three of them carried the weight of everything else.
          </p>
          <p data-reveal="fade" style={dv({ "--d": "200ms" })} className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">
            Meridian · Class-I interstellar vessel · 1.9 km
          </p>
        </div>
      </div>

      <div className="shell relative mt-16 grid gap-5 md:mt-24 lg:grid-cols-3 lg:gap-6">
        {SYSTEMS.map((s, i) => (
          <div key={s.code} data-reveal="up" style={dv({ "--d": `${i * 140}ms` })}>
            <article onPointerMove={onMove} className="glass-card group h-full p-7 md:p-9" style={dv({ "--glow": s.rgb })}>
              <div className="relative flex items-start justify-between">
                <div className="sys-icon-box grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] p-3.5" style={{ color: `rgb(${s.rgb})` }}>
                  {s.icon}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">{s.code}</span>
              </div>
              <p className="relative mt-10 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `rgb(${s.rgb})` }}>
                {s.cat}
              </p>
              <h3 className="relative mt-3 font-serif text-[2.1rem] leading-[1.02] md:text-[2.5rem]">{s.title}</h3>
              <p className="relative mt-4 text-[15px] leading-relaxed text-bone/60">{s.desc}</p>
              <ul className="relative mt-7 space-y-3.5 border-t border-white/[0.08] pt-7">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[14.5px] leading-snug text-bone/80">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: `rgb(${s.rgb})` }} />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="relative mt-9 flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bone/55">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300/90" />
                  Nominal
                </span>
                <span className="text-sm text-bone/85">
                  <span className="text-bone/40">{s.stat[0]} · </span>
                  {s.stat[1]}
                </span>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
