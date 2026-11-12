import { useEffect, useRef } from "react";
import { band, clamp, isCoarse, scrollToTarget, smoothstep, subscribe } from "../lib/engine";
import { useRouter } from "../lib/router";
import { cn } from "../utils/cn";
import { Arrow, Magnetic, dv } from "../components/ui";

const TAU = Math.PI * 2;
const STAR_RGB = ["255,255,255", "186,214,255", "255,216,176"];
const STAR_A = [1, 0.8, 0.5, 0.26];
const STAR_W = [2.2, 1.6, 1.15, 0.85];
const DISK_RGB = ["255,247,234", "255,214,158", "255,164,92", "255,110,60", "205,70,48"];
const R_IN = 1.55;
const R_OUT = 6.4;

/**
 * Scene 1 — "Descent"
 * A fully procedural, scroll-scrubbed canvas film:
 *   0.00 → 0.20  drifting starfield, title pushes through camera
 *   0.10 → 0.60  warp streaks; celestial sphere emerges with Einstein-ring lensing of background stars
 *   0.60 → 0.92  accretion disk swells, lensed halo arcs over the shadow
 *   0.92 → 1.00  the shadow swallows the frame — darkness, final line
 */
export default function Hero({ ready }: { ready: boolean }) {
  const { isExperience, navigate } = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nebulaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const cRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const velRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const small = isCoarse() || window.innerWidth < 768;
    const NS = small ? 720 : 1500;
    const NP = small ? 1100 : 2400;

    // ── star field (normalised 3D positions)
    const sx = new Float32Array(NS);
    const sy = new Float32Array(NS);
    const sz = new Float32Array(NS);
    const sc = new Uint8Array(NS);
    for (let i = 0; i < NS; i++) {
      sx[i] = Math.random() * 2 - 1;
      sy[i] = Math.random() * 2 - 1;
      sz[i] = Math.random();
      const r = Math.random();
      sc[i] = r < 0.68 ? 0 : r < 0.86 ? 1 : 2;
    }

    // ── accretion disk particles (radius in shadow radii, Keplerian angular speed)
    const pr = new Float32Array(NP);
    const pa = new Float32Array(NP);
    const pw = new Float32Array(NP);
    const pc = new Uint8Array(NP);
    for (let i = 0; i < NP; i++) {
      const u = Math.pow(Math.random(), 1.7);
      const r = R_IN + u * (R_OUT - R_IN);
      pr[i] = r;
      pa[i] = Math.random() * TAU;
      pw[i] = 1.7 / Math.pow(r, 1.5);
      const k = (r - R_IN) / (R_OUT - R_IN);
      pc[i] = Math.min(4, Math.floor(k * 4.3 + Math.random() * 0.7));
    }

    const starPaths: Path2D[] = new Array(12);
    const backPaths: Path2D[] = new Array(10);
    const frontPaths: Path2D[] = new Array(10);
    const haloTop: Path2D[] = new Array(5);
    const haloBot: Path2D[] = new Array(5);

    let W = 1;
    let H = 1;
    let S = 1;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      // pixel budget keeps the simulation at 60fps on 4K / high-DPR displays
      const budget = small ? 1.6e6 : 4.2e6;
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75, Math.sqrt(budget / Math.max(1, r.width * r.height)));
      dpr = Math.max(0.75, dpr);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W;
      canvas.height = H;
      S = Math.min(W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let target = 0;
    let prog = 0;
    let last = 0;
    let vel = 0;
    let tmx = 0;
    let tmy = 0;
    let mx = 0;
    let my = 0;
    let raf = 0;
    let visible = true;
    let lastOv = -1;

    const unsub = subscribe(({ vh }) => {
      const r = section.getBoundingClientRect();
      target = clamp(-r.top / Math.max(1, r.height - vh));
    });
    const onMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const draw = (t: number, p: number, v: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);

      const cx = W * 0.5 - mx * 16 * dpr;
      const cy = H * 0.5 - my * 12 * dpr;
      const bh = clamp((p - 0.08) / 0.92);
      const R = S * 0.0065 * Math.pow(190, Math.pow(bh, 1.3));
      const bhA = smoothstep(0, 0.12, bh);
      const E = R * 2.5;
      const E2 = E * E * bhA;

      // ── stars with warp streaks + point-lens deflection
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      const camZ = 3.4 * smoothstep(0, 1, p) + t * 0.0055;
      const streak = Math.min(0.26, 0.0022 + Math.abs(v) * 24);
      // per-axis projection: the far plane maps exactly onto the frame on any aspect ratio
      const fx = W * 0.5;
      const fy = H * 0.5;
      const starFade = 1 - smoothstep(0.8, 0.94, p);
      if (starFade > 0.001) {
        for (let k = 0; k < 12; k++) starPaths[k] = new Path2D();
        for (let i = 0; i < NS; i++) {
          let z = sz[i] - camZ;
          z -= Math.floor(z);
          if (z < 0.008) continue;
          const near = 1 - z;
          const ox = cx - mx * 46 * dpr * near;
          const oy = cy - my * 32 * dpr * near;
          const z0 = z + streak;
          let x1 = ox + (sx[i] / z) * fx;
          let y1 = oy + (sy[i] / z) * fy;
          let x0 = ox + (sx[i] / z0) * fx;
          let y0 = oy + (sy[i] / z0) * fy;
          if (E2 > 0) {
            let dx = x1 - cx;
            let dy = y1 - cy;
            let r2 = dx * dx + dy * dy;
            let r = Math.sqrt(r2) + 0.001;
            let f = (r + Math.sqrt(r2 + 4 * E2)) / (2 * r);
            x1 = cx + dx * f;
            y1 = cy + dy * f;
            dx = x0 - cx;
            dy = y0 - cy;
            r2 = dx * dx + dy * dy;
            r = Math.sqrt(r2) + 0.001;
            f = (r + Math.sqrt(r2 + 4 * E2)) / (2 * r);
            x0 = cx + dx * f;
            y0 = cy + dy * f;
          }
          if (x1 < -30 || x1 > W + 30 || y1 < -30 || y1 > H + 30) continue;
          const b = z < 0.2 ? 0 : z < 0.42 ? 1 : z < 0.7 ? 2 : 3;
          const path = starPaths[sc[i] * 4 + b];
          path.moveTo(x0, y0);
          path.lineTo(x1 + 0.01, y1 + 0.01);
        }
        for (let c = 0; c < 3; c++) {
          for (let b = 0; b < 4; b++) {
            ctx.strokeStyle = `rgba(${STAR_RGB[c]},${(STAR_A[b] * starFade).toFixed(3)})`;
            ctx.lineWidth = STAR_W[b] * dpr;
            ctx.stroke(starPaths[c * 4 + b]);
          }
        }
      }

      if (bhA < 0.002) return;

      // ── Core Horizon Accretion & Lensing
      const A = bhA * (1 - smoothstep(0.82, 0.93, bh));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.18 + p * 0.14);
      const tilt = 0.16 + 0.1 * smoothstep(0.3, 0.95, bh);
      const spin = t * 0.2 + p * 11;
      const blur = 0.06 + Math.min(0.45, Math.abs(v) * 40) + 0.2 * smoothstep(0.7, 0.95, bh);

      const halfDisk = (front: boolean) => {
        ctx.save();
        ctx.scale(1, tilt);
        const dg = ctx.createRadialGradient(0, 0, R * R_IN * 0.9, 0, 0, R * R_OUT);
        dg.addColorStop(0, `rgba(255,232,196,${(0.5 * A).toFixed(3)})`);
        dg.addColorStop(0.14, `rgba(255,168,92,${(0.28 * A).toFixed(3)})`);
        dg.addColorStop(0.5, `rgba(226,85,46,${(0.1 * A).toFixed(3)})`);
        dg.addColorStop(1, "rgba(120,30,20,0)");
        ctx.fillStyle = dg;
        ctx.beginPath();
        if (front) {
          ctx.arc(0, 0, R * R_OUT, 0, Math.PI);
          ctx.arc(0, 0, R * R_IN * 0.9, Math.PI, 0, true);
        } else {
          ctx.arc(0, 0, R * R_OUT, Math.PI, TAU);
          ctx.arc(0, 0, R * R_IN * 0.9, TAU, Math.PI, true);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      const strokeDisk = (paths: Path2D[]) => {
        for (let k = 0; k < 10; k++) {
          const c = k >> 1;
          const hi = k & 1;
          ctx.strokeStyle = `rgba(${DISK_RGB[c]},${((hi ? 0.95 : 0.45) * A).toFixed(3)})`;
          ctx.lineWidth = (c < 2 ? 1.6 : 1.2) * dpr;
          ctx.stroke(paths[k]);
        }
      };

      if (A > 0.002) {
        // ambient glow
        const gR = R * 11;
        const g = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, gR);
        g.addColorStop(0, `rgba(255,176,110,${(0.32 * A).toFixed(3)})`);
        g.addColorStop(0.16, `rgba(255,118,60,${(0.12 * A).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(130,70,200,${(0.05 * A).toFixed(3)})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-gR, -gR, gR * 2, gR * 2);

        // build disk + lensed halo geometry
        for (let k = 0; k < 10; k++) {
          backPaths[k] = new Path2D();
          frontPaths[k] = new Path2D();
        }
        for (let k = 0; k < 5; k++) {
          haloTop[k] = new Path2D();
          haloBot[k] = new Path2D();
        }
        for (let i = 0; i < NP; i++) {
          const r = pr[i];
          const w = pw[i];
          const th = pa[i] + w * spin;
          const th0 = th - w * blur * 4;
          const c1 = Math.cos(th);
          const s1 = Math.sin(th);
          const c0 = Math.cos(th0);
          const s0 = Math.sin(th0);
          const rr = r * R;
          const k = pc[i] * 2 + (c1 > 0.15 ? 1 : 0); // doppler beaming: approaching side brighter
          const front = s1 > 0;
          const path = front ? frontPaths[k] : backPaths[k];
          path.moveTo(c0 * rr, s0 * rr * tilt);
          path.lineTo(c1 * rr, s1 * rr * tilt);
          if (!front) {
            const rho = R * (1.07 + (r - R_IN) * 0.095);
            haloTop[pc[i]].moveTo(c0 * rho, s0 * rho);
            haloTop[pc[i]].lineTo(c1 * rho, s1 * rho);
          } else if (r < 3.6) {
            const rho = R * (1.035 + (r - R_IN) * 0.03);
            haloBot[pc[i]].moveTo(c0 * rho, s0 * rho);
            haloBot[pc[i]].lineTo(c1 * rho, s1 * rho);
          }
        }
        halfDisk(false);
        strokeDisk(backPaths);
      }

      // event-horizon shadow
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fill();

      if (A > 0.002) {
        ctx.globalCompositeOperation = "lighter";
        // photon ring
        ctx.lineWidth = Math.max(3 * dpr, R * 0.09);
        ctx.strokeStyle = `rgba(255,150,80,${(0.1 * A).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.05, 0, TAU);
        ctx.stroke();
        const lg = ctx.createLinearGradient(-R, 0, R, 0);
        lg.addColorStop(0, `rgba(255,170,100,${(0.45 * A).toFixed(3)})`);
        lg.addColorStop(1, `rgba(255,248,236,${A.toFixed(3)})`);
        ctx.strokeStyle = lg;
        ctx.lineWidth = Math.max(1.1 * dpr, R * 0.02);
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.012, 0, TAU);
        ctx.stroke();
        // gravitationally lensed far side of the disk
        for (let c = 0; c < 5; c++) {
          ctx.lineWidth = (c < 2 ? 1.4 : 1.1) * dpr;
          ctx.strokeStyle = `rgba(${DISK_RGB[c]},${(0.6 * A).toFixed(3)})`;
          ctx.stroke(haloTop[c]);
          ctx.strokeStyle = `rgba(${DISK_RGB[c]},${(0.3 * A).toFixed(3)})`;
          ctx.stroke(haloBot[c]);
        }
        halfDisk(true);
        strokeDisk(frontPaths);
      }
      ctx.restore();
    };

    const setLayer = (el: HTMLElement | null, o: number, y: number) => {
      if (!el) return;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      el.style.visibility = o < 0.004 ? "hidden" : "visible";
    };

    const overlays = (p: number) => {
      const title = titleRef.current;
      if (title) {
        const o = 1 - smoothstep(0.015, 0.14, p);
        title.style.opacity = o.toFixed(3);
        title.style.transform = `translate3d(0, ${(-p * 160).toFixed(1)}px, 0) scale(${(1 + p * 0.85).toFixed(4)})`;
        title.style.visibility = o < 0.004 ? "hidden" : "visible";
      }
      if (cueRef.current) cueRef.current.style.opacity = (1 - smoothstep(0, 0.035, p)).toFixed(3);
      const a = band(p, 0.17, 0.24, 0.37, 0.44);
      setLayer(aRef.current, a, (1 - a) * (p < 0.3 ? 40 : -40));
      const b = band(p, 0.49, 0.56, 0.69, 0.76);
      setLayer(bRef.current, b, (1 - b) * (p < 0.62 ? 40 : -40));
      const c = smoothstep(0.9, 0.96, p);
      setLayer(cRef.current, c, (1 - c) * 30);
      if (hudRef.current) hudRef.current.style.opacity = (1 - smoothstep(0.84, 0.92, p)).toFixed(3);
      if (nebulaRef.current) {
        nebulaRef.current.style.opacity = (1 - smoothstep(0.55, 0.9, p)).toFixed(3);
        nebulaRef.current.style.transform = `scale(${(1 + p * 0.6).toFixed(4)})`;
      }
      if (distRef.current) distRef.current.textContent = "3.5° × 11.3°";
      if (velRef.current) {
        const ch = Math.max(1, Math.min(102, Math.round(1 + p * 101)));
        velRef.current.textContent = `D1–D6 · Ch ${ch}/102`;
      }
      if (clockRef.current) {
        const wl = (0.75 + p * 4.25).toFixed(2);
        clockRef.current.textContent = `${wl} µm · QR2`;
      }
      if (markerRef.current) markerRef.current.style.top = `${(p * 100).toFixed(2)}%`;
    };

    const frame = (now: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
      prog += (target - prog) * 0.12;
      if (Math.abs(target - prog) < 1e-5) prog = target;
      const dp = prog - last;
      last = prog;
      vel += (dp - vel) * 0.18;
      mx += (tmx - mx) * 0.045;
      my += (tmy - my) * 0.045;
      draw(now / 1000, prog, vel);
      if (Math.abs(prog - lastOv) > 1e-4) {
        lastOv = prog;
        overlays(prog);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(section);
    overlays(0);
    raf = requestAnimationFrame(frame);

    return () => {
      visible = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      unsub();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section id="top" ref={sectionRef} className={cn("relative h-[440vh] md:h-[520vh]", ready && "is-ready")}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#020306]">
        <div
          ref={nebulaRef}
          aria-hidden="true"
          className="absolute inset-[-10%] will-change-transform"
          style={{
            background:
              "radial-gradient(55% 45% at 72% 28%, rgba(107,70,255,0.22), transparent 70%), radial-gradient(45% 40% at 22% 72%, rgba(42,169,214,0.15), transparent 70%), radial-gradient(30% 30% at 50% 50%, rgba(255,138,61,0.10), transparent 70%)",
          }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="NASA SPHEREx all-sky cosmic infrared simulation" role="img" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_50%,transparent_52%,rgba(2,3,6,0.85)_100%)]" />

        {/* HUD */}
        <div className="hero-fade pointer-events-none absolute inset-0" style={dv({ "--d": "1100ms" })} aria-hidden="true">
          <div ref={hudRef} className="absolute inset-0">
            <span className="hud-corner left-5 top-24 border-l border-t md:left-8 md:top-28" />
            <span className="hud-corner right-5 top-24 border-r border-t md:right-8 md:top-28" />
            <span className="hud-corner bottom-5 left-5 border-b border-l md:bottom-8 md:left-8" />
            <span className="hud-corner bottom-5 right-5 border-b border-r md:bottom-8 md:right-8" />

            <div className="absolute left-8 top-1/2 hidden h-[38vh] -translate-y-1/2 md:block lg:left-12">
              <span className="absolute -top-7 left-0 font-mono text-[9px] tracking-[0.2em] text-bone/40">2025</span>
              <div className="relative h-full w-px bg-white/15">
                {Array.from({ length: 11 }).map((_, i) => (
                  <span key={i} className="absolute -left-[3px] h-px w-[7px] bg-white/30" style={{ top: `${i * 10}%` }} />
                ))}
                <div ref={markerRef} className="absolute -left-[3.5px] -mt-[4px] h-2 w-2 rounded-full bg-ember shadow-[0_0_14px_#ff8a3d]" style={{ top: 0 }} />
              </div>
              <span className="absolute -bottom-7 left-0 font-mono text-[9px] tracking-[0.2em] text-bone/40">2027</span>
            </div>

            <div className="absolute bottom-9 left-9 hidden font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-bone/45 sm:block md:bottom-12 md:left-14">
              <div className="flex items-center gap-2 text-bone/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                Active · SPHEREx All-Sky Survey
              </div>
              <div>102 Spectral Channels · 0.75 – 5.00 µm</div>
              <div>Sun-Synchronous Low Earth Orbit · 700 km</div>
            </div>

            <div className="absolute bottom-9 right-9 hidden text-right font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-bone/45 sm:block md:bottom-12 md:right-14">
              <div>
                Array <span ref={velRef} className="tabular-nums text-bone/85">D1–D6</span>
              </div>
              <div>
                FOV <span ref={distRef} className="tabular-nums text-bone/85">3.5° × 11.3°</span>
              </div>
              <div>
                <span ref={clockRef} className="tabular-nums text-bone/85">QR2 Release</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div ref={titleRef} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 pb-8 pt-10 text-center will-change-transform">
          <p className="hero-fade kicker text-bone/60" style={dv({ "--d": "250ms" })}>
            NASA SPHEREx Mission · 2026 Space Apps Challenge
          </p>
          <h1 className="mt-5 font-serif text-[clamp(3rem,8.6vw,9.4rem)] leading-[0.88] tracking-[-0.02em]">
            <span className="hero-line">
              <span style={{ transitionDelay: "200ms" }}>The Infrared</span>
            </span>
            <span className="hero-line">
              <span className="em" style={{ transitionDelay: "340ms" }}>
                Universe in Motion
              </span>
            </span>
          </h1>
          <p className="hero-fade mt-6 max-w-md text-[15px] leading-relaxed text-bone/70 md:text-base" style={dv({ "--d": "900ms" })}>
            MARSAD is an interactive scientific observatory exploring NASA SPHEREx’s all-sky time-domain infrared spectroscopy.
          </p>

          <div className="hero-fade pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-4" style={dv({ "--d": "1050ms" })}>
            <Magnetic strength={0.38}>
              <span className="relative inline-block">
                <span className="cta-halo" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => navigate("/experience")}
                  className="cta cursor-pointer"
                  aria-label="Try MARSAD"
                >
                  <span>Try MARSAD — Launch Experience</span>
                  <span className="cta-icon">
                    <Arrow className="h-5 w-5" />
                  </span>
                </button>
              </span>
            </Magnetic>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="hero-fade pointer-events-none absolute inset-x-0 bottom-8 flex justify-center md:bottom-10" style={dv({ "--d": "1300ms" })}>
          <div ref={cueRef} className="flex flex-col items-center gap-4">
            <span className="kicker text-bone/50">Scroll to explore the cosmic survey</span>
            <span className="scroll-line" />
          </div>
        </div>

        {/* Beat A */}
        <div ref={aRef} className="pointer-events-none absolute inset-x-0 bottom-[15vh] opacity-0" style={{ visibility: "hidden" }}>
          <div className="shell">
            <div className="max-w-xl text-glow md:pl-10">
              <p className="kicker flex items-center gap-3 text-ember-soft">
                <span className="h-px w-10 bg-current" />
                Time-Domain Survey
              </p>
              <p className="mt-5 font-serif text-[clamp(2.2rem,5vw,4.6rem)] leading-[0.96]">
                Mapping the sky in <em className="em">102 infrared colors</em> every six months.
              </p>
              <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bone/55">6 Linear Variable Filters · Resolving Power R = 35–130 · 6.2"/pixel</p>
            </div>
          </div>
        </div>

        {/* Beat B */}
        <div ref={bRef} className="pointer-events-none absolute inset-x-0 top-[20vh] opacity-0" style={{ visibility: "hidden" }}>
          <div className="shell flex justify-end">
            <div className="max-w-lg text-right text-glow md:pr-10 xl:pr-40">
              <p className="kicker flex items-center justify-end gap-3 text-ion">
                Unveiling Cosmic Phenomena
                <span className="h-px w-10 bg-current" />
              </p>
              <p className="mt-5 font-serif text-[clamp(2rem,4.4vw,4.1rem)] leading-[0.98]">
                From high-velocity proper motion stars to <em className="em-ion">cold brown dwarfs and interstellar water-ice clouds.</em>
              </p>
            </div>
          </div>
        </div>

        {/* Beat C — darkness */}
        <div ref={cRef} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0" style={{ visibility: "hidden" }}>
          <p className="kicker text-bone/45">Spectroscopy Beyond Human Vision · 0.75 – 5.00 µm</p>
          <p className="mt-7 max-w-5xl font-serif text-[clamp(2.6rem,7vw,7.2rem)] leading-[0.92]">The cosmos is not silent or still.</p>
          <p className="mt-6 font-serif text-2xl italic text-ember-soft md:text-3xl">It breathes, shifts, and glows in the dark.</p>
        </div>
      </div>
    </section>
  );
}
