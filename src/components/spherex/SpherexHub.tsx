import { useEffect, useState } from "react";
import { Arrow, LogoMark } from "../ui";
import ErrorBoundary from "../ErrorBoundary";
import { useRouter } from "../../lib/router";
import { cn } from "../../utils/cn";
import {
  AUTHORITATIVE_TARGETS,
  getLocalTargetById,
  getLocalObservationsForTarget
} from "../../lib/scientificFallback";
import AladinSkyExplorer from "./AladinSkyExplorer";
import ObservationTimelineComparator from "./ObservationTimelineComparator";
import MotionDetectionViewer from "./MotionDetectionViewer";
import VariableStarLightCurve from "./VariableStarLightCurve";
import SpectralBandExplorer from "./SpectralBandExplorer";
import MostSolarSystemExplorer from "./MostSolarSystemExplorer";
import ProvenanceInspector from "./ProvenanceInspector";

export type TabKey = "sky" | "timeline" | "motion" | "variable" | "spectra" | "most" | "provenance";

const TOUR_STEPS: { targetId: string; tab: TabKey; title: string; subtitle: string; desc: string }[] = [
  {
    targetId: "barnards-star",
    tab: "timeline",
    title: "1. Multi-Epoch Timeline & WCS Residual Map",
    subtitle: "IRSA QR2 Epoch Scrubber · Difference Residual D = (I2 - B2) - (I1 - B1) · 1–4 Hz Blink",
    desc: "Compare SPHEREx QR2 survey passes across time. Difference imaging subtracts stationary background field stars and isolates proper-motion or flux residuals."
  },
  {
    targetId: "barnards-star",
    tab: "sky",
    title: "2. Real Astronomical Sky Explorer & Detector Footprint",
    subtitle: "CDS Strasbourg Aladin Lite v3 WebGL · 2MASS / AllWISE / DSS2 Surveys · SPHEREx FOV",
    desc: "Interactive celestial sphere with real all-sky surveys, ICRS J2000 coordinates, and SPHEREx's 3.5° × 11.3° focal plane footprint."
  },
  {
    targetId: "barnards-star",
    tab: "motion",
    title: "3. Astrometric Proper Motion & Catalog Comparison",
    subtitle: "Gaia DR3 / Spitzer-WISE Vectors · Spherical Coordinate Trajectory · 6.15″/px Scale Check",
    desc: "Barnard's Star moving at 10.393″/yr in Gaia DR3 across SPHEREx QR2 epochs, comparing catalog proper motion against SPHEREx pixel resolution."
  },
  {
    targetId: "r-draconis",
    tab: "variable",
    title: "4. Variable Star Multi-Band Light Curves & CSV Export",
    subtitle: "Mira Pulsation (245.6d GCVS Period) & CTTS Dust Occultations · Archival Flux Calibration",
    desc: "Inspect R Draconis (verified 245.6-day Mira period) and RW Aurigae (irregular dust occultations) across D1–D6 with one-click CSV export."
  },
  {
    targetId: "wise-0855",
    tab: "spectra",
    title: "5. 102 Near-IR Spectral Channels & Archival Photometry",
    subtitle: "6 Linear Variable Filter Arrays (0.75 – 5.0 µm, R = 35–130) · 2MASS/WISE/Spitzer Anchor",
    desc: "Ultra-cold Y4 brown dwarf WISE 0855 (Teff ≈ 250 K) showing thermal emergence in Array D6 (4.42–5.00 µm, R ~ 130) anchored to Spitzer & WISE photometry."
  },
  {
    targetId: "barnards-star",
    tab: "most",
    title: "6. Solar System Minor Planets (JPL Horizons / IRSA MOST)",
    subtitle: "Computed Orbital Ephemerides (1 Ceres, 4 Vesta, 12 Victoria, 433 Eros) · Elongation Check",
    desc: "3D Keplerian orbital ephemerides from JPL J2000 osculating elements evaluated against SPHEREx's solar-elongation visibility zone."
  },
  {
    targetId: "barnards-star",
    tab: "provenance",
    title: "7. Scientific Provenance & Open Data Lineage",
    subtitle: "NASA/IPAC IRSA SIAv2 · ESA Gaia DR3 · 2MASS/AllWISE · AAVSO VSX · JSON Dossier",
    desc: "Complete provenance tracing archive sources, dataset IDs, calibration levels, units, retrieval timestamps, and mathematical transformations."
  }
];

