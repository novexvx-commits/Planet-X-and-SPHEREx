import { useRef } from "react";
import prologueImg from "../assets/img/prologue.jpg";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { CountUp, Kicker, SplitText, dv } from "../components/ui";

const STATS = [
  { to: 108, decimals: 0, suffix: "", label: "Souls aboard Meridian" },
  { to: 9.6, decimals: 1, suffix: " ly", label: "Distance to Erebus" },
  { to: 71, decimals: 0, suffix: " yrs", label: "Earth-time in transit" },
  { to: 0.21, decimals: 2, suffix: "c", label: "Cruising velocity" },
];

/** Scene 2 — Asymmetric editorial split with delayed, staggered reveals */
export default function Prologue() {
  const ref = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useScrollProgress(
    ref,
    (p) => {
      if (imgRef.current) imgRef.current.style.transform = `translate3d(0, ${((0.5 - p) * 10).toFixed(2)}%, 0) scale(1.2)`;
    },
    "through"
  );

  return (
    <section id="prologue" ref={ref} className="relative overflow-hidden py-28 md:py-44">
      <div aria-hidden="true" className="pointer-events-none absolute -left-[22vw] top-[8%] h-[72vw] w-[72vw] rounded-full bg-[radial-gradient(circle,rgba(107,70,255,0.15),transparent_62%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[12vw] bottom-0 h-[52vw] w-[52vw] rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.08),transparent_60%)]" />

      <div className="shell relative grid grid-cols-12 gap-y-20 md:gap-x-10">
        {/* Framed visual */}
        <div className="col-span-12 md:col-span-5 md:pt-8">
          <div data-reveal="scale" className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[60px] bg-[radial-gradient(60%_55%_at_50%_45%,rgba(255,138,61,0.3),rgba(107,70,255,0.14)_55%,transparent_75%)] blur-2xl md:-inset-12"
            />
            <div className="glass relative rounded-[30px] p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-ink-2">
                <img
                  ref={imgRef}
                  src={prologueImg}
                  alt="An astronaut silhouetted against Meridian's observation viewport, gazing at a violet nebula and the distant ring of Erebus"
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  style={{ transform: "scale(1.2)" }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink/90 via-ink/5 to-ink/35" />
                <div className="absolute inset-x-5 top-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-bone/75">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                    Rec
                  </span>
                  <span>Deck 07 · Observation</span>
                </div>
                <div className="absolute inset-x-5 bottom-5 md:inset-x-6 md:bottom-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/50">Fig. 01</p>
                  <p className="mt-2 font-serif text-2xl italic leading-tight text-bone/95 md:text-[1.7rem]">“The first time I saw it, I forgot to breathe.”</p>
                  <p className="mt-2 text-xs text-bone/50">— Cmdr. Ilse Varga, ship’s log, 2244</p>
                </div>
              </div>
            </div>
            <div className="glass absolute -right-3 top-[30%] hidden rounded-2xl px-4 py-3 md:block lg:-right-10">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-bone/45">Signal delay home</p>
              <p className="mt-1 text-lg font-light tabular-nums">
                9.6 <span className="text-sm text-bone/50">years</span>
              </p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-12 flex flex-col justify-center md:col-span-6 md:col-start-7">
          <Kicker>Chapter I — The Calling</Kicker>
          <SplitText
            text="We were never meant | to stay *in the cradle.*"
            className="mt-6 font-serif text-[clamp(2.8rem,6.2vw,6.4rem)] leading-[0.92] tracking-[-0.01em]"
          />
          <div className="mt-10 max-w-xl space-y-6 text-[16px] leading-[1.75] text-bone/65 md:text-[17px]">
            <p data-reveal="up" style={dv({ "--d": "150ms" })}>
              For two hundred thousand years we looked up and wondered. Then, in 2142, a flicker in the light of distant stars betrayed something
              that should not exist so close to home: a black hole, silent and starless, drifting 9.6 light-years from the Sun.
            </p>
            <p data-reveal="up" style={dv({ "--d": "300ms" })}>
              We named it <span className="font-serif text-[1.15em] italic text-bone">Erebus</span>, after the primordial darkness of the Greeks.
              Within a single generation we had built a ship to meet it — and found one hundred and eight people willing to never come home.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08]">
            {STATS.map((s, i) => (
              <div key={s.label} data-reveal="fade" style={dv({ "--d": `${400 + i * 120}ms` })} className="bg-ink p-5 md:p-7">
                <p className="font-serif text-4xl tabular-nums md:text-5xl">
                  <CountUp to={s.to} decimals={s.decimals} suffix={s.suffix} />
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/45">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
