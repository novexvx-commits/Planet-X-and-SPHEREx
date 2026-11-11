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

export default function SpherexHub() {
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("barnards-star");
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [targetDetails, setTargetDetails] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

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
        </div>

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

