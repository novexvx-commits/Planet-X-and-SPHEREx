import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { queryMovingObjectSearch } from "../../lib/scientificFallback";

export default function MostSolarSystemExplorer() {
  const [targetName, setTargetName] = useState("1 Ceres");
  const [data, setData] = useState<any>(() => queryMovingObjectSearch("1 Ceres"));
  const [loading, setLoading] = useState(false);

  const fetchMost = (name: string) => {
    const fallback = queryMovingObjectSearch(name);
    setData(fallback);
    setLoading(true);
    fetch(`/api/most?target=${encodeURIComponent(name)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d && d.ephemerides) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
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
            JPL Horizons / IRSA MOST Orbital Ephemeris Engine
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Solar System Moving Object Ephemeris & Visibility Calculator
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
                targetName.toLowerCase().includes(name.split(" ")[1].toLowerCase())
                  ? "bg-ember text-ink font-bold"
                  : "bg-white/5 text-mist hover:text-bone"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Explicit Ephemeris vs Detection Banner */}
      <div className="mt-4 rounded-lg border border-ember/30 bg-ember/5 px-4 py-2.5 font-mono text-[11px] text-mist flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-ember">Scientific Classification:</strong>{" "}
          {data?.dataClassification ||
            "Computed Orbital Ephemerides (JPL Horizons J2000 Osculating Elements) — Not Direct SPHEREx Image Detections."}
        </span>
        <span className="text-ion">SPHEREx Sun-Avoidance Zone: 85° – 120° Solar Elongation</span>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          placeholder="Select or query verified asteroid benchmark ('1 Ceres', '4 Vesta', '12 Victoria', '433 Eros')..."
          className="flex-1 rounded border border-white/10 bg-ink px-4 py-2 font-mono text-xs text-bone focus:border-ember focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-ember px-4 py-2 font-mono text-xs font-semibold text-ink transition-transform active:scale-95 cursor-pointer"
        >
          Compute Ephemeris
        </button>
      </form>

      {/* Unavailable State if uncataloged minor planet queried */}
      {!loading && data?.unavailable && (
        <div className="mt-6 rounded-lg border border-ember/40 bg-ink p-6 text-center font-mono text-xs">
          <p className="text-ember font-semibold uppercase">
            UNAVAILABLE — Target Not in Verified Orbital Elements Catalog
          </p>
          <p className="mt-2 text-mist">{data.message}</p>
        </div>
      )}

      {/* Results Display */}
      {data && data.ephemerides && data.ephemerides.length > 0 && (
        <div className="mt-6 space-y-6">
          {/* Target Physical & Orbital Specs Card */}
          {data.target && (
            <div className="rounded-lg border border-white/10 bg-ink p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-serif text-xl text-bone">
                  {data.target.name}{" "}
                  <span className="font-mono text-xs text-mist">
                    (MPC #{data.target.mpcNumber} · {data.target.spectralClass}-type)
                  </span>
                </h4>
                <span className="font-mono text-xs text-ember-soft">{data.target.type}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs font-mono text-mist">
                <div>
                  <span className="block text-[10px] uppercase">Diameter:</span>
                  <span className="text-bone">{data.target.diameterKm} km</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Semi-Major Axis (a):</span>
                  <span className="text-bone">{data.target.semiMajorAxisAU} AU</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Eccentricity (e):</span>
                  <span className="text-bone">{data.target.eccentricity}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Inclination (i):</span>
                  <span className="text-bone">{data.target.inclinationDeg}°</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Orbital Period:</span>
                  <span className="text-bone">{data.target.orbitalPeriodYears} yrs</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Geometric Albedo:</span>
                  <span className="text-bone">
                    {data.target.albedo} (H={data.target.absMagH})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Computed Geocentric Ephemerides Table */}
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-ink">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-white/10 bg-ink-3 text-[10px] uppercase text-mist">
                <tr>
                  <th className="px-4 py-3">Computed Epoch (UTC)</th>
                  <th className="px-4 py-3">MJD</th>
                  <th className="px-4 py-3">Computed ICRS RA / Dec</th>
                  <th className="px-4 py-3">Heliocentric (r)</th>
                  <th className="px-4 py-3">Geocentric (Δ)</th>
                  <th className="px-4 py-3">Solar Elongation</th>
                  <th className="px-4 py-3">Computed Visibility & Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-mist">
                {data.ephemerides.map((ep: any, idx: number) => {
                  const inWindow = ep.spherexScanIntersection?.includes("Inside");
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-bone font-medium">{ep.utcDate}</td>
                      <td className="px-4 py-3">{ep.mjd}</td>
                      <td className="px-4 py-3 text-ember-soft">
                        {ep.predictedRaDeg}° / {ep.predictedDecDeg}°
                      </td>
                      <td className="px-4 py-3">{ep.heliocentricDistanceAU} AU</td>
                      <td className="px-4 py-3">{ep.geocentricDistanceAU} AU</td>
                      <td className="px-4 py-3 text-bone">
                        {ep.solarElongationDeg}°{" "}
                        {ep.predictedVisualMag ? `(V≈${ep.predictedVisualMag})` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px]",
                              inWindow
                                ? "bg-ion/15 text-ion font-semibold"
                                : "bg-white/5 text-mist"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                inWindow ? "bg-ion" : "bg-mist"
                              )}
                            />
                            {ep.spherexScanIntersection}
                          </span>
                          <span className="text-[9.5px] text-mist/80">
                            {ep.measurementType || "Computed Orbital Ephemeris (Not Direct SPHEREx Detection)"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Provenance note */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-mist/80">
            <span>
              Ephemeris Source: <strong className="text-bone">{data.provenance?.service}</strong>
            </span>
            <span>Status: {data.provenance?.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
