import { useEffect, useState } from "react";
import { Arrow, Kicker, LogoMark, SplitText } from "../ui";
import { useRouter } from "../../lib/router";
import { cn } from "../../utils/cn";
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
    title: "1. Multi-Epoch Timeline & Astrometric Difference Imaging",
    subtitle: "Observation Scrubber · Difference Image D = (I2 - B2) - α(I1 - B1) · 1-4 Hz Blink",
    desc: "Revisit coordinates across 6-month survey passes. Notice how difference imaging isolates true flux changes (>3σ) and eliminates static background stars."
  },
  {
    targetId: "barnards-star",
    tab: "sky",
    title: "2. Real Astronomical Sky Explorer & Detector Footprint",
    subtitle: "CDS Strasbourg Aladin Lite v3 WebGL · 2MASS / AllWISE / DSS2 Surveys · SPHEREx FOV",
    desc: "Interactive celestial sphere with authentic all-sky surveys, J2000 coordinate grid, and SPHEREx's 3.5° × 11.3° focal plane array footprint."
  },
  {
    targetId: "barnards-star",
    tab: "motion",
    title: "3. Astrometric Proper Motion Tracking (>5σ Confidence)",
    subtitle: "Centroid Coordinates · Displacement Vectors · Gaia DR3 Validation",
    desc: "Barnard's Star moving at 10.39″/yr across multi-epoch scans. Centroid displacement vectors cross-matched against Gaia DR3 astrometric predictions."
  },
  {
    targetId: "rw-aurigae",
    tab: "variable",
    title: "4. Variable Star Multi-Band Light Curves & CSV Export",
    subtitle: "T Tauri Occultation · Phase-Folded Analysis · Calibrated Photometry",
    desc: "Classical T Tauri young star showing circumstellar dust occultation events across 6 detector arrays. Toggle flux/magnitude and export CSV data."
  },
  {
    targetId: "wise-0855",
    tab: "spectra",
    title: "5. 102 Near-IR Spectral Channels & Interstellar Ices",
    subtitle: "6 Linear Variable Filter Arrays (0.75 – 5.0 µm) · Resolving Power R = 35–130 · SED",
    desc: "Coldest brown dwarf WISE 0855 (Teff ≈ 250 K) revealing water ice clouds in Array 6. Interactive wavelength slider and biogenic ice line markers."
  },
  {
    targetId: "barnards-star",
    tab: "most",
    title: "6. Solar System Minor Planets via IRSA MOST",
    subtitle: "Asteroid Ephemerides (Ceres, Vesta, Victoria, Eros) · Keplerian Orbit Matcher",
    desc: "Programmatic integration with NASA/IPAC IRSA MOST to match solar system asteroid orbits against SPHEREx survey scan intersections."
  },
  {
    targetId: "barnards-star",
    tab: "provenance",
    title: "7. Scientific Provenance & Open Data Lineage",
    subtitle: "NASA/IPAC IRSA SIAv2 · Caltech Pipelines · Level-2 Products · JSON Dossier",
    desc: "Complete transparency tracing raw multi-extension FITS cubes, NASA/IPAC IRSA SIAv2 endpoints, Caltech pipelines, and one-click JSON export."
  }
];

