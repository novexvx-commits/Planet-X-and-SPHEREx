import { useEffect, useRef } from "react";
import cities from "../assets/img/cities.jpg";
import dawn from "../assets/img/dawn.jpg";
import { clamp, subscribe } from "../lib/engine";
import { Kicker, SplitText, dv } from "../components/ui";

const OBSERVATORY = "https://images.pexels.com/photos/11720316/pexels-photo-11720316.jpeg?auto=compress&cs=tinysrgb&w=1920";

const VISIONS = [
  {
    n: "01",
    horizon: "Cosmic Dawn",
    title: "Origins | of the cosmos",
    img: cities,
    alt: "Cosmic web and large-scale galaxy distribution traced across infrared wavelengths",
    text: "How did the universe begin? By measuring 3D clustering in 450+ million galaxies across 102 near-infrared bands, SPHEREx tests inflation theories and maps primordial non-Gaussianity from the first cosmic moments.",
  },
  {
    n: "02",
    horizon: "Galaxy Evolution",
    title: "Light | across epochs",
    img: OBSERVATORY,
    alt: "Observatories tracking extragalactic background light and early stellar reionization",
    text: "How did galaxies form and evolve? SPHEREx measures the total extragalactic background light (EBL), mapping the cumulative emission of early dwarf galaxies and the first stars that reionized the universe.",
  },
  {
    n: "03",
    horizon: "Planetary Origins",
    title: "Ices | of living worlds",
    img: dawn,
    alt: "Protostellar disks harboring water, carbon dioxide, and methanol biogenic ice reservoirs",
    text: "Where did the ingredients of life come from? By surveying interstellar ices (H2O, CO2, CO, CH3OH) across thousands of young stellar objects, SPHEREx quantifies how life-bearing molecules reach planet-forming disks.",
  },
];

/** Scene 10 — Stacking fullscreen vision cards (scale, round & dim as the next card arrives) */
export default function Vision() {
  const sectionRef = useRef<HTMLElement>(null);
  const wraps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    return subscribe(({ vh }) => {
      const sec = sectionRef.current;
      if (!sec) return;
      const sr = sec.getBoundingClientRect();
      if (sr.bottom < -vh || sr.top > vh * 2) return;
      const els = wraps.current;
      const tops = els.map((el) => (el ? el.getBoundingClientRect().top : vh));
      els.forEach((el, i) => {
        if (!el) return;
        const cover = i + 1 < els.length ? clamp(1 - tops[i + 1] / vh) : 0;
        const enter = clamp(tops[i] / vh);
        el.style.setProperty("--c", cover.toFixed(4));
        el.style.setProperty("--e", enter.toFixed(4));
      });
    });
  }, []);

  return (
    <section id="vision" ref={sectionRef} className="relative bg-ink">
      <div className="shell grid gap-10 py-28 md:grid-cols-12 md:items-end md:py-44">
        <div className="md:col-span-8">
          <Kicker>Chapter X — Scientific Horizons</Kicker>
          <SplitText text="Three questions. | One *all-sky answer.*" className="mt-6 font-serif text-[clamp(3rem,7.6vw,8rem)] leading-[0.9] tracking-[-0.015em]" />
        </div>
        <p data-reveal="up" style={dv({ "--d": "200ms" })} className="text-[16px] leading-[1.75] text-bone/60 md:col-span-4">
          SPHEREx answers three foundational questions of modern astrophysics: how the universe expanded during inflation, how the first stars lit up the cosmos, and where the chemical ingredients of life originated.
        </p>
      </div>

      <div className="relative">
        {VISIONS.map((v, i) => (
          <div
            key={v.n}
            ref={(el) => {
              wraps.current[i] = el;
            }}
            className="sticky top-0 h-screen overflow-hidden bg-ink"
          >
            <div className="vision-card relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1530,#05060a_70%)]">
              <img src={v.img} alt={v.alt} className="v-img absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-linear-to-b from-black/75 via-black/20 to-black/85" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />

              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <p data-reveal="fade" className="kicker flex items-center gap-3 text-bone/65">
                  <span className="h-px w-8 bg-current opacity-60" />
                  Vision {v.n} / 03 · {v.horizon}
                  <span className="h-px w-8 bg-current opacity-60" />
                </p>
                <SplitText as="h3" text={v.title} className="text-glow mt-7 font-serif text-[clamp(3.4rem,10.5vw,11rem)] leading-[0.86] tracking-[-0.02em]" />
                <p data-reveal="up" style={dv({ "--d": "300ms" })} className="text-glow mt-8 max-w-xl text-[16px] leading-[1.75] text-bone/80 md:text-lg">
                  {v.text}
                </p>
              </div>

              <div className="shell absolute inset-x-0 bottom-0 flex items-center justify-between pb-7 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/50 md:pb-9">
                <span>MARSAD · SPHEREx Vision</span>
                <span className="flex items-center gap-3">
                  {VISIONS.map((x, j) => (
                    <span key={x.n} className={j === i ? "h-px w-8 bg-bone" : "h-px w-4 bg-bone/30"} />
                  ))}
                </span>
              </div>
              <div className="v-dim pointer-events-none absolute inset-0 bg-black" />
            </div>
          </div>
        ))}
        <div aria-hidden="true" className="h-[35vh]" />
      </div>
    </section>
  );
}
