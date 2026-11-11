import { useRef } from "react";
import engineImg from "../assets/img/engine.jpg";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { cn } from "../utils/cn";
import { CountUp, Kicker, SplitText, dv } from "../components/ui";

// positions mapped onto the telescope plate (21:10 crop of a 16:9 frame)
const NOTES = [
  { x: "60%", y: "21%", label: "Three-Mirror Anastigmat", value: "20 cm aperture · f/3.0 optics", side: "right", c: "#6ce5ff" },
  { x: "33%", y: "62%", label: "Cryogenic V-Groove Shield", value: "< 80 Kelvin passive cooling", side: "left", c: "#9b7bff" },
  { x: "72%", y: "47%", label: "Linear Variable Filter Arrays", value: "6 Arrays · 2048×2048 pixels each", side: "right", c: "#ff8a3d" },
];

const SPECS = [
  { to: 102, d: 0, suf: " Bands", label: "Continuous Spectral Channels (0.75 – 5.0 µm)" },
  { to: 80, d: 0, suf: " K", label: "Cryogenic Detector Temperature" },
  { to: 20, d: 0, suf: " cm", label: "Telescope Primary Aperture" },
];

/** Scene 4 — Cinematic feature spotlight in a luminous, rotating mesh border */
export default function Spotlight() {
  const ref = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useScrollProgress(
    ref,
    (p) => {
      if (imgRef.current) imgRef.current.style.transform = `scale(${(1.22 - 0.22 * p).toFixed(4)})`;
    },
    "through"
  );

  return (
    <section id="optics" ref={ref} className="relative overflow-hidden py-28 md:py-44">
      <div aria-hidden="true" className="mesh pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="grid-lines pointer-events-none absolute inset-0 opacity-70" />

      <div className="shell relative">
        <div className="mx-auto max-w-4xl text-center">
          <Kicker center>Instrumentation & Payload — The SPHEREx Optical Assembly</Kicker>
          <SplitText
            text="Cryogenic Optics, | a *Lens for the Void.*"
            emClass="em-ion"
            className="mt-7 font-serif text-[clamp(3rem,8.4vw,8.8rem)] leading-[0.9] tracking-[-0.015em]"
          />
          <p data-reveal="up" style={dv({ "--d": "250ms" })} className="mx-auto mt-8 max-w-xl text-[16px] leading-[1.75] text-bone/60 md:text-[17px]">
            At the heart of the SPHEREx spacecraft is a 20-centimeter aluminum three-mirror anastigmat telescope. Cooled passively below 80 Kelvin by conical thermal radiation shields, it feeds six Linear Variable Filter (LVF) detector arrays without requiring moving parts.
          </p>
        </div>

        <div data-reveal="scale" className="relative mt-16 md:mt-24">
          <div aria-hidden="true" className="spot-glow absolute -inset-6 rounded-[80px] md:-inset-16" />
          <div className="glow-frame rounded-[26px] md:rounded-[36px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[25px] bg-black sm:aspect-[16/10] md:rounded-[34.5px] lg:aspect-[21/10]">
              <img
                ref={imgRef}
                src={engineImg}
                alt="SPHEREx telescope optical assembly: three-mirror anastigmat telescope with cryogenic thermal shield"
                className="absolute inset-0 h-full w-full object-cover will-change-transform"
                style={{ transform: "scale(1.2)" }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.75)_100%)]" />
              <div className="scanlines absolute inset-0 opacity-50" />

              {NOTES.map((n, i) => (
                <div key={n.label} className="absolute hidden lg:block" style={{ left: n.x, top: n.y }}>
                  <div data-reveal="fade" style={dv({ "--d": `${600 + i * 200}ms` })}>
                    <div className="pulse-dot -translate-x-1/2 -translate-y-1/2" style={dv({ "--c": n.c })} />
                    <div className={cn("absolute top-0 flex -translate-y-1/2 items-center gap-3", n.side === "right" ? "left-3" : "right-3 flex-row-reverse")}>
                      <span className="h-px w-12 bg-white/40" />
                      <div className="whitespace-nowrap rounded-xl border border-white/15 bg-black/45 px-3.5 py-2 backdrop-blur-md">
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-bone/55">{n.label}</p>
                        <p className="mt-0.5 text-sm text-bone">{n.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/65 md:bottom-7 md:left-8">
                Fig. 04 — SPHEREx Focal Plane Array & Optical Bench
              </div>
              <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/80 backdrop-blur-md md:right-8 md:top-7">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ion" />
                Detector Status: Active
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:mt-20 md:grid-cols-3">
          {SPECS.map((s, i) => (
            <div key={s.label} data-reveal="fade" style={dv({ "--d": `${i * 120}ms` })} className="bg-ink p-7 md:p-9">
              <p className="font-serif text-5xl tabular-nums md:text-6xl">
                <CountUp to={s.to} decimals={s.d} suffix={s.suf} />
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/45">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
