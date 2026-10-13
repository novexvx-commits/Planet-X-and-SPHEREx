import { useEffect, useRef, useState } from "react";
import ignition from "../assets/img/ignition.jpg";
import drift from "../assets/img/drift.jpg";
import horizon from "../assets/img/horizon.jpg";
import { clamp, subscribe } from "../lib/engine";
import { cn } from "../utils/cn";
import { Kicker, SplitText, dv } from "../components/ui";

const ACTS = [
  {
    act: "Act I",
    n: "01",
    title: "Ignition",
    kicker: "Leaving the cradle",
    img: ignition,
    alt: "Meridian igniting its drive above the dawn-lit limb of Earth",
    rgb: "108,229,255",
    text: "On the winter solstice of 2187, Meridian lit her lattice drive above the night side of Earth. For eleven minutes a second sun burned over the Pacific. Then she was gone — a fading spark in Lyra, carrying the full weight of a planet’s hope.",
    meta: [
      ["Date", "21 · XII · 2187"],
      ["Velocity", "0 → 0.08c"],
      ["Earth recedes", "1 AU / 33 h"],
    ],
  },
  {
    act: "Act II",
    n: "02",
    title: "The Drift",
    kicker: "Forty-four years of silence",
    img: drift,
    alt: "A tiny starship drifting through a vast violet nebula",
    rgb: "155,123,255",
    text: "Between stars there is no weather, no up, no news — only the long fall. The crew grew gardens, raised children, buried friends, and learned that silence has a texture. Even the void, given time, can feel like home.",
    meta: [
      ["Duration", "44 years"],
      ["Cruise", "0.21c"],
      ["Born aboard", "37 children"],
    ],
  },
  {
    act: "Act III",
    n: "03",
    title: "The Horizon",
    kicker: "Where time bends",
    img: horizon,
    alt: "Torrents of amber plasma spiralling into the black void of Erebus",
    rgb: "255,138,61",
    text: "In 2258 the stars ahead began to bend. Erebus revealed itself not as an object but as an absence — a perfect circle of nothing, crowned in fire. Here clocks argue with one another, light walks in circles, and the universe shows its hidden architecture.",
    meta: [
      ["Arrival", "26 · III · 2258"],
      ["Orbit", "3.1 AU"],
      ["Mass", "7.8 M☉"],
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
          <Kicker>Chapter II — The Voyage</Kicker>
          <SplitText text="Seventy-one years. | *Three acts.*" className="mt-6 font-serif text-[clamp(3.2rem,9vw,9.4rem)] leading-[0.88] tracking-[-0.015em]" />
          <p data-reveal="up" style={dv({ "--d": "300ms" })} className="mt-8 max-w-md text-[16px] leading-[1.75] text-bone/65">
            Every voyage is three journeys: the leaving, the long middle no one writes songs about, and the arrival that changes you forever.
          </p>
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
                    <span>{a.n} / 03</span>
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
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-bone/75">
                    <span>Fig. 0{i + 2}</span>
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
