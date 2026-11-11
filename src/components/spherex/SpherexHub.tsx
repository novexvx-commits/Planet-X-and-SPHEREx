import { useEffect, useState } from "react";
import { Arrow, Kicker, SplitText } from "../ui";
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
    <section id="spherex-hub" className="relative bg-ink py-20 px-4 md:px-8 border-t border-white/10">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <Kicker center>NASA SPHEREx 2026 Exploration Station</Kicker>
          <SplitText
            as="h2"
            text="The Infrared Universe *in Motion*"
            className="mt-3 font-serif text-4xl sm:text-5xl md:text-6xl text-bone"
          />
          <p className="mx-auto mt-4 max-w-3xl font-sans text-sm md:text-base text-mist leading-relaxed">
            Explore authentic multi-epoch observations from NASA’s SPHEREx mission. Revisit identical sky regions across six-month survey passes in 102 near-infrared spectral channels to detect moving objects, variable stars, brown dwarfs, and changing cosmic phenomena.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={tourStep === null ? startTour : exitTour}
              className="inline-flex items-center gap-2 rounded-full border border-ember/60 bg-linear-to-r from-ember/30 via-ember/20 to-ion/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone shadow-[0_0_20px_-4px_rgba(255,138,61,0.5)] transition-all hover:bg-ember hover:text-ink cursor-pointer"
            >
              <span>{tourStep === null ? "🧭 Launch Guided Science Tour" : "✕ Exit Guided Tour"}</span>
            </button>
            <span className="hidden items-center gap-2 font-mono text-[10px] text-mist/60 sm:inline-flex">
              Keyboard: <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-bone">1–7</kbd> tabs · <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-bone">← →</kbd> tour
            </span>
          </div>
        </div>

        {/* Guided Tour Interactive Banner */}
        {tourStep !== null && (
          <div className="mb-8 rounded-2xl border border-ember/50 bg-linear-to-r from-ember/15 via-ink-2 to-ion/10 p-5 shadow-[0_0_40px_-10px_rgba(255,138,61,0.3)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ember px-2.5 py-0.5 font-mono text-[10px] font-bold text-ink uppercase">
                    Step {tourStep + 1} of {TOUR_STEPS.length}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-ember-soft">
                    {TOUR_STEPS[tourStep].subtitle}
                  </span>
                </div>
                <h4 className="mt-2 font-serif text-2xl text-bone">
                  {TOUR_STEPS[tourStep].title}
                </h4>
                <p className="mt-1 text-sm text-mist max-w-3xl leading-relaxed">
                  {TOUR_STEPS[tourStep].desc}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={prevTourStep}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-bone hover:bg-white/10"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={nextTourStep}
                  className="rounded-lg bg-ember px-4 py-1.5 font-mono text-xs font-bold text-ink hover:bg-ember-soft shadow-[0_0_15px_rgba(255,138,61,0.5)]"
                >
                  {tourStep === TOUR_STEPS.length - 1 ? "Finish Tour ↺" : "Next Step →"}
                </button>
                <button
                  type="button"
                  onClick={exitTour}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-xs text-mist hover:text-bone"
                  title="Close tour"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5 Required Targets Selector Bar */}
        <div className="mb-6 rounded-xl border border-white/10 bg-ink-2 p-3 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist px-2">
              Required Mission Targets:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "barnards-star", name: "Barnard's Star", badge: "Proper Motion" },
                { id: "epsilon-indi-b", name: "Epsilon Indi B", badge: "Brown Dwarf" },
                { id: "wise-0855", name: "WISE 0855", badge: "Coldest Y-Dwarf" },
                { id: "rw-aurigae", name: "RW Aurigae", badge: "Variable Star" },
                { id: "r-draconis", name: "R Draconis", badge: "Mira Variable" }
              ].map((t) => (
                <button
                  key={t.id}
                  data-target-id={t.id}
                  onClick={() => setSelectedTargetId(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs transition-all",
                    selectedTargetId === t.id
                      ? "bg-ember text-ink font-bold shadow-[0_0_12px_rgba(255,138,61,0.4)]"
                      : "bg-white/5 text-bone hover:bg-white/10"
                  )}
                >
                  <span>{t.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[9px]",
                      selectedTargetId === t.id ? "bg-ink/30 text-ink" : "bg-white/10 text-mist"
                    )}
                  >
                    {t.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <form onSubmit={onSearchSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Search object or RA, Dec..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded border border-white/10 bg-ink px-3 py-1 text-xs font-mono text-bone focus:border-ember focus:outline-none w-44 sm:w-52"
              />
              <button
                type="submit"
                className="rounded bg-white/10 px-2.5 py-1 text-xs font-mono text-bone hover:bg-white/20 transition-colors"
              >
                Go
              </button>
            </form>
          </div>

          {searchError && (
            <p className="mt-2 text-xs font-mono text-ember px-2">
              ⚠ {searchError}
            </p>
          )}
        </div>

        {/* Target Scientific Dossier Header Card */}
        <div className="mb-8 rounded-xl border border-white/10 bg-ink-2 p-6 shadow-xl">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-3xl md:text-4xl text-bone">
                  {currentTarget.name}
                </h3>
                <span className="rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 font-mono text-[10px] text-ember-soft">
                  {currentTarget.type}
                </span>
                <span className="rounded-full border border-ion/40 bg-ion/10 px-2.5 py-0.5 font-mono text-[10px] text-ion">
                  {currentTarget.spectralType}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-mist">
                RA: <span className="text-bone">{currentTarget.raSexagesimal}</span> ({currentTarget.raDeg?.toFixed(5)}°) · Dec:{" "}
                <span className="text-bone">{currentTarget.decSexagesimal}</span> ({currentTarget.decDeg?.toFixed(5)}°)
                {currentTarget.distanceLy && (
                  <span> · Distance: <span className="text-bone">{currentTarget.distanceLy} ly</span> ({currentTarget.distancePc} pc)</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <div className="text-right">
                <span className="block text-[9px] uppercase text-mist">Archive Coverage</span>
                <span className="text-ember font-bold text-sm">{observations.length} Observations</span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] uppercase text-mist">Data Release</span>
                <span className="text-bone font-medium text-sm">SPHEREx QR2</span>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-white/5 text-xs text-mist leading-relaxed font-sans">
            {currentTarget.scienceDescription}
          </p>
        </div>

        {/* Master Exploration Workflow Tabs */}
        <div className="mb-6 flex overflow-x-auto border-b border-white/10 text-xs font-mono scrollbar-none">
          {[
            { key: "timeline", label: "Timeline & Comparator", n: "01" },
            { key: "sky", label: "Sky Explorer (Aladin)", n: "02" },
            { key: "motion", label: "Motion Detection", n: "03" },
            { key: "variable", label: "Variable Star Analysis", n: "04" },
            { key: "spectra", label: "102 Spectral Bands", n: "05" },
            { key: "most", label: "Solar System (MOST)", n: "06" },
            { key: "provenance", label: "Provenance & Lineage", n: "07" }
          ].map((tab) => (
            <button
              key={tab.key}
              data-tab={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-5 py-3.5 transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-ember text-ember font-bold bg-ember/5"
                  : "border-transparent text-mist hover:text-bone hover:border-white/20"
              )}
            >
              <span className="text-[10px] text-ember-soft opacity-70">{tab.n}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Active Tab Viewport */}
        <div>
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
            <MotionDetectionViewer targetId={selectedTargetId} />
          )}

          {activeTab === "variable" && (
            <VariableStarLightCurve targetId={selectedTargetId} />
          )}

          {activeTab === "spectra" && (
            <SpectralBandExplorer targetId={selectedTargetId} />
          )}

          {activeTab === "most" && (
            <MostSolarSystemExplorer />
          )}

          {activeTab === "provenance" && (
            <ProvenanceInspector target={currentTarget} observations={observations} />
          )}
        </div>
      </div>
    </section>
  );
}