export default function SpherexHub() {
  const { navigate } = useRouter();
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("barnards-star");
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [targetDetails, setTargetDetails] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Read URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTarget = params.get("target");
    const urlTab = params.get("tab") as TabKey | null;

    if (urlTarget) setSelectedTargetId(urlTarget);
    if (urlTab && ["sky", "timeline", "motion", "variable", "spectra", "most", "provenance"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, []);

  // Update URL query params when target or tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("target", selectedTargetId);
    params.set("tab", activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [selectedTargetId, activeTab]);

  // Fetch target list
  useEffect(() => {
    fetch("/api/targets")
      .then((r) => r.json())
      .then((d) => {
        if (d.targets) setTargets(d.targets);
      })
      .catch((err) => console.error("Failed to load targets list:", err));
  }, []);

  // Fetch detailed dossier and observations for selected target
  useEffect(() => {
    setLoading(true);
    setSearchError(null);
    Promise.all([
      fetch(`/api/target/${selectedTargetId}`).then((r) => r.json()),
      fetch(`/api/observations?targetId=${selectedTargetId}`).then((r) => r.json())
    ])
      .then(([detailRes, obsRes]) => {
        if (detailRes.target) {
          setTargetDetails(detailRes.target);
        }
        if (obsRes.observations) {
          setObservations(obsRes.observations);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load target data:", err);
        setLoading(false);
      });
  }, [selectedTargetId]);

  // Handle Search Input (Target name or RA/Dec)
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchError(null);

    fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setSearchError(d.error);
          setLoading(false);
        } else if (d.result) {
          setTargetDetails(d.result);
          setSelectedTargetId(d.result.id);
          // Query observations for resolved coordinates
          fetch(`/api/observations?ra=${d.result.raDeg}&dec=${d.result.decDeg}`)
            .then((res) => res.json())
            .then((obsData) => {
              setObservations(obsData.observations || []);
              setLoading(false);
            });
        }
      })
      .catch((err) => {
        setSearchError(err.message);
        setLoading(false);
      });
  };

  const currentTarget = targetDetails || targets.find((t) => t.id === selectedTargetId) || {
    id: "barnards-star",
    name: "Barnard's Star",
    raDeg: 269.45208,
    decDeg: 4.69339,
    raSexagesimal: "17h 57m 48.50s",
    decSexagesimal: "+04° 41' 36.2\"",
    type: "High Proper Motion M-Dwarf Star",
    spectralType: "M4.0V",
    scienceDescription: "Barnard's Star has the fastest proper motion of any known star (~10.39 arcsec/yr)."
  };

  const startTour = () => {
    setTourStep(0);
    setSelectedTargetId(TOUR_STEPS[0].targetId);
    setActiveTab(TOUR_STEPS[0].tab);
  };

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

  // Keyboard navigation for power users and judges (1-7 for tabs, arrows for tour)
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
    <section id="spherex-hub" className="h-full w-full flex flex-col bg-[#070b14] text-slate-100 overflow-hidden select-none">
      {/* ── WORKSTATION COMMAND BAR (ROW 1, h-14) ── */}
      <header className="h-14 shrink-0 border-b border-slate-800/80 bg-[#0b1120] px-4 flex items-center justify-between gap-3 z-30">
        {/* Left: Brand & Station Identity */}
        <div className="flex items-center gap-3">
          <LogoMark className="h-7 w-7 text-amber-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-100 font-bold">
                MARSAD <span className="text-amber-400 font-semibold">Station</span>
              </span>
              <span className="hidden sm:inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.2 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                SPHEREx QR2
              </span>
            </div>
          </div>
        </div>

        {/* Center: 5 Target Pills & Quick Search */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#070b14] p-1">
            {[
              { id: "barnards-star", name: "Barnard's Star", badge: "Motion" },
              { id: "epsilon-indi-b", name: "Epsilon Indi B", badge: "Brown Dwarf" },
              { id: "wise-0855", name: "WISE 0855", badge: "Y-Dwarf" },
              { id: "rw-aurigae", name: "RW Aurigae", badge: "Variable" },
              { id: "r-draconis", name: "R Draconis", badge: "Mira" }
            ].map((t) => (
              <button
                key={t.id}
                data-target-id={t.id}
                onClick={() => setSelectedTargetId(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer",
                  selectedTargetId === t.id
                    ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <span>{t.name}</span>
                <span
                  className={cn(
                    "rounded px-1 text-[8.5px]",
                    selectedTargetId === t.id ? "bg-slate-950/30 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"
                  )}
                >
                  {t.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <form onSubmit={onSearchSubmit} className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Search object or RA, Dec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded border border-slate-800 bg-[#070b14] px-2.5 py-1 text-xs font-mono text-slate-200 focus:border-amber-500 focus:outline-none w-36 lg:w-44"
            />
            <button
              type="submit"
              className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>

        {/* Right: Guided Tour toggle + ONLY "Back to Home" Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={tourStep === null ? startTour : exitTour}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider transition-all cursor-pointer",
              tourStep !== null
                ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                : "border border-slate-700 bg-slate-800/70 text-slate-300 hover:text-slate-100 hover:border-slate-600"
            )}
          >
            <span>🧭 {tourStep === null ? "Tour" : "Exit Tour"}</span>
          </button>

          {/* Prominent "Back to Home" button */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-amber-300 shadow-md transition-all duration-300 hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] cursor-pointer"
            aria-label="Back to Home"
          >
            <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" dir="left" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* ── WORKSTATION SUB-BAR (ROW 2, h-11) ── */}
      <div className="h-11 shrink-0 border-b border-slate-800/80 bg-[#090e1a]/95 px-4 flex items-center justify-between gap-3 text-xs font-mono z-20">
        {/* Active Target Meta Chip */}
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="flex items-center gap-1.5 font-semibold text-slate-100">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {currentTarget.name}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300 truncate">{currentTarget.type}</span>
          <span className="hidden lg:inline text-slate-600">·</span>
          <span className="hidden lg:inline text-slate-400">
            RA {currentTarget.raSexagesimal} · Dec {currentTarget.decSexagesimal}
          </span>
          {currentTarget.distanceLy && (
            <>
              <span className="hidden xl:inline text-slate-600">·</span>
              <span className="hidden xl:inline text-slate-200">{currentTarget.distanceLy} ly</span>
            </>
          )}
        </div>

        {/* 7 Workflow Tool Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { key: "timeline", label: "Timeline & Diff", n: "01" },
            { key: "sky", label: "Sky Explorer", n: "02" },
            { key: "motion", label: "Motion", n: "03" },
            { key: "variable", label: "Light Curve", n: "04" },
            { key: "spectra", label: "102 Bands", n: "05" },
            { key: "most", label: "MOST Asteroids", n: "06" },
            { key: "provenance", label: "Provenance", n: "07" }
          ].map((tab) => (
            <button
              key={tab.key}
              data-tab={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] whitespace-nowrap transition-all cursor-pointer",
                activeTab === tab.key
                  ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <span className={cn("text-[9px]", activeTab === tab.key ? "text-slate-950/80 font-bold" : "text-amber-400/80")}>{tab.n}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Guided Tour Compact Banner (When Active) */}
      {tourStep !== null && (
        <div className="shrink-0 border-b border-ember/40 bg-linear-to-r from-ember/15 via-ink-2 to-ion/10 px-4 py-2 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="rounded-full bg-ember px-2 py-0.5 font-mono text-[9px] font-bold text-ink uppercase shrink-0">
              Step {tourStep + 1} of {TOUR_STEPS.length}
            </span>
            <span className="font-serif text-sm text-bone font-medium truncate">
              {TOUR_STEPS[tourStep].title}
            </span>
            <span className="hidden md:inline text-xs text-mist truncate">
              — {TOUR_STEPS[tourStep].desc}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={prevTourStep}
              className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-bone hover:bg-white/20 cursor-pointer"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={nextTourStep}
              className="rounded bg-ember px-2.5 py-0.5 font-mono text-[10px] font-bold text-ink hover:bg-ember-soft cursor-pointer shadow-sm"
            >
              {tourStep === TOUR_STEPS.length - 1 ? "Finish ↺" : "Next →"}
            </button>
            <button
              type="button"
              onClick={exitTour}
              className="text-mist hover:text-bone text-xs px-1 cursor-pointer"
              title="Close tour"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── WORKSTATION VIEWPORT (ROW 3, flex-1, overflow-hidden) ── */}
      <main className="flex-1 min-h-0 overflow-hidden p-3 relative">
        {activeTab === "timeline" && (
          <ObservationTimelineComparator
            targetId={selectedTargetId}
            targetName={currentTarget.name}
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
          <div className="h-full overflow-y-auto">
            <MotionDetectionViewer targetId={selectedTargetId} />
          </div>
        )}

        {activeTab === "variable" && (
          <div className="h-full overflow-y-auto">
            <VariableStarLightCurve targetId={selectedTargetId} />
          </div>
        )}

        {activeTab === "spectra" && (
          <div className="h-full overflow-y-auto">
            <SpectralBandExplorer targetId={selectedTargetId} />
          </div>
        )}

        {activeTab === "most" && (
          <div className="h-full overflow-y-auto">
            <MostSolarSystemExplorer />
          </div>
        )}

        {activeTab === "provenance" && (
          <div className="h-full overflow-y-auto">
            <ProvenanceInspector target={currentTarget} observations={observations} />
          </div>
        )}
      </main>
    </section>
  );
}

