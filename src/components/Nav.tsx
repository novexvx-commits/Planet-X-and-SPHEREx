import { useEffect, useRef, useState, type MouseEvent } from "react";
import { scrollToTarget, setScrollLocked, subscribe } from "../lib/engine";
import { cn } from "../utils/cn";
import { Arrow, LogoMark, Magnetic, dv } from "./ui";

export const NAV_LINKS = [
  { href: "#spacewalk", label: "Spacewalk", n: "02" },
  { href: "#voyage", label: "Voyage", n: "03" },
  { href: "#meridian", label: "Meridian", n: "04" },
  { href: "#log", label: "Mission Log", n: "07" },
  { href: "#telemetry", label: "Telemetry", n: "08" },
  { href: "#vision", label: "Vision", n: "10" },
];

export default function Nav({ ready }: { ready: boolean }) {
  const headerRef = useRef<HTMLElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const prevOpen = useRef(open);

  useEffect(() => {
    let lastY = window.scrollY;
    return subscribe(({ y, vh }) => {
      const h = headerRef.current;
      if (!h) return;
      const max = document.documentElement.scrollHeight - vh;
      if (progRef.current) progRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
      h.classList.toggle("is-scrolled", y > 30);
      const dy = y - lastY;
      if (Math.abs(dy) > 6) {
        h.classList.toggle("is-hidden", dy > 0 && y > vh * 0.8);
        lastY = y;
      }
    });
  }, []);

  useEffect(() => {
    if (prevOpen.current !== open) {
      prevOpen.current = open;
      setScrollLocked(open);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (e: MouseEvent, href: string) => {
    e.preventDefault();
    const wasOpen = open;
    setOpen(false);
    window.setTimeout(() => scrollToTarget(href, { duration: 2 }), wasOpen ? 420 : 0);
  };

  return (
    <>
      <header ref={headerRef} className={cn("site-header fixed inset-x-0 top-0 z-50", ready && "is-ready", open && "menu-open")}>
        <div className="nav-bg absolute inset-0" />
        <div className="shell relative flex h-[72px] items-center justify-between md:h-20">
          <a href="#top" onClick={(e) => go(e, "#top")} className="flex items-center gap-3" aria-label="Nocturne — back to the beginning">
            <LogoMark className="h-7 w-7" />
            <span className="font-mono text-[11px] uppercase tracking-[0.42em]">Nocturne</span>
          </a>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => go(e, l.href)}
                className="group relative text-[13px] text-bone/70 transition-colors duration-300 hover:text-bone"
              >
                <span className="mr-1.5 align-top font-mono text-[9px] text-ember/80">{l.n}</span>
                {l.label}
                <span className="ease-expo absolute -bottom-1.5 left-0 h-px w-full origin-right scale-x-0 bg-current transition-transform duration-500 group-hover:origin-left group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Magnetic className="hidden sm:inline-block">
              <a href="#manifest" onClick={(e) => go(e, "#manifest")} className="btn-ghost">
                <span className="h-1.5 w-1.5 rounded-full bg-ember shadow-[0_0_10px_#ff8a3d]" />
                Join the Manifest
              </a>
            </Magnetic>
            <button
              type="button"
              className="burger lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-white/[0.03]">
          <div ref={progRef} className="h-full w-full origin-left bg-linear-to-r from-ion via-nebula to-ember" style={{ transform: "scaleX(0)" }} />
        </div>
      </header>

      <div id="mobile-menu" className={cn("mobile-menu fixed inset-0 z-40 lg:hidden", open && "is-open")} aria-hidden={!open}>
        <div className="mm-bg absolute inset-0 bg-ink/95 backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-1/3 top-1/4 h-[90vw] w-[90vw] rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.16),transparent_60%)]" />
          <div className="pointer-events-none absolute -left-1/3 bottom-0 h-[80vw] w-[80vw] rounded-full bg-[radial-gradient(circle,rgba(107,70,255,0.16),transparent_60%)]" />
        </div>
        <div className="shell relative flex h-full flex-col pb-10 pt-28">
          <p className="mm-fade kicker text-ember-soft">Chapters</p>
          <nav className="mt-6 flex flex-col" aria-label="Mobile">
            {[...NAV_LINKS, { href: "#manifest", label: "The Manifest", n: "11" }].map((l, i) => (
              <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} tabIndex={open ? 0 : -1} className="group block overflow-hidden border-b border-white/[0.07] py-3">
                <span className="mm-item flex items-baseline justify-between" style={dv({ "--i": i })}>
                  <span className="font-serif text-[2.6rem] leading-tight sm:text-6xl">{l.label}</span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-bone/40">{l.n}</span>
                </span>
              </a>
            ))}
          </nav>
          <div className="mm-fade mt-auto flex items-end justify-between font-mono text-[10px] uppercase leading-5 tracking-[0.2em] text-bone/40">
            <span>
              Erebus · 9.6 ly
              <br />
              RA 18h 52m · Dec +33°
            </span>
            <span className="flex items-center gap-2 text-bone/60">
              Scroll the dark <Arrow className="h-3.5 w-3.5" dir="down" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
