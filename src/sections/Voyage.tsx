import { useEffect, useRef, useState } from "react";
import ignition from "../assets/img/ignition.jpg";
import drift from "../assets/img/drift.jpg";
import horizon from "../assets/img/horizon.jpg";
import { clamp, subscribe } from "../lib/engine";
import { cn } from "../utils/cn";
import { Kicker, SplitText, dv } from "../components/ui";

const ACTS = [
  {
    act: "Pillar I",
    n: "01",
    title: "Cosmic Dawn",
    kicker: "Galaxy Formation & Inflation",
    img: ignition,
    alt: "Infrared extragalactic sky survey mapping hundreds of millions of distant galaxies",
    rgb: "108,229,255",
    text: "SPHEREx measures 3D large-scale structure across hundreds of millions of galaxies and traces spatial fluctuations in the Cosmic Infrared Background (CIB), testing cosmic inflation models and uncovering the epoch of first star formation.",
    meta: [
      ["Wavelengths", "0.75 – 5.0 µm"],
      ["Field of View", "3.5° × 11.3°"],
      ["Prime Survey", "4 Full-Sky Maps"],
    ],
  },
  {
    act: "Pillar II",
    n: "02",
    title: "Biogenic Ices",
    kicker: "The Chemistry of Planet Formation",
    img: drift,
    alt: "Dense interstellar molecular clouds where water, carbon dioxide, and carbon monoxide ices condense",
    rgb: "155,123,255",
    text: "Across dense molecular clouds and young protoplanetary discs, SPHEREx detects solid absorption signatures of prebiotic ices—water ice at 3.05 µm, CO₂ ice at 4.27 µm, and CO ice at 4.67 µm—tracing how water and organics are delivered to newly forming planetary systems.",
    meta: [
      ["H₂O Ice Band", "3.05 µm (D4)"],
      ["CO₂ Ice Band", "4.27 µm (D5)"],
      ["CO Ice Band", "4.67 µm (D6)"],
    ],
  },
  {
    act: "Pillar III",
    n: "03",
    title: "Time-Domain",
    kicker: "The Universe in Motion",
    img: horizon,
    alt: "Multi-epoch astronomical comparison revealing proper motion and variable stellar flux",
    rgb: "255,138,61",
    text: "By revisiting the entire sky every six months, SPHEREx uncovers dynamic cosmic phenomena: high-proper-motion brown dwarfs like WISE 0855, variable accretion discs like RW Aurigae, Mira pulsations in R Draconis, and moving Solar System asteroids.",
    meta: [
      ["Cadence", "Every 6 Months"],
      ["Spectral Bands", "102 Near-IR Channels"],
      ["Astrometry", "Multi-Epoch Centroids"],
    ],
  },
];

const STICK_GAP = 28;