const BENCHMARK_ASTEROIDS = [
  { id: "ceres", name: "1 Ceres", type: "Dwarf Planet (C-type)", a: "2.767 AU", period: "4.60 yr" },
  { id: "vesta", name: "4 Vesta", type: "Protoplanet (V-type)", a: "2.361 AU", period: "3.63 yr" },
  { id: "victoria", name: "12 Victoria", type: "Main Belt (L/S-type)", a: "2.334 AU", period: "3.57 yr" },
  { id: "eros", name: "433 Eros", type: "Near-Earth (S-type)", a: "1.458 AU", period: "1.76 yr" }
];

export default function SpherexHub() {
  const { navigate } = useRouter();
  const [targets, setTargets] = useState<any[]>(AUTHORITATIVE_TARGETS);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("target");
    return t && AUTHORITATIVE_TARGETS.some((x: any) => x.id === t) ? t : "barnards-star";
  });
  const [selectedAsteroid, setSelectedAsteroid] = useState<string>("1 Ceres");
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as TabKey | null;
    return tab && ["sky", "timeline", "motion", "variable", "spectra", "most", "provenance"].includes(tab)
      ? tab
      : "timeline";
  });
  const [targetDetails, setTargetDetails] = useState<any>(() => getLocalTargetById(selectedTargetId));
  const [observations, setObservations] = useState<any[]>(() => getLocalObservationsForTarget(selectedTargetId));
  const [loading, setLoading] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Update URL query params when target or tab changes, and support browser Back/Forward (popstate)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentT = params.get("target");
    const currentTab = params.get("tab");
    if (currentT !== selectedTargetId || currentTab !== activeTab) {
      params.set("target", selectedTargetId);
      params.set("tab", activeTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      if (!currentT && !currentTab) {
        window.history.replaceState({ target: selectedTargetId, tab: activeTab }, "", newUrl);
      } else {
        window.history.pushState({ target: selectedTargetId, tab: activeTab }, "", newUrl);
      }
    }
  }, [selectedTargetId, activeTab]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("target");
      const tab = params.get("tab") as TabKey | null;
      if (t && AUTHORITATIVE_TARGETS.some((x: any) => x.id === t)) {
        setSelectedTargetId(t);
      }
      if (tab && ["sky", "timeline", "motion", "variable", "spectra", "most", "provenance"].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Fetch target list from API (with local authoritative fallback)
  useEffect(() => {
    fetch("/api/targets")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (d.targets && d.targets.length > 0) setTargets(d.targets);
      })
      .catch(() => {
        setTargets(AUTHORITATIVE_TARGETS);
      });
  }, []);

  // Update target dossier and observations immediately from verified local dataset, then sync with API
  useEffect(() => {
    const localTarget = getLocalTargetById(selectedTargetId);
    const localObs = getLocalObservationsForTarget(selectedTargetId);
    setTargetDetails(localTarget);
    setObservations(localObs);
    setLoading(true);

    let active = true;
    Promise.all([
      fetch(`/api/target/${selectedTargetId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/observations?targetId=${selectedTargetId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ])
      .then(([detailRes, obsRes]) => {
        if (!active) return;
        if (detailRes && detailRes.target && detailRes.target.id === selectedTargetId) {
          setTargetDetails(detailRes.target);
        }
        if (obsRes && Array.isArray(obsRes.observations) && obsRes.observations.length > 0) {
          setObservations(obsRes.observations);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTargetId]);

  const currentTarget =
    (targetDetails && targetDetails.id === selectedTargetId ? targetDetails : null) ||
    targets.find((t) => t.id === selectedTargetId) ||
    getLocalTargetById(selectedTargetId);

  const nextTourStep = () => {
    if (tourStep === null) return;
    const next = (tourStep + 1) % TOUR_STEPS.length;
    setTourStep(next);
    setSelectedTargetId(TOUR_STEPS[next].targetId);
    setActiveTab(TOUR_STEPS[next].tab);
  };

  const prevTourStep = () => {
    if (tourStep === null) return;
    const prev = (tourStep - 1 + TOUR_STEPS.length) % TOUR_STEPS.length;
    setTourStep(prev);
    setSelectedTargetId(TOUR_STEPS[prev].targetId);
    setActiveTab(TOUR_STEPS[prev].tab);
  };

  const exitTour = () => {
    setTourStep(null);
  };

  // Keyboard navigation for power users (1-7 for tabs, arrows for tour)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (e.key === "Escape" && tourStep !== null) {
        exitTour();
      } else if (e.key === "ArrowRight" && tourStep !== null) {
        nextTourStep();
      } else if (e.key === "ArrowLeft" && tourStep !== null) {
        prevTourStep();
      } else if (e.key === "1") {
        setActiveTab("timeline");
      } else if (e.key === "2") {
        setActiveTab("sky");
      } else if (e.key === "3") {
        setActiveTab("motion");
      } else if (e.key === "4") {
        setActiveTab("variable");
      } else if (e.key === "5") {
        setActiveTab("spectra");
      } else if (e.key === "6") {
        setActiveTab("most");
      } else if (e.key === "7") {
        setActiveTab("provenance");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tourStep]);

  return (
    <section id="spherex-hub" className="min-h-screen w-full flex flex-col bg-[#070b14] text-slate-100">
      {/* ──ORGANIZED SCIENTIFIC OBSERVATORY HEADER ── */}
      <header className="shrink-0 border-b border-slate-800/80 bg-[#0b1120] px-4 sm:px-6 py-3 z-30">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-3">
          {/* Top Row: Brand Identity, Active Target Quick Summary & Back to Home */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <LogoMark className="h-7 w-7 text-amber-500" />
              <div>
                <span className="font-mono text-sm uppercase tracking-[0.22em] text-slate-100 font-bold">
                  MARSAD <span className="text-amber-400 font-normal">Observatory</span>
                </span>
                <span className="hidden md:inline-block ml-3 text-xs font-mono text-slate-400 border-l border-slate-800 pl-3">
                  NASA SPHEREx All-Sky Spectral Survey Analysis Station
                </span>
              </div>
            </div>

            {/* Active Target / Asteroid Concise Summary Strip */}
            {activeTab === "most" ? (
              <div className="hidden lg:flex items-center gap-3 rounded-xl bg-[#070b14] border border-amber-500/30 px-3.5 py-1.5 text-xs font-mono">
                <span className="text-slate-300">
                  Target: <strong className="text-slate-100">{currentTarget.name}</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-amber-400 font-semibold">
                  Asteroid: <strong className="text-slate-100">{selectedAsteroid}</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-sky-300">
                  a = {BENCHMARK_ASTEROIDS.find((a) => a.name === selectedAsteroid)?.a || "2.767 AU"}
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-emerald-300">
                  Period = {BENCHMARK_ASTEROIDS.find((a) => a.name === selectedAsteroid)?.period || "4.60 yr"}
                </span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-4 rounded-xl bg-[#070b14] border border-slate-800/90 px-4 py-1.5 text-xs font-mono">
                <span className="text-slate-400">
                  Active Target: <strong className="text-slate-100">{currentTarget.name}</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-amber-300">{currentTarget.spectralType}</span>
                <span className="text-slate-700">|</span>
                <span className="text-sky-300">
                  d = {currentTarget.distancePc} pc ({currentTarget.distanceLy} ly)
                </span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-300">
                  μ = {currentTarget.totalProperMotionArcsecYr}″/yr
                </span>
              </div>
            )}

            {/* Right: Back to Home Button */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="group inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500 hover:text-slate-950 cursor-pointer shadow-xs"
                aria-label="Back to Home"
              >
                <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" dir="left" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>

          {/* Second Row: Well-Spaced Target Selector & Scientific Workflow Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
            {/* Target Selector Group (Always visible for all 5 authoritative targets across all tabs) */}
            <div className="w-full xl:w-auto flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pr-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                Target:
              </span>
              <div className="flex items-center gap-1 rounded-xl bg-[#070b14] p-1 border border-slate-800 shrink-0">
                {[
                  { id: "barnards-star", name: "Barnard's Star" },
                  { id: "epsilon-indi-b", name: "Epsilon Indi B" },
                  { id: "wise-0855", name: "WISE 0855" },
                  { id: "rw-aurigae", name: "RW Aurigae" },
                  { id: "r-draconis", name: "R Draconis" }
                ].map((t) => (
                  <button
                    key={t.id}
                    data-target-id={t.id}
                    onClick={() => setSelectedTargetId(t.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer whitespace-nowrap",
                      selectedTargetId === t.id
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {activeTab === "most" && (
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 shrink-0">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mr-1 shrink-0">
                    Asteroid:
                  </span>
                  <div className="flex items-center gap-1 rounded-xl bg-[#070b14] p-1 border border-amber-500/40 shrink-0">
                    {BENCHMARK_ASTEROIDS.map((a) => (
                      <button
                        key={a.id}
                        data-asteroid-id={a.id}
                        onClick={() => setSelectedAsteroid(a.name)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer whitespace-nowrap",
                          selectedAsteroid === a.name
                            ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                        )}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Tabs — With clear icons and full text labels for Motion and Light Curve */}
            <div className="w-full xl:w-auto flex items-center gap-1 rounded-xl bg-[#070b14] p-1 border border-slate-800 overflow-x-auto scrollbar-none shrink-0 pb-1 pr-4">
              {[
                {
                  key: "timeline",
                  label: "Timeline",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" strokeWidth="2" />
                      <path strokeWidth="2" d="M12 7v5l3 3" />
                    </svg>
                  )
                },
                {
                  key: "sky",
                  label: "Sky Map",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                      <path strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                    </svg>
                  )
                },
                {
                  key: "motion",
                  label: "Motion Vectors",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )
                },
                {
                  key: "variable",
                  label: "Light Curve",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M3 12c3-6 6-6 9 0s6 6 9 0" />
                    </svg>
                  )
                },
                {
                  key: "spectra",
                  label: "102-Band Spectra",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  )
                },
                {
                  key: "most",
                  label: "Asteroids (MOST)",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="7" strokeWidth="2" strokeDasharray="3 3" />
                      <circle cx="12" cy="5" r="2" fill="currentColor" />
                    </svg>
                  )
                },
                {
                  key: "provenance",
                  label: "Data Lineage",
                  icon: (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )
                }
              ].map((tab) => (
                <button
                  key={tab.key}
                  data-tab={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-slate-800 text-amber-300 font-semibold border border-amber-500/30 shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                  )}
                >
                  {tab.icon}
                  <span className="font-mono">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Guided Tour Compact Banner (When Active) */}
      {tourStep !== null && (
        <div className="shrink-0 border-b border-ember/40 bg-linear-to-r from-ember/15 via-ink-2 to-ion/10 px-4 py-2.5 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="rounded-full bg-ember px-2.5 py-0.5 font-mono text-xs font-bold text-ink uppercase shrink-0">
              Step {tourStep + 1} of {TOUR_STEPS.length}
            </span>
            <span className="font-serif text-sm text-bone font-medium truncate">
              {TOUR_STEPS[tourStep].title}
            </span>
            <span className="hidden md:inline text-xs text-mist truncate">
              — {TOUR_STEPS[tourStep].desc}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={prevTourStep}
              className="rounded bg-white/10 px-2.5 py-1 font-mono text-xs text-bone hover:bg-white/20 cursor-pointer"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={nextTourStep}
              className="rounded bg-ember px-3 py-1 font-mono text-xs font-bold text-ink hover:bg-ember-soft cursor-pointer shadow-sm"
            >
              {tourStep === TOUR_STEPS.length - 1 ? "Finish ↺" : "Next →"}
            </button>
            <button
              type="button"
              onClick={exitTour}
              className="text-mist hover:text-bone text-xs px-1.5 cursor-pointer"
              title="Close tour"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── WORKSTATION VIEWPORT (ROW 2, flex-1) ── */}
      <main
        className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 relative"
        data-loading={loading ? "true" : "false"}
      >
        <ErrorBoundary fallbackTitle="Scientific Workflow Module">
          {activeTab === "timeline" && (
            <ObservationTimelineComparator
              targetId={selectedTargetId}
              targetName={currentTarget.name}
              target={currentTarget}
              observations={observations}
            />
          )}

          {activeTab === "sky" && (
            <AladinSkyExplorer
              target={currentTarget}
              onSelectTarget={(id) => setSelectedTargetId(id)}
            />
          )}

          {activeTab === "motion" && (
            <MotionDetectionViewer targetId={selectedTargetId} />
          )}

          {activeTab === "variable" && (
            <VariableStarLightCurve
              targetId={selectedTargetId}
              target={currentTarget}
            />
          )}

          {activeTab === "spectra" && (
            <SpectralBandExplorer targetId={selectedTargetId} />
          )}

          {activeTab === "most" && (
            <MostSolarSystemExplorer
              selectedAsteroid={selectedAsteroid}
              onSelectAsteroid={setSelectedAsteroid}
              target={currentTarget}
              targetId={selectedTargetId}
            />
          )}

          {activeTab === "provenance" && (
            <ProvenanceInspector target={currentTarget} observations={observations} />
          )}
        </ErrorBoundary>
      </main>
    </section>
  );
}
