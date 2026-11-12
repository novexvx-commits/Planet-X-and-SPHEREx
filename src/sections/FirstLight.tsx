import { useRef } from "react";
import firstLight from "../assets/img/firstlight.jpg";
import { band, smoothstep } from "../lib/engine";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { CountUp, dv } from "../components/ui";

const STATS = [
  { to: 102, d: 0, suf: " Channels", label: "Nominal Spectral Channels (0.75–5.0 µm)", group: true },
  { to: 6, d: 0, suf: " Arrays", label: "Instrument Detector Bands (D1–D6)", group: true },
  { to: 20, d: 0, suf: " cm", label: "Telescope Aperture (3.5° × 11.3° FOV)", group: true },
  { to: 4, d: 0, suf: " Maps", label: "Planned Full-Sky Maps (6-mo Cadence)", group: false },
];

/** Scene 6 — Wide-angle milestone: a pinned, letterboxed panorama that "opens its eye" */
export default function FirstLight() {
  const pinRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const slitRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);

  useScrollProgress(
    pinRef,
    (p) => {
      // beats: eye opens + lock (0–.3) → headline (.3–.54) → clean breath, bars open (.55–.72) → prose (.74–1)
      const o1 = smoothstep(0.0, 0.28, p);
      const o2 = smoothstep(0.55, 0.72, p);
      const bar = Math.max(0, 1 - o1 * 0.76 - o2 * 0.24);
      if (topRef.current) topRef.current.style.transform = `scaleY(${bar.toFixed(4)})`;
      if (botRef.current) botRef.current.style.transform = `scaleY(${bar.toFixed(4)})`;
      if (slitRef.current) slitRef.current.style.opacity = (1 - smoothstep(0.03, 0.16, p)).toFixed(3);
      if (imgRef.current) imgRef.current.style.transform = `scale(${(1.36 - 0.36 * smoothstep(0, 1, p)).toFixed(4)})`;

      const h = band(p, 0.3, 0.38, 0.46, 0.54);
      if (headRef.current) {
        headRef.current.style.opacity = h.toFixed(3);
        headRef.current.style.transform = `translate3d(0, ${((1 - h) * (p < 0.42 ? 40 : -40)).toFixed(1)}px, 0)`;
      }
      const pr = smoothstep(0.74, 0.86, p);
      if (proseRef.current) {
        proseRef.current.style.opacity = pr.toFixed(3);
        proseRef.current.style.transform = `translate3d(0, ${((1 - pr) * 40).toFixed(1)}px, 0)`;
      }
      if (shadeRef.current) shadeRef.current.style.opacity = (0.1 + Math.max(0.38 * h, 0.52 * pr)).toFixed(3);
      if (hudRef.current) hudRef.current.style.opacity = (smoothstep(0.12, 0.28, p) * (1 - 0.5 * pr)).toFixed(3);
      if (crossRef.current) crossRef.current.style.opacity = (smoothstep(0.1, 0.2, p) * (1 - smoothstep(0.26, 0.32, p))).toFixed(3);
      if (frameRef.current) frameRef.current.textContent = String(Math.floor(1 + p * 4119)).padStart(5, "0");
    },
    "pin"
  );

  return (
    <section id="first-light" className="relative bg-black">
      <div ref={pinRef} className="relative h-[320vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* cinematic band on portrait screens, full-bleed on landscape */}
          <div className="absolute inset-x-0 top-1/2 h-[min(80vw,70vh)] -translate-y-1/2 overflow-hidden landscape:inset-0 landscape:h-full landscape:translate-y-0">
            <img
              ref={imgRef}
              src={firstLight}
              alt="NASA SPHEREx all-sky near-infrared survey showing stellar fields, interstellar dust, and cosmic background light"
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{ transform: "scale(1.36)", transformOrigin: "50% 42.5%" }}
            />
          </div>
          <div ref={shadeRef} className="absolute inset-0 bg-black" style={{ opacity: 0.12 }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.7)_100%)]" />

          {/* crosshair */}
          <div ref={crossRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0">
            <div className="absolute left-1/2 top-[calc(50%_-_6vw)] h-0 w-0 landscape:top-[42.5%]">
              <div className="absolute left-0 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
              <div className="absolute left-0 top-0 h-px w-48 -translate-x-1/2 bg-linear-to-r from-transparent via-white/45 to-transparent" />
              <div className="absolute left-0 top-0 h-48 w-px -translate-y-1/2 bg-linear-to-b from-transparent via-white/45 to-transparent" />
              <span className="absolute left-0 top-16 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.24em] text-white/70">SPHEREx · Focal Lock</span>
            </div>
          </div>

          {/* HUD */}
          <div ref={hudRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[14%] top-[14%] opacity-0">
            <div className="shell flex h-full flex-col justify-between py-4 font-mono text-[10px] uppercase leading-5 tracking-[0.18em] text-bone/60">
              <div className="flex justify-between">
                <div>
                  <div className="text-bone/85">SPHEREx · Detector Array D1–D6</div>
                  <div>
                    Frame <span ref={frameRef} className="tabular-nums">00001</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-bone/85">NASA/IPAC IRSA QR2</div>
                  <div>All-Sky Release</div>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="hidden sm:block">λ 0.75 – 5.00 µm · R = 35–130 (D1–D6)</div>
                <div className="text-right sm:ml-auto">FOV 3.5° × 11.3° · 20 cm Aperture</div>
              </div>
            </div>
          </div>

          {/* Headline */}
          <div ref={headRef} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0">
            <p className="kicker flex items-center gap-3 text-ember-soft">
              <span className="h-px w-8 bg-current" />
              First Light — SPHEREx All-Sky Spectroscopy
              <span className="h-px w-8 bg-current" />
            </p>
            <h2 className="text-glow mt-7 font-serif text-[clamp(3rem,9vw,9.6rem)] leading-[0.88] tracking-[-0.015em]">
              The entire universe
              <br />
              in <em className="em">102 colors.</em>
            </h2>
          </div>

          {/* Prose */}
          <div ref={proseRef} className="pointer-events-none absolute inset-x-0 bottom-[10%] opacity-0 md:bottom-[13%]">
            <div className="shell grid gap-8 md:grid-cols-12">
              <div className="md:col-span-6 lg:col-span-5">
                <p className="kicker text-ember-soft">NASA SPHEREx Mission · All-Sky Spectroscopy</p>
                <p className="mt-5 font-serif text-[clamp(1.9rem,3.6vw,3.3rem)] leading-[1.02]">
                  Every point in the sky mapped in continuous near-infrared spectra.
                </p>
              </div>
              <div className="md:col-span-5 md:col-start-8 md:self-end">
                <p className="text-[15px] leading-[1.75] text-bone/75 md:text-base">
                  SPHEREx captures what human vision and broadband surveys miss. From the diffuse glow of the cosmic dawn to the molecular fingerprint of water ice in nascent planetary systems, the infrared sky is unveiled with full archival calibration.
                </p>
              </div>
            </div>
          </div>

          {/* Letterbox */}
          <div ref={topRef} className="absolute inset-x-0 top-0 h-1/2 origin-top bg-black" />
          <div ref={botRef} className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-black" />
          <div
            ref={slitRef}
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-ember-soft to-transparent shadow-[0_0_24px_2px_rgba(255,138,61,0.6)]"
          />
        </div>
      </div>

      <div className="relative border-y border-white/[0.07] bg-ink">
        <div className="shell grid grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              data-reveal="fade"
              style={dv({ "--d": `${i * 110}ms` })}
              className="border-white/[0.07] py-10 pr-4 odd:border-r md:border-r md:py-14 md:pl-8 md:first:pl-0 md:last:border-r-0 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:pl-5 md:[&:nth-child(even)]:pl-8"
            >
              <p className="font-serif text-5xl tabular-nums md:text-6xl">
                <CountUp to={s.to} decimals={s.d} suffix={s.suf} group={s.group} />
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/45">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
