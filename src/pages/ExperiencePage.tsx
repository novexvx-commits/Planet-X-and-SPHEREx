import { useEffect } from "react";
import { useRouter } from "../lib/router";
import FluidCursor from "../components/FluidCursor";
import SpherexHub from "../components/spherex/SpherexHub";
import { Arrow, LogoMark } from "../components/ui";

export default function ExperiencePage() {
  const { navigate } = useRouter();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-ink text-bone font-sans antialiased selection:bg-ember selection:text-ink">
      <FluidCursor />
      <div className="grain" aria-hidden="true" />

      {/* Standalone Minimalist Top Bar — NO NAVBAR, ONLY "Back to Home" Button */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Mark & Observatory Title */}
          <div className="flex items-center gap-3.5">
            <LogoMark className="h-8 w-8 text-ember" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.35em] text-bone font-bold">
                  MARSAD <span className="text-ember">SPHEREx</span>
                </span>
                <span className="rounded-full border border-ember/40 bg-ember/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ember-soft">
                  Dedicated Station
                </span>
              </div>
              <p className="hidden text-[11px] font-mono text-mist/70 sm:block">
                NASA Space Apps Challenge 2026 · Authentic Infrared Exploration
              </p>
            </div>
          </div>

          {/* ONLY "Back to Home" Button */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-bone shadow-lg transition-all duration-300 hover:border-ember hover:bg-ember hover:text-ink hover:shadow-[0_0_25px_rgba(255,138,61,0.6)] cursor-pointer"
            aria-label="Back to Home"
          >
            <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" dir="left" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Scientific Station */}
      <main className="relative z-10">
        <SpherexHub />
      </main>

      {/* Bottom Minimalist Footer with Return Button */}
      <footer className="border-t border-white/10 bg-ink-2 py-8 text-center">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-mist/60">
            MARSAD — NASA SPHEREx Time-Domain Interactive Scientific Observatory
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 font-mono text-xs text-ember-soft hover:text-ember transition-colors cursor-pointer"
          >
            <Arrow className="h-3.5 w-3.5" dir="left" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
