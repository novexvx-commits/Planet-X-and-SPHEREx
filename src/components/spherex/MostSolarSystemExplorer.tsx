import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { computeLocalMovingObjectEphemeris } from "../../lib/scientificFallback";

interface MostSolarSystemExplorerProps {
  selectedAsteroid?: string;
  onSelectAsteroid?: (name: string) => void;
  target?: any;
  targetId?: string;
}

const BENCHMARK_ASTEROIDS = ["1 Ceres", "4 Vesta", "12 Victoria", "433 Eros"];

export default function MostSolarSystemExplorer({
  selectedAsteroid = "1 Ceres",
  onSelectAsteroid,
  target,
  targetId
}: MostSolarSystemExplorerProps) {
  const [targetName, setTargetName] = useState(selectedAsteroid);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(() =>
    computeLocalMovingObjectEphemeris(selectedAsteroid, new Date().toISOString().slice(0, 10))
  );
  const [loading, setLoading] = useState(false);
  const skyTrackCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchMost = (name: string, dateStr: string = startDate) => {
    const fallback = computeLocalMovingObjectEphemeris(name, dateStr);
    setData(fallback);
    setLoading(true);
    fetch(
      `/api/most?target=${encodeURIComponent(name)}&startDate=${encodeURIComponent(dateStr)}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d && (Array.isArray(d.ephemerides) || d.unavailable)) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMost(targetName, startDate);
  }, []);

  useEffect(() => {
    if (selectedAsteroid && selectedAsteroid !== targetName) {
      setTargetName(selectedAsteroid);
      fetchMost(selectedAsteroid, startDate);
    }
  }, [selectedAsteroid]);

  // Draw Geocentric ICRS Sky Trajectory & Solar-Elongation Window Canvas
  useEffect(() => {
    if (
      !data ||
      data.unavailable ||
      !data.ephemerides ||
      data.ephemerides.length === 0 ||
      !skyTrackCanvasRef.current
    )
      return;
    const canvas = skyTrackCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 740);
    const height = (canvas.height = 260);
    const padLeft = 64;
    const padRight = 32;
    const padTop = 34;
    const padBottom = 42;

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, width, height);

    const ephem = (data.ephemerides || []).filter(
      (e: any) =>
        e &&
        typeof e.predictedRaDeg === "number" &&
        !isNaN(e.predictedRaDeg) &&
        typeof e.predictedDecDeg === "number" &&
        !isNaN(e.predictedDecDeg)
    );
    if (ephem.length === 0) return;

    const ras = ephem.map((e: any) => e.predictedRaDeg);
    const decs = ephem.map((e: any) => e.predictedDecDeg);

    let minRa = Math.min(...ras);
    let maxRa = Math.max(...ras);
    let minDec = Math.min(...decs);
    let maxDec = Math.max(...decs);

    const raPad = Math.max(2, (maxRa - minRa) * 0.15);
    const decPad = Math.max(1.5, (maxDec - minDec) * 0.2);
    minRa -= raPad;
    maxRa += raPad;
    minDec -= decPad;
    maxDec += decPad;

    const getX = (ra: number) =>
      padLeft + ((ra - minRa) / Math.max(1, maxRa - minRa)) * (width - padLeft - padRight);
    const getY = (dec: number) =>
      height -
      padBottom -
      ((dec - minDec) / Math.max(1, maxDec - minDec)) * (height - padTop - padBottom);

    // Coordinate grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'JetBrains Mono', monospace";

    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const y = height - padBottom - frac * (height - padTop - padBottom);
      const decVal = minDec + frac * (maxDec - minDec);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(`${decVal >= 0 ? "+" : ""}${decVal.toFixed(1)}°`, padLeft - 8, y + 3);
    }

    for (let i = 0; i <= 5; i++) {
      const frac = i / 5;
      const x = padLeft + frac * (width - padLeft - padRight);
      const raVal = minRa + frac * (maxRa - minRa);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(`${raVal.toFixed(1)}°`, x, height - padBottom + 18);
    }

    const windowLabel =
      ephem.length > 0
        ? `${ephem[0].utcDate} to ${ephem[ephem.length - 1].utcDate}`
        : "Current Observation Window";

    ctx.fillStyle = "#ffc08a";
    ctx.textAlign = "left";
    ctx.fillText(
      `Geocentric ICRS Sky Trajectory — ${data.target?.name || targetName} (${windowLabel})`,
      padLeft,
      padTop - 10
    );
    ctx.textAlign = "center";
    ctx.fillText("Right Ascension α (ICRS deg)", width / 2, height - 6);

    // Draw connecting orbital trajectory path
    ctx.strokeStyle = "rgba(255, 138, 61, 0.75)";
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    ephem.forEach((ep: any, idx: number) => {
      const x = getX(ep.predictedRaDeg);
      const y = getY(ep.predictedDecDeg);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw epoch nodes and labels
    ephem.forEach((ep: any, idx: number) => {
      const x = getX(ep.predictedRaDeg);
      const y = getY(ep.predictedDecDeg);
      const inWindow =
        ep.inSolarElongationWindow || ep.spherexScanIntersection?.includes("In SPHEREx");

      ctx.fillStyle = inWindow ? "#6ce5ff" : "#ff8a3d";
      ctx.beginPath();
      ctx.arc(x, y, inWindow ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (inWindow) {
        ctx.strokeStyle = "rgba(108, 229, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = inWindow ? "#6ce5ff" : "#f1f5f9";
      ctx.font = "10.5px 'JetBrains Mono', monospace";
      ctx.textAlign = idx > ephem.length - 2 ? "right" : "left";
      const offsetX = idx > ephem.length - 2 ? -9 : 9;
      const offsetY = idx % 2 === 0 ? -8 : 14;
      ctx.fillText(
        `${ep.utcDate} (${ep.solarElongationDeg}°)`,
        x + offsetX,
        Math.max(padTop + 14, Math.min(height - padBottom - 6, y + offsetY))
      );
    });
  }, [data, targetName]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetName.trim()) {
      fetchMost(targetName.trim(), startDate);
      onSelectAsteroid?.(targetName.trim());
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Target & Solar System Context Header */}
      {target && (
        <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span className="text-slate-400">Active SPHEREx Benchmark:</span>
            <strong className="text-slate-100 font-bold">{target.name}</strong>
            <span className="text-slate-600">·</span>
            <span className="text-amber-300 font-semibold">{target.spectralType}</span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300">
              d = {target.distancePc} pc ({target.distanceLy} ly)
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">
              μ = {target.totalProperMotionArcsecYr}″/yr
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">SPHEREx Survey Window:</span>
            <span className="rounded-lg bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-sky-300 font-bold">
              Solar Elongation 80° – 105°
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-semibold">
            JPL Horizons / IRSA MOST Orbital Ephemeris Engine
          </span>
          <h3 className="mt-1 font-serif text-2xl sm:text-3xl text-slate-100">
            Solar System Moving Object Ephemeris & Visibility Calculator
          </h3>
        </div>

        {/* Preset Asteroid Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {BENCHMARK_ASTEROIDS.map((name) => (
            <button
              key={name}
              onClick={() => {
                setTargetName(name);
                fetchMost(name, startDate);
                onSelectAsteroid?.(name);
              }}
              className={cn(
                "rounded-xl px-3.5 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                targetName.toLowerCase().includes(name.split(" ")[1].toLowerCase())
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "bg-[#090e1a] text-slate-300 hover:text-white border border-slate-800"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Canonical Data Classification & Timestamp Provenance Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono text-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            {data?.unavailable ? (
              <span className="rounded-md bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-rose-300 font-bold">
                UNAVAILABLE
              </span>
            ) : data?.dataClassificationBadge?.includes("HORIZONS") || data?.dataClassificationBadge === "COMPUTED EPHEMERIS — JPL HORIZONS" ? (
              <span className="rounded-md bg-cyan-500/15 border border-cyan-500/40 px-2.5 py-0.5 text-cyan-300 font-bold">
                COMPUTED EPHEMERIS — JPL HORIZONS
              </span>
            ) : (
              <span className="rounded-md bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-amber-300 font-bold">
                DERIVED FROM AUTHORITATIVE EPHEMERIS
              </span>
            )}
            <span>
              {data?.dataClassificationDetail ||
                data?.dataClassification ||
                "DERIVED FROM AUTHORITATIVE EPHEMERIS — Computed Orbital Ephemerides (JPL Horizons / SBDB Osculating Elements — Not Direct SPHEREx Image Detections)"}
            </span>
          </div>
          <span className="text-sky-300 font-semibold shrink-0">
            SPHEREx Solar-Elongation Window: 80° – 105°
          </span>
        </div>

        {/* Explicit Separation of Retrieval Timestamp, Computation Window & Cached Elements Epoch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-xs">Ephemeris Data Source:</span>
            <strong className={cn("text-xs font-semibold", data?.provenance?.isLiveHorizons ? "text-emerald-400" : "text-amber-300")}>
              {data?.provenance?.ephemerisDataSource || (data?.provenance?.isLiveHorizons ? "NASA JPL Horizons API (Live)" : "3D Keplerian Propagation")}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Cached Elements Reference Epoch:</span>
            <strong className="text-xs text-sky-300 font-semibold">
              {data?.provenance?.orbitalElementsEpoch || "MJD 60800.0 (2025-05-05 UTC · JPL SBDB J2000)"}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Ephemeris Computation Window:</span>
            <strong className="text-xs text-slate-200 font-semibold">
              {data?.provenance?.requestedWindowUtc || `${startDate} (+210d)`}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Retrieval Timestamp:</span>
            <strong className="text-xs text-slate-200 font-semibold">
              {(data?.provenance?.retrievalTimestamp || data?.provenance?.ephemerisComputationTime || new Date().toISOString()).slice(0, 19)}Z
            </strong>
          </div>
        </div>

        {data?.provenance?.fallbackNotice && (
          <p className="pt-2 text-xs text-amber-300/80 leading-relaxed border-t border-slate-800/50">
            ℹ️ {data.provenance.fallbackNotice}
          </p>
        )}
      </div>

      {/* Search & Start Date Input Bar */}
      <form onSubmit={onSearch} className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          placeholder="Query asteroid ('1 Ceres', '4 Vesta', '12 Victoria', '433 Eros')..."
          className="flex-1 min-w-[240px] rounded-xl border border-slate-800 bg-[#070b14] px-4 py-2.5 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
        />
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#070b14] px-3 py-1.5 font-mono text-xs">
          <label htmlFor="most-start-date" className="text-slate-400">
            Window Start (UTC):
          </label>
          <input
            id="most-start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value) fetchMost(targetName, e.target.value);
            }}
            className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-amber-500 px-5 py-2.5 font-mono text-xs font-bold text-slate-950 transition-transform active:scale-95 cursor-pointer shadow-sm"
        >
          Compute Ephemeris
        </button>
      </form>

      {/* Unavailable State if uncataloged minor planet queried */}
      {!loading && data?.unavailable && (
        <div className="rounded-xl border border-rose-500/40 bg-[#090e1a] p-6 text-center font-mono text-xs space-y-4">
          <div>
            <span className="inline-block rounded-md bg-rose-500/15 border border-rose-500/40 px-2.5 py-1 text-rose-300 font-bold uppercase">
              Notice: Minor Planet Target Not Found
            </span>
          </div>
          <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">{data.message}</p>
          <div className="pt-2 flex flex-wrap justify-center items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">Select Benchmark Solar System Asteroid:</span>
            {BENCHMARK_ASTEROIDS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setTargetName(name);
                  fetchMost(name, startDate);
                  onSelectAsteroid?.(name);
                }}
                className="rounded-lg bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Display */}
      {data && data.ephemerides && data.ephemerides.length > 0 && (
        <div className="space-y-6">
          {/* Target Header & 4 Prioritized Physical/Orbital Cards */}
          {data.target && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h4 className="font-serif text-2xl text-slate-100">
                    {data.target.name}{" "}
                    <span className="font-mono text-sm text-amber-300">
                      (MPC #{data.target.mpcNumber ?? (typeof data.target.jplId === "string" ? data.target.jplId.replace(";", "") : data.target.jplId)} ·{" "}
                      {data.target.spectralClass || "Minor Planet"}-type)
                    </span>
                  </h4>
                  {data.target.scienceTopic && (
                    <p className="mt-1 text-xs sm:text-sm text-slate-300">
                      {data.target.scienceTopic}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 font-mono text-xs text-amber-300 font-semibold">
                  {data.target.type}
                </span>
              </div>

              {/* 4 Prioritized Physical & Orbital Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4">
                  <span className="block text-xs uppercase text-slate-400">Mean Diameter</span>
                  <span className="mt-1.5 block text-lg sm:text-xl font-bold text-slate-100">
                    {data.target.diameterKm} km
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Spectral Taxon: {data.target.spectralClass}-type
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4">
                  <span className="block text-xs uppercase text-slate-400">Semi-Major Axis (a)</span>
                  <span className="mt-1.5 block text-lg sm:text-xl font-bold text-sky-300">
                    {data.target.semiMajorAxisAU} AU
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Orbital Period: {data.target.orbitalPeriodYears} yrs
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4">
                  <span className="block text-xs uppercase text-slate-400">Eccentricity & Inclination</span>
                  <span className="mt-1.5 block text-lg sm:text-xl font-bold text-amber-400">
                    e = {data.target.eccentricity} · i = {data.target.inclinationDeg}°
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    J2000 Ecliptic Osculating
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4">
                  <span className="block text-xs uppercase text-slate-400">Geometric Albedo & H</span>
                  <span className="mt-1.5 block text-lg sm:text-xl font-bold text-emerald-400">
                    p_V = {data.target.albedo}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Absolute Magnitude H = {data.target.absMagH} mag
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Geocentric Sky Trajectory Canvas */}
          <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4 sm:p-5">
            <canvas ref={skyTrackCanvasRef} className="block h-[260px] w-full rounded-lg" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300">
              <div className="flex flex-wrap items-center gap-6">
                <span className="flex items-center gap-2 text-sky-300">
                  <span className="h-3 w-3 rounded-full bg-sky-400" /> In SPHEREx Solar-Elongation Window (80°–105° from Sun)
                </span>
                <span className="flex items-center gap-2 text-amber-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Outside Instantaneous Terminator Scan Zone
                </span>
              </div>
              <span className="text-slate-400">3D Keplerian Heliocentric → Geocentric ICRS Propagation</span>
            </div>
          </div>

          {/* Computed Geocentric Ephemerides Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#070b14]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-slate-800 bg-[#090e1a] text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-4 py-3.5">Computed Epoch (UTC)</th>
                  <th className="px-4 py-3.5">MJD</th>
                  <th className="px-4 py-3.5">Computed ICRS RA / Dec</th>
                  <th className="px-4 py-3.5">Heliocentric (r)</th>
                  <th className="px-4 py-3.5">Geocentric (Δ)</th>
                  <th className="px-4 py-3.5">Solar Elongation & V</th>
                  <th className="px-4 py-3.5">SPHEREx Visibility & Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {data.ephemerides.map((ep: any, idx: number) => {
                  const inWindow =
                    ep.inSolarElongationWindow ||
                    ep.spherexScanIntersection?.includes("In SPHEREx") ||
                    ep.spherexScanIntersection?.includes("Inside");
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3.5 text-slate-100 font-semibold">{ep.utcDate}</td>
                      <td className="px-4 py-3.5">{Number(ep.mjd).toFixed(1)}</td>
                      <td className="px-4 py-3.5 text-amber-300 font-medium">
                        {ep.predictedRaDeg}° / {ep.predictedDecDeg >= 0 ? `+${ep.predictedDecDeg}` : ep.predictedDecDeg}°
                      </td>
                      <td className="px-4 py-3.5">{ep.heliocentricDistanceAU} AU</td>
                      <td className="px-4 py-3.5">{ep.geocentricDistanceAU} AU</td>
                      <td className="px-4 py-3.5 text-slate-100">
                        {ep.solarElongationDeg}°{" "}
                        {ep.predictedVisualMag ? `(V≈${ep.predictedVisualMag})` : ""}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs",
                              inWindow
                                ? "bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30"
                                : "bg-slate-800 text-slate-300"
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                inWindow ? "bg-sky-400" : "bg-slate-500"
                              )}
                            />
                            {ep.spherexScanIntersection}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ep.measurementType || "DERIVED FROM AUTHORITATIVE EPHEMERIS — Computed Orbital Ephemeris"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Provenance Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-400">
            <span>
              Ephemeris Source: <strong className="text-slate-200">{data.provenance?.service}</strong>
            </span>
            <span>Status: {data.provenance?.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
