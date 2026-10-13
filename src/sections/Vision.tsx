import { useEffect, useRef } from "react";
import cities from "../assets/img/cities.jpg";
import dawn from "../assets/img/dawn.jpg";
import { clamp, subscribe } from "../lib/engine";
import { Kicker, SplitText, dv } from "../components/ui";

const OBSERVATORY = "https://images.pexels.com/photos/11720316/pexels-photo-11720316.jpeg?auto=compress&cs=tinysrgb&w=1920";

const VISIONS = [
  {
    n: "01",
    horizon: "Horizon 2300",
    title: "Cities | between stars",
    img: cities,
    alt: "A fleet of colossal ring-shaped generation ships glowing with city lights, drifting toward a distant star",
    text: "Meridian was a prototype, not a destination. Within a century, a hundred arks could carry a million people into the dark — not to flee Earth, but to carry her further.",
  },
  {
    n: "02",
    horizon: "Horizon 2340",
    title: "Listening | to the deep",
    img: OBSERVATORY,
    alt: "An observatory beneath a sky dense with stars and the Milky Way",
    text: "Erebus taught us that the universe keeps its loudest secrets in silence. Our next instruments will hear the gravitational whisper of the very first second of time.",
  },
  {
    n: "03",
    horizon: "Horizon 2400",
    title: "A second | dawn",
    img: dawn,
    alt: "A lone astronaut on a ridge above an alien ocean as a giant ringed planet rises at dawn",
    text: "Somewhere, around a quiet star, a world is waiting for footsteps. Erebus was the hardest place we could imagine going. Everywhere else is closer now.",
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
          <Kicker>Chapter X — What Comes After</Kicker>
          <SplitText text="Every ending is | a *launch window.*" className="mt-6 font-serif text-[clamp(3rem,7.6vw,8rem)] leading-[0.9] tracking-[-0.015em]" />
        </div>
        <p data-reveal="up" style={dv({ "--d": "200ms" })} className="text-[16px] leading-[1.75] text-bone/60 md:col-span-4">
          What the crew of Meridian learned in the shadow of a black hole rewrote physics, medicine, and our sense of how long a human life can
          reach. These are the horizons it opened.
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
                <span>Nocturne · Vision series</span>
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
