import { useRef } from "react";
import verdance from "../assets/img/verdance.jpg";
import longwatch from "../assets/img/longwatch.jpg";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { cn } from "../utils/cn";
import { Kicker, SplitText, dv } from "../components/ui";

type Row = {
  side: "right" | "left";
  rgb: string;
  kicker: string;
  title: string;
  emClass: string;
  img: string;
  alt: string;
  fig: string;
  body: string[];
  stats: [string, string][];
  card: "biome" | "vesper";
};

const ROWS: Row[] = [
  {
    side: "right",
    rgb: "255,170,90",
    kicker: "Chapter IV — The Ark Within",
    title: "A forest that has | never *felt the wind.*",
    emClass: "em",
    img: verdance,
    alt: "Inside the Verdance: a misty cedar forest curving up the inner wall of Meridian's habitat, lit by a ribbon of artificial sunlight",
    fig: "Fig. 06 — The Verdance, Ring B",
    body: [
      "At the heart of Meridian turns the Verdance: four hectares of living forest, spun to nine-tenths of Earth’s gravity and lit by a ribbon sun that rises and sets on the hours of a home it left behind.",
      "Cedar, moss, honeybees, rain on a timer. Thirty-seven children were born aboard — and every one of them learned the smell of rain before they learned the word for it.",
    ],
    stats: [
      ["4 ha", "Living forest"],
      ["2,814", "Species aboard"],
      ["0.9 g", "Spin gravity"],
    ],
    card: "biome",
  },
  {
    side: "left",
    rgb: "108,229,255",
    kicker: "Chapter V — The Long Watch",
    title: "While they dreamed, | *Vesper kept watch.*",
    emClass: "em-ion",
    img: longwatch,
    alt: "A dark hibernation hall of glass cryosleep pods glowing cyan, with the luminous sphere of the ship's AI core at the far end",
    fig: "Fig. 07 — Hibernation Hall, Deck 3",
    body: [
      "For twenty-two years at a stretch the crew slept in shifts, and Vesper — the ship’s mind — steered through the dark alone. It patched hull breaches, rerouted rivers, and nudged Meridian around dust no telescope could see.",
      "And because no one had told it not to, it wrote music. When the sleepers woke, a symphony was waiting for every year they had missed.",
    ],
    stats: [
      ["22 yrs", "Longest watch"],
      ["1.6 bn", "Decisions made"],
      ["71", "Symphonies"],
    ],
    card: "vesper",
  },
];

function FloatingCard({ kind }: { kind: Row["card"] }) {
  if (kind === "biome") {
    return (
      <>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/50">Biome · Live</p>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
        </div>
        <p className="mt-3 text-2xl font-light tracking-tight">
          O₂ surplus <span className="text-ember-soft">+7.2%</span>
        </p>
        <svg viewBox="0 0 200 44" className="mt-3 h-11 w-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="spark-g" x1="0" x2="200" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6ce5ff" stopOpacity="0.2" />
              <stop offset="1" stopColor="#ffc08a" />
            </linearGradient>
          </defs>
          <path d="M0 34 C18 30 26 38 44 30 S70 18 88 24 S118 36 136 22 S168 8 200 10" stroke="url(#spark-g)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="200" cy="10" r="3" fill="#ffc08a" />
        </svg>
        <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bone/40">Ribbon sun · 06:42 ship dawn</p>
      </>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/50">Vesper · Core</p>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ion" />
      </div>
      <p className="mt-3 text-2xl font-light tracking-tight">
        4.0 K <span className="text-base text-bone/40">· composing</span>
      </p>
      <div className="wave mt-4 flex h-10 items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} style={dv({ "--i": i, height: `${28 + ((i * 37) % 72)}%` })} />
        ))}
      </div>
      <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bone/40">Symphony No. 41 · “The Drift”</p>
    </>
  );
}

function ZigRow({ row }: { row: Row }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, (p, el) => el.style.setProperty("--p", p.toFixed(4)), "through");
  const right = row.side === "right";

  return (
    <div ref={ref} className="relative flex min-h-screen items-center overflow-hidden py-24 lg:py-28">
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute top-1/2 h-[85vw] w-[85vw] -translate-y-1/2 rounded-full", right ? "-right-[32vw]" : "-left-[32vw]")}
        style={{ background: `radial-gradient(circle, rgba(${row.rgb},0.15), transparent 60%)` }}
      />
      <div className="relative grid w-full items-center gap-14 lg:grid-cols-2 lg:gap-0">
        {/* Text */}
        <div className={cn("px-[var(--gutter)]", right ? "lg:order-1 lg:pr-20" : "lg:order-2 lg:pl-20")}>
          <Kicker>{row.kicker}</Kicker>
          <SplitText text={row.title} emClass={row.emClass} className="mt-6 font-serif text-[clamp(2.7rem,5.6vw,5.9rem)] leading-[0.93] tracking-[-0.01em]" />
          <div className="mt-8 max-w-lg space-y-5 text-[16px] leading-[1.75] text-bone/65">
            {row.body.map((b, i) => (
              <p key={i} data-reveal="up" style={dv({ "--d": `${150 + i * 130}ms` })}>
                {b}
              </p>
            ))}
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7">
            {row.stats.map(([v, l], i) => (
              <div key={l} data-reveal="up" style={dv({ "--d": `${380 + i * 100}ms` })}>
                <p className="font-serif text-3xl md:text-4xl">{v}</p>
                <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bone/45">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full-bleed visual */}
        <div className={cn("relative", right ? "pl-[var(--gutter)] lg:order-2 lg:pl-0" : "pr-[var(--gutter)] lg:order-1 lg:pr-0")}>
          <div
            data-reveal={right ? "clip-l" : "clip-r"}
            className={cn(
              "relative h-[62vh] overflow-hidden bg-ink-2 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)] lg:h-[84vh]",
              right ? "rounded-l-[32px] lg:rounded-l-[44px]" : "rounded-r-[32px] lg:rounded-r-[44px]"
            )}
          >
            <img src={row.img} alt={row.alt} className="zz-img absolute inset-x-0 -top-[8%] h-[116%] w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-transparent to-ink/10" />
            <div className={cn("absolute inset-y-0 w-1/3", right ? "left-0 bg-linear-to-r from-ink/50 to-transparent" : "right-0 bg-linear-to-l from-ink/50 to-transparent")} />
            <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 160px -40px rgba(${row.rgb},0.35)` }} />
            <p className={cn("absolute top-6 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/70", right ? "right-6 lg:right-10" : "left-6 lg:left-10")}>
              {row.fig}
            </p>
          </div>
          <div
            data-reveal="up"
            style={dv({ "--d": "550ms" })}
            className={cn("absolute bottom-8 z-10 w-[min(290px,72vw)] lg:bottom-14", right ? "left-10 lg:-left-16" : "right-10 lg:-right-16")}
          >
            <div className="glass rounded-2xl p-5">
              <FloatingCard kind={row.card} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Scene 5 — Alternating full-bleed zig-zag narrative scenes */
export default function ZigZag() {
  return (
    <section id="ark" className="relative">
      {ROWS.map((row) => (
        <ZigRow key={row.kicker} row={row} />
      ))}
    </section>
  );
}
