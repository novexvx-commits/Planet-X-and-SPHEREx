import { useEffect, useRef, useState, type FormEvent } from "react";
import { scrollToTarget } from "../lib/engine";
import { useRouter } from "../lib/router";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { NAV_LINKS } from "../components/Nav";
import { Arrow, Kicker, LogoMark, Magnetic, SplitText, dv } from "../components/ui";

function ManifestCTA() {
  const [state, setState] = useState<"idle" | "form" | "sent">("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hover = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; warm: boolean };
    const ps: P[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);

    const spawn = (force = 1) => {
      const b = btnRef.current;
      if (!b) return;
      const cr = c.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const a = Math.random() * Math.PI * 2;
      const cx = br.left - cr.left + br.width / 2;
      const cy = br.top - cr.top + br.height / 2;
      const sp = (0.35 + Math.random() * 1.25) * force;
      ps.push({
        x: cx + Math.cos(a) * (br.width / 2) * 0.96,
        y: cy + Math.sin(a) * (br.height / 2) * 0.96,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.7 - 0.25,
        life: 0,
        max: 45 + Math.random() * 55,
        s: 0.6 + Math.random() * 1.6,
        warm: Math.random() > 0.25,
      });
    };
    const tick = () => {
      if (hover.current) for (let k = 0; k < 3; k++) spawn();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 - 0.01;
        const t = p.life / p.max;
        if (t >= 1) {
          ps.splice(i, 1);
          continue;
        }
        const a = Math.sin(t * Math.PI) * 0.9;
        ctx.fillStyle = p.warm ? `rgba(255,${150 + ((i * 13) % 70)},80,${a.toFixed(3)})` : `rgba(255,240,220,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (hover.current || ps.length) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    startRef.current = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    burstRef.current = () => {
      for (let k = 0; k < 60; k++) spawn(2.6);
      startRef.current();
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(true);
      return;
    }
    setState("sent");
  };

  return (
    <div className="relative flex min-h-[96px] flex-col items-center justify-center">
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute -left-32 -top-24 h-[calc(100%_+_12rem)] w-[calc(100%_+_16rem)]" />

      {state === "idle" && (
        <Magnetic strength={0.38}>
          <span className="relative inline-block">
            <span className="cta-halo" aria-hidden="true" />
            <button
              ref={btnRef}
              type="button"
              className="cta"
              onPointerEnter={() => {
                hover.current = true;
                startRef.current();
              }}
              onPointerLeave={() => {
                hover.current = false;
              }}
              onClick={() => {
                hover.current = false;
                burstRef.current();
                window.setTimeout(() => setState("form"), 260);
              }}
            >
              <span>Join the MARSAD Research Circle</span>
              <span className="cta-icon">
                <Arrow className="h-5 w-5" />
              </span>
            </button>
          </span>
        </Magnetic>
      )}

      {state === "form" && (
        <div className="flex flex-col items-center">
          <form
            onSubmit={submit}
            noValidate
            className="flex w-[min(92vw,470px)] items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] p-1.5 pl-6 shadow-[0_20px_60px_-20px_rgba(255,138,61,0.45)] backdrop-blur-xl"
            style={{ animation: "fade-up .7s var(--ease-expo) both" }}
          >
            <label htmlFor="manifest-email" className="sr-only">
              Email address
            </label>
            <input
              id="manifest-email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="astronomer@observatory.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-bone outline-none placeholder:text-bone/35"
            />
            <button type="submit" className="rounded-full bg-bone px-5 py-3 text-sm font-medium text-ink transition-colors duration-300 hover:bg-ember-soft">
              Subscribe
            </button>
          </form>
          <p className="mt-4 h-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ember" aria-live="polite">
            {error ? "Please enter a valid email address." : ""}
          </p>
        </div>
      )}

      {state === "sent" && (
        <div className="flex flex-col items-center gap-3" role="status" style={{ animation: "fade-up .8s var(--ease-expo) both" }}>
          <span className="grid h-14 w-14 place-items-center rounded-full border border-ember/40 bg-ember/10 text-ember-soft shadow-[0_0_40px_-6px_rgba(255,138,61,0.6)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.2 4.2L19 7" />
            </svg>
          </span>
          <p className="font-serif text-3xl md:text-4xl">Registration confirmed.</p>
          <p className="text-sm text-bone/55">You will receive alerts for new SPHEREx data releases and transient detections.</p>
        </div>
      )}
    </div>
  );
}

function Footer() {
  const { isExperience, navigate } = useRouter();
  return (
    <footer className="relative z-10 pt-36 md:pt-48">
      <div className="shell grid gap-12 pb-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9" />
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.42em] text-bone font-bold block">MARSAD</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400/80 block mt-0.5">Detecting Moving Objects in Space</span>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-bone/50">
            Interactive Scientific Observatory for NASA SPHEREx. Developed for the 2026 NASA Space Apps Challenge, combining authentic IRSA data, slitless spectroscopy, and time-domain astronomical analysis.
          </p>
        </div>
        <nav className="grid grid-cols-2 content-start gap-x-8 gap-y-3 text-sm md:col-span-4" aria-label="Footer">
          {[{ href: "#prologue", label: "Mission Brief", n: "01" }, ...NAV_LINKS, { href: "#manifest", label: "Open Science", n: "11" }].map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget(l.href, { duration: 2.2 });
              }}
              className="group flex items-baseline gap-2 text-bone/60 transition-colors duration-300 hover:text-bone"
            >
              <span className="font-mono text-[9px] text-bone/30 transition-colors group-hover:text-ember">{l.n}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="md:col-span-3 md:text-right">
          <p className="font-mono text-[10px] uppercase leading-6 tracking-[0.2em] text-bone/40">
            NASA JPL · Caltech · IPAC IRSA
            <br />
            SPHEREx All-Sky Survey · 102 Near-IR Bands
            <br />
            Orbit: 700 km Sun-Synchronous Polar
          </p>
          <div className="mt-6 flex flex-col items-end gap-2">
            <Magnetic>
              <button type="button" onClick={() => scrollToTarget("#top", { duration: 3 })} className="btn-ghost">
                Back to the beginning
                <Arrow className="h-4 w-4" dir="up" />
              </button>
            </Magnetic>
            {isExperience && (
              <Magnetic>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-ghost text-ember-soft border-ember/30 hover:border-ember"
                >
                  <Arrow className="h-4 w-4" dir="left" />
                  Return to Homepage
                </button>
              </Magnetic>
            )}
          </div>
        </div>
      </div>
      <div className="shell flex flex-col gap-3 border-t border-white/[0.06] py-6 text-[11px] text-bone/35 md:flex-row md:items-center md:justify-between">
        <span>© 2026 MARSAD · NASA Space Apps Challenge. Powered by NASA/IPAC IRSA, CDS Strasbourg & ESA Gaia archives.</span>
        <span className="font-mono uppercase tracking-[0.2em]">Open Science · All Data Authentic</span>
      </div>
      <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
        <p className="footer-word -mb-[0.16em] text-center font-serif text-[24vw] leading-[0.82] tracking-[-0.04em]">MARSAD</p>
      </div>
    </footer>
  );
}

/** Scene 11 — The grand finale: monumental type, manifesto, magnetic particle CTA, eclipse horizon */
export default function Finale() {
  const horizonRef = useRef<HTMLDivElement>(null);
  useScrollProgress(horizonRef, (p, el) => el.style.setProperty("--rise", p.toFixed(4)), "enter");

  return (
    <section id="manifest" className="relative overflow-hidden pt-36 md:pt-52">
      <div aria-hidden="true" className="finale-stars pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="finale-stars alt pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[12%] h-[60vw] w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,138,61,0.08),transparent_60%)]" />

      <div className="shell relative z-10 text-center">
        <Kicker center>Chapter XI — Open Science & The Sky</Kicker>
        <SplitText text="The infrared | is *unlocked.*" stagger={80} className="mt-8 font-serif text-[clamp(4rem,14.5vw,15.5rem)] leading-[0.8] tracking-[-0.03em]" />
        <p data-reveal="up" style={dv({ "--d": "250ms" })} className="mx-auto mt-12 max-w-2xl text-[17px] leading-[1.75] text-bone/70 md:text-xl md:leading-[1.7]">
          MARSAD was built to make NASA’s revolutionary all-sky spectroscopic dataset accessible to researchers, educators, and curious minds worldwide. Every six months, SPHEREx maps the entire cosmos across 102 colors of infrared light—revealing moving asteroids, variable stars, and the ancient glow of cosmic dawn. Explore the data, inspect the FITS images, and discover what changes across epochs.
        </p>
        <div data-reveal="up" style={dv({ "--d": "420ms" })} className="mt-14 flex flex-col items-center gap-7">
          <ManifestCTA />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone/40">NASA SPHEREx Quick Release 2 · 102 Bands · All-Sky Survey Cadence</p>
        </div>
      </div>

      <div ref={horizonRef} className="relative mt-24 md:mt-36">
        <div aria-hidden="true" className="eclipse-glow" />
        <div aria-hidden="true" className="eclipse" />
        <Footer />
      </div>
    </section>
  );
}
