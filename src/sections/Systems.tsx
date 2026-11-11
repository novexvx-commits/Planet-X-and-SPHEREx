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
    code: "TEL-01",
    cat: "Optics",
    title: "All-Aluminum TMA Telescope",
    rgb: "108,229,255",
    icon: <IconDrive />,
    desc: "A 20 cm aperture Three-Mirror Anastigmat diamond-turned telescope delivering a wide 3.5° × 11.3° field of view.",
    bullets: ["20 cm diameter all-aluminum monolithic optics", "Wide 3.5° × 11.3° survey field of view", "Diffraction-limited across 0.75 – 5.0 µm"],
    stat: ["Aperture", "20 cm f/3.0"],
  },
  {
    code: "DET-02",
    cat: "Spectroscopy",
    title: "Linear Variable Filter Arrays",
    rgb: "255,138,61",
    icon: <IconRing />,
    desc: "Six Teledyne H2RG 2048×2048 pixel infrared detector arrays bonded with wedged dielectric Linear Variable Filters.",
    bullets: ["102 spectral resolution elements (R = 40–130)", "Six cryogenically cooled H2RG focal planes", "Slitless spectral dispersion in every exposure"],
    stat: ["Coverage", "102 Bands"],
  },
  {
    code: "CRY-03",
    cat: "Cryogenics",
    title: "V-Groove Radiative Cooling",
    rgb: "155,123,255",
    icon: <IconMind />,
    desc: "Three concentric conical aluminum V-groove thermal shields passively rejecting Earth and solar infrared heat loads.",
    bullets: ["100% passive cooling to sub-80K without liquid cryogens", "Thermal isolation maintaining <55 K detector stage", "25-month continuous all-sky prime mission baseline"],
    stat: ["FPA Temp", "< 55 Kelvin"],
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
          <Kicker>Chapter IX — Observatory Subsystems</Kicker>
          <SplitText text="Three innovations. | *All-sky reach.*" className="mt-6 font-serif text-[clamp(3rem,7.4vw,7.6rem)] leading-[0.9] tracking-[-0.015em]" />
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <p data-reveal="up" className="text-[16px] leading-[1.75] text-bone/60">
            Operating in a 700 km polar terminator orbit, SPHEREx eliminates moving mechanisms and cryogen depletion through passive thermal staging and slitless LVF dispersion. Three subsystems anchor the observatory.
          </p>
          <p data-reveal="fade" style={dv({ "--d": "200ms" })} className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">
            SPHEREx · NASA Astrophysics MIDEX · Caltech / JPL
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
