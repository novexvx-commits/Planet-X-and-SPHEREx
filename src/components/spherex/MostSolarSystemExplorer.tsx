import { useEffect, useState } from "react";
import { Arrow } from "../ui";
import { cn } from "../../utils/cn";

export default function MostSolarSystemExplorer() {
  const [targetName, setTargetName] = useState("Ceres");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMost = (name: string) => {
    setLoading(true);
    fetch(`/api/most?target=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("MOST fetch failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMost(targetName);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetName.trim()) fetchMost(targetName.trim());
  };

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            IRSA Programmatic Integration
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Moving Object Search Tool (MOST)
          </h3>
        </div>

        {/* Preset Asteroid Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {["1 Ceres", "4 Vesta", "12 Victoria", "433 Eros"].map((name) => (
            <button
              key={name}
              onClick={() => {
                setTargetName(name);
                fetchMost(name);
              }}
              className={cn(
                "rounded px-3 py-1 font-mono text-xs transition-colors",
                targetName === name ? "bg-ember text-ink font-bold" : "bg-white/5 text-mist hover:text-bone"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          placeholder="Search asteroid, comet, or NEO (e.g. 'Ceres', 'Vesta', '99942 Apophis')..."
          className="flex-1 rounded border border-white/10 bg-ink px-4 py-2 font-mono text-xs text-bone focus:border-ember focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-ember px-4 py-2 font-mono text-xs font-semibold text-ink transition-transform active:scale-95"
        >
          Query MOST
        </button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="mt-6 rounded-lg border border-white/10 bg-ink p-8 text-center">
          <p className="font-mono text-xs text-ember-soft animate-pulse">
            Querying IRSA MOST endpoint & calculating orbital intersections...
          </p>
        </div>
      )}

      {/* Results Display */}
      {!loading && data && data.ephemerides && (
        <div className="mt-6 space-y-6">
          {/* Target Physical Specs Card */}
          {data.target && (
            <div className="rounded-lg border border-white/10 bg-ink p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-serif text-xl text-bone">{data.target.name}</h4>
                <span className="font-mono text-xs text-ember-soft">{data.target.type}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-mist">
                <div>
                  <span className="block text-[10px] uppercase">Diameter:</span>
                  <span className="text-bone">{data.target.diameterKm} km</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Semi-Major Axis:</span>
                  <span className="text-bone">{data.target.semiMajorAxisAU} AU</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Orbital Period:</span>
                  <span className="text-bone">{data.target.orbitalPeriodYears} yrs</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Albedo:</span>
                  <span className="text-bone">{data.target.albedo}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ephemeris Orbit Intersections Table */}
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-ink">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-white/10 bg-ink-3 text-[10px] uppercase text-mist">
                <tr>
                  <th className="px-4 py-3">Epoch / Date</th>
                  <th className="px-4 py-3">MJD</th>
                  <th className="px-4 py-3">Predicted RA / Dec</th>
                  <th className="px-4 py-3">Heliocentric (r)</th>
                  <th className="px-4 py-3">Geocentric (Δ)</th>
                  <th className="px-4 py-3">SPHEREx Footprint Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-mist">
                {data.ephemerides.map((ep: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-bone font-medium">{ep.utcDate}</td>
                    <td className="px-4 py-3">{ep.mjd}</td>
                    <td className="px-4 py-3 text-ember-soft">
                      {ep.predictedRaDeg}° / {ep.predictedDecDeg}°
                    </td>
                    <td className="px-4 py-3">{ep.heliocentricDistanceAU} AU</td>
                    <td className="px-4 py-3">{ep.geocentricDistanceAU} AU</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px]",
                          ep.matchedObsId ? "bg-ember/20 text-ember font-semibold" : "bg-white/5 text-mist"
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", ep.matchedObsId ? "bg-ember" : "bg-mist")} />
                        {ep.matchedObsId ? `Intersection: ${ep.matchedObsId}` : ep.spherexScanIntersection}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Provenance note */}
          <p className="font-mono text-[10px] text-mist/70 text-right">
            Service: {data.provenance?.service} · Status: {data.provenance?.status}
          </p>
        </div>
      )}
    </div>
  );
}