/** Scene 3 — Sticky stacking cards over a synchronised, cross-fading backdrop */
export default function Voyage() {
  const sectionRef = useRef<HTMLElement>(null);
  const wraps = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let current = 0;
    return subscribe(({ vh }) => {
      const sec = sectionRef.current;
      if (!sec) return;
      const sr = sec.getBoundingClientRect();
      if (sr.bottom < -50 || sr.top > vh + 50) return;
      const els = wraps.current;
      const tops = els.map((el) => (el ? el.getBoundingClientRect().top : vh));
      let a = 0;
      tops.forEach((tp, i) => {
        if (tp < vh * 0.6) a = i;
      });
      if (a !== current) {
        current = a;
        setActive(a);
      }
      els.forEach((el, i) => {
        if (!el) return;
        let depth = 0;
        for (let j = i + 1; j < els.length; j++) {
          const stick = vh * 0.12 + j * STICK_GAP;
          depth += clamp((vh - tops[j]) / Math.max(1, vh - stick));
        }
        el.style.setProperty("--depth", depth.toFixed(3));
      });
    });
  }, []);

  return (
    <section id="voyage" ref={sectionRef} className="relative">
      {/* Fixed cinematic backdrop */}
      <div className="sticky top-0 h-screen overflow-hidden" aria-hidden="true">
        {ACTS.map((a, i) => (
          <div
            key={a.n}
            className={cn(
              "ease-expo absolute inset-0 transition-[opacity,transform] duration-[1800ms]",
              active === i ? "scale-100 opacity-100" : "scale-[1.12] opacity-0"
            )}
          >
            <img src={a.img} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(5,6,10,0.6), rgba(${a.rgb},0.10) 50%, rgba(5,6,10,0.88))` }} />
          </div>
        ))}
        <div className="absolute inset-0 bg-ink/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(5,6,10,0.92)_85%)]" />
        <div className="absolute inset-x-0 bottom-[-2vw] select-none text-center">
          {ACTS.map((a, i) => (
            <span
              key={a.n}
              className={cn(
                "text-outline absolute inset-x-0 bottom-0 whitespace-nowrap font-serif text-[21vw] leading-none transition-opacity duration-1000",
                active === i ? "opacity-100" : "opacity-0"
              )}
            >
              {a.title}
            </span>
          ))}
        </div>
      </div>

      <div className="relative -mt-[100vh]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-linear-to-b from-ink via-ink/70 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[40vh] bg-linear-to-t from-ink to-transparent" />

        <header className="shell relative flex min-h-[92vh] flex-col justify-end pb-[12vh]">
          <Kicker>Mission Architecture — 3 Scientific Pillars</Kicker>
          <SplitText text="The Full Spectrum. | *Three Pillars.*" className="mt-6 font-serif text-[clamp(3.2rem,9vw,9.4rem)] leading-[0.88] tracking-[-0.015em]" />
          <div data-reveal="up" style={dv({ "--d": "300ms" })} className="mt-8 max-w-xl text-[16px] leading-[1.75] text-bone/65 space-y-3">
            <p>
              SPHEREx unites extragalactic cosmology, interstellar astrochemistry, and time-domain stellar astrophysics into one continuous survey.
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs font-mono text-bone/70 space-y-1">
              <span className="text-sky-300 font-semibold block uppercase tracking-wider text-[10px]">Scientific Scope & NASA Mission Objectives:</span>
              <p>• Official NASA Objectives: Inflation & Large-Scale Structure · Galactic Light (EBL) · Interstellar Water & Biogenic Ices.</p>
              <p>• MARSAD Exploration: Extends these 3 core science pillars into interactive time-domain astrometry and Solar System moving object analysis.</p>
            </div>
          </div>
        </header>

        <div className="shell relative pb-[24vh]">
          {ACTS.map((a, i) => (
            <div
              key={a.n}
              ref={(el) => {
                wraps.current[i] = el;
              }}
              className="sticky mb-[14vh] last:mb-0"
              style={{ top: `calc(12vh + ${i * STICK_GAP}px)` }}
            >
              <article
                className="stack-card relative grid h-[calc(88vh_-_96px)] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(20,23,32,0.94),rgba(8,9,14,0.97))] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] md:h-[min(74vh,760px)] md:grid-cols-[1.05fr_1fr] md:rounded-[36px]"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full"
                  style={{ background: `radial-gradient(circle, rgba(${a.rgb},0.26), transparent 65%)` }}
                />
                {/* mobile visual */}
                <div className="relative h-36 overflow-hidden md:hidden">
                  <img src={a.img} alt={a.alt} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-linear-to-t from-[rgba(14,16,23,1)] to-transparent" />
                </div>

                <div className="relative flex flex-col p-6 md:p-12 lg:p-14">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-bone/50">
                    <span style={{ color: `rgb(${a.rgb})` }}>{a.act}</span>
                  </div>
                  <span aria-hidden="true" className="text-outline pointer-events-none absolute right-8 top-12 hidden font-serif text-[12rem] leading-none md:block lg:text-[14rem]">
                    {a.n}
                  </span>
                  <div className="relative mt-auto">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: `rgb(${a.rgb})` }}>
                      {a.kicker}
                    </p>
                    <h3 className="mt-3 font-serif text-[clamp(2.6rem,5.6vw,5.6rem)] leading-[0.92]">{a.title}</h3>
                    <p className="mt-4 max-w-md text-[14px] leading-relaxed text-bone/65 md:mt-6 md:text-[15.5px]">{a.text}</p>
                    <dl className="mt-8 hidden grid-cols-3 gap-6 border-t border-white/10 pt-6 md:grid">
                      {a.meta.map(([k, v]) => (
                        <div key={k}>
                          <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/40">{k}</dt>
                          <dd className="mt-2 text-[15px] text-bone/90">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                <div className="relative m-3 hidden overflow-hidden rounded-[26px] md:block">
                  <img src={a.img} alt={a.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/15" />
                  <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 120px -20px rgba(${a.rgb},0.35)` }} />
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-end font-mono text-[10px] uppercase tracking-[0.2em] text-bone/75">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(${a.rgb})` }} />
                      {a.title}
                    </span>
                  </div>
                </div>
                <div className="shade pointer-events-none absolute inset-0 bg-black" />
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
