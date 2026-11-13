import { useEffect, useRef, useState } from "react";
import { Arrow } from "../ui";
import { cn } from "../../utils/cn";
import { getTargetLightCurve, generateLightCurveCsv, formatMjd } from "../../lib/scientificFallback";

interface VariableStarProps {
  targetId: string;
}

const BAND_COLORS: Record<string, string> = {
  D1: "#6ce5ff", // Ion cyan
  D2: "#9b7bff", // Nebula violet
  D3: "#b8a4ff", // Lavender
  D4: "#ffc08a", // Soft ember
  D5: "#ff8a3d", // Ember orange
  D6: "#e2552e"  // Deep ember
};

export default function VariableStarLightCurve({ targetId }: VariableStarProps) {
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [data, setData] = useState<any>(() => getTargetLightCurve(targetId, "all"));
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<"flux" | "magnitude">("flux");
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fallback = getTargetLightCurve(targetId, selectedBand);
    setData(fallback);
    setHoveredPoint(null);
    setLoading(true);
    fetch(`/api/lightcurve/${targetId}?band=${selectedBand}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d && d.measurements) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [targetId, selectedBand]);

  // Download CSV with full provenance metadata headers
  const handleDownloadCsv = () => {
    const csvText = generateLightCurveCsv(targetId, selectedBand);
    if (!csvText) return;
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${targetId}_spherex_lightcurve_${selectedBand}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Render Interactive Canvas Light Curve
  useEffect(() => {
    if (!data || !canvasRef.current || !data.measurements || data.measurements.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 720);
    const height = (canvas.height = 360);
    const padLeft = 68;
    const padRight = 32;
    const padTop = 36;
    const padBottom = 48;

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, width, height);

    const measurements = data.measurements;
    const mjds = measurements.map((m: any) => m.mjd);
    const minMjd = Math.min(...mjds);
    const maxMjd = Math.max(...mjds);
    const mjdSpan = Math.max(1, maxMjd - minMjd);

    const values = measurements
      .map((m: any) => (metric === "flux" ? m.fluxDensityMjy : m.abMagnitude))
      .filter((v: any) => v !== null && !isNaN(v));
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) {
      minVal *= 0.85;
      maxVal *= 1.15;
    } else {
      const pad = (maxVal - minVal) * 0.08;
      minVal = Math.max(0, minVal - pad);
      maxVal = maxVal + pad;
    }
    const valRange = Math.max(0.01, maxVal - minVal);

    const getX = (mjd: number) =>
      padLeft + ((mjd - minMjd) / mjdSpan) * (width - padLeft - padRight);
    const getY = (val: number) => {
      // Astronomical magnitudes are inverted (smaller magnitude = brighter)
      if (metric === "magnitude") {
        return padTop + ((val - minVal) / valRange) * (height - padTop - padBottom);
      }
      return height - padBottom - ((val - minVal) / valRange) * (height - padTop - padBottom);
    };

    // Draw Axes & Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    const yTicks = 5;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks;
      const val = minVal + frac * valRange;
      const y =
        metric === "magnitude"
          ? padTop + frac * (height - padTop - padBottom)
          : height - padBottom - frac * (height - padTop - padBottom);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(metric === "flux" ? (maxVal < 5 ? 3 : 1) : 2), padLeft - 8, y + 3);
    }

    const xTicks = 6;
    ctx.textAlign = "center";
    for (let i = 0; i <= xTicks; i++) {
      const frac = i / xTicks;
      const mjd = minMjd + frac * mjdSpan;
      const x = padLeft + frac * (width - padLeft - padRight);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(mjd.toFixed(1), x, height - padBottom + 18);
    }

    // Axis Labels
    ctx.fillStyle = "#ffc08a";
    ctx.textAlign = "left";
    ctx.fillText(
      metric === "flux" ? "Flux Density F_ν (mJy)" : "AB Magnitude (mag — inverted)",
      padLeft,
      padTop - 12
    );
    ctx.textAlign = "center";
    ctx.fillText("Observation Epoch (Modified Julian Date, MJD)", width / 2, height - 10);

    // Group points by detector band
    const bands = Array.from(new Set(measurements.map((m: any) => m.detector)));

    bands.forEach((b: any) => {
      const bandPoints = measurements.filter((m: any) => m.detector === b);
      const color = BAND_COLORS[b] || "#ff8a3d";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      bandPoints.forEach((p: any, idx: number) => {
        const val = metric === "flux" ? p.fluxDensityMjy : p.abMagnitude;
        if (val === null) return;
        const x = getX(p.mjd);
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw Points & Error bars
      bandPoints.forEach((p: any) => {
        const val = metric === "flux" ? p.fluxDensityMjy : p.abMagnitude;
        if (val === null) return;
        const x = getX(p.mjd);
        const y = getY(val);

        const err = metric === "flux" ? p.fluxErrorUJy / 1000 : p.magError || 0.05;
        const yErrTop = getY(metric === "flux" ? val + err : val - err);
        const yErrBot = getY(metric === "flux" ? val - err : val + err);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yErrTop);
        ctx.lineTo(x, yErrBot);
        ctx.moveTo(x - 3, yErrTop);
        ctx.lineTo(x + 3, yErrTop);
        ctx.moveTo(x - 3, yErrBot);
        ctx.lineTo(x + 3, yErrBot);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }, [data, metric]);

  // Handle Canvas Mouse Hover for Tooltip
  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current || !data.measurements) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const padLeft = 68;
    const padRight = 32;
    const padTop = 36;
    const padBottom = 48;

    const measurements = data.measurements;
    const mjds = measurements.map((m: any) => m.mjd);
    const minMjd = Math.min(...mjds);
    const maxMjd = Math.max(...mjds);
    const mjdSpan = Math.max(1, maxMjd - minMjd);

    const values = measurements
      .map((m: any) => (metric === "flux" ? m.fluxDensityMjy : m.abMagnitude))
      .filter((v: any) => v !== null && !isNaN(v));
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) {
      minVal *= 0.85;
      maxVal *= 1.15;
    } else {
      const pad = (maxVal - minVal) * 0.08;
      minVal = Math.max(0, minVal - pad);
      maxVal = maxVal + pad;
    }
    const valRange = Math.max(0.01, maxVal - minVal);

    const getX = (mjd: number) =>
      padLeft + ((mjd - minMjd) / mjdSpan) * (width - padLeft - padRight);
    const getY = (val: number) => {
      if (metric === "magnitude") {
        return padTop + ((val - minVal) / valRange) * (height - padTop - padBottom);
      }
      return height - padBottom - ((val - minVal) / valRange) * (height - padTop - padBottom);
    };

    let closest = null;
    let minDistance = 20;

    measurements.forEach((m: any) => {
      const val = metric === "flux" ? m.fluxDensityMjy : m.abMagnitude;
      if (val === null) return;
      const px = getX(m.mjd);
      const py = getY(val);
      const dist = Math.hypot(px - mouseX, py - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...m, px, py };
      }
    });

    setHoveredPoint(closest);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-semibold">
            Spectrophotometric Variability Analyzer · {data?.targetType || "Stellar Photometry"}
          </span>
          <h3 className="mt-1 font-serif text-2xl sm:text-3xl text-slate-100">
            Multi-Band Light Curves & Photometric Time-Series
          </h3>
        </div>

        {/* Metric and CSV Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-800 bg-[#070b14] p-1 text-xs">
            <button
              onClick={() => setMetric("flux")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                metric === "flux" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
              )}
            >
              Flux Density (mJy)
            </button>
            <button
              onClick={() => setMetric("magnitude")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                metric === "magnitude" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
              )}
            >
              AB Magnitude
            </button>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            <span>Download CSV</span>
            <Arrow className="h-3.5 w-3.5" dir="down" />
          </button>
        </div>
      </div>

      {/* Canonical Data Classification & Period Status Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-slate-300">
          <span className="rounded-md bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-purple-300 font-bold">
            MODEL / SIMULATION
          </span>
          <span>Synthetic multi-band light curve evaluated at</span>
          <span className="rounded-md bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-sky-300 font-bold">
            REAL OBSERVATION
          </span>
          <span>IRSA QR2 timestamps & anchored to verified 2MASS/AllWISE/Spitzer fluxes (not extracted from SPHEREx FITS pixel cutouts).</span>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-slate-400">Period Analysis:</span>
          {(data?.variabilityMetadata?.periodDays ?? data?.target?.periodDays) ? (
            <span className="rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-amber-300 font-bold">
              Verified GCVS/AAVSO Period: {data?.variabilityMetadata?.periodDays ?? data?.target?.periodDays} days
            </span>
          ) : (data?.variabilityMetadata?.isVariable ?? (targetId === "rw-aurigae")) ? (
            <span className="rounded-lg bg-purple-500/15 border border-purple-500/40 px-3 py-1 text-purple-300 font-bold">
              Irregular / Aperiodic (CTTS dust occultation)
            </span>
          ) : (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-slate-200 font-medium">
              Non-Variable Photometric Baseline (Constant Flux)
            </span>
          )}
        </div>
      </div>

      {/* 4 Prioritized Summary Metrics */}
      {data?.statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono">
            <p className="text-xs uppercase text-slate-400">Epoch Baseline (Δt)</p>
            <p className="text-lg sm:text-xl text-slate-100 font-bold mt-1.5">
              {data.statistics.timeSpanMjdFormatted || Number(data.statistics.timeSpanMjd).toFixed(1)} days
            </p>
            <p className="text-xs text-slate-400 mt-1">
              SPHEREx QR2 Survey Window
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono">
            <p className="text-xs uppercase text-slate-400">Flux Range (Min – Max)</p>
            <p className="text-lg sm:text-xl text-sky-300 font-bold mt-1.5">
              {data.statistics.minFluxDensityMjy} – {data.statistics.maxFluxDensityMjy} mJy
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Across Selected Detector Array(s)
            </p>
          </div>
          {(() => {
            const isVariableTarget = Boolean(
              data?.variabilityMetadata?.isVariable ||
              data?.variabilityMetadata?.periodDays ||
              data?.target?.periodDays ||
              targetId === "rw-aurigae" ||
              targetId === "r-draconis"
            );
            return (
              <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono">
                <p className="text-xs uppercase text-slate-400">
                  {isVariableTarget ? "Variability Amplitude Ratio" : "Spectral Band Color Ratio"}
                </p>
                <p className="text-lg sm:text-xl text-amber-400 font-bold mt-1.5">
                  {data.statistics.variabilityRatio ? `×${data.statistics.variabilityRatio}` : "1.00×"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isVariableTarget
                    ? "Max / Min Flux Ratio"
                    : "D6 / D1 SED Color Index · Temporal Flux Constant"}
                </p>
              </div>
            );
          })()}
          <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono">
            <p className="text-xs uppercase text-slate-400">Catalog Period & Reference</p>
            <p className="text-lg sm:text-xl text-purple-300 font-bold mt-1.5">
              {data.variabilityMetadata?.periodDays
                ? `${data.variabilityMetadata.periodDays} d (GCVS)`
                : data.variabilityMetadata?.isVariable
                ? "Aperiodic"
                : "Constant"}
            </p>
            <p className="text-xs text-slate-400 mt-1 truncate" title={data.variabilityMetadata?.referenceSource}>
              {data.variabilityMetadata?.referenceSource || "2MASS / AllWISE"}
            </p>
          </div>
        </div>
      )}

      {/* Bandpass Selector Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-slate-400 mr-1">
          Detector Array:
        </span>
        {["all", "D1", "D2", "D3", "D4", "D5", "D6"].map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBand(b)}
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
              selectedBand === b
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "bg-[#090e1a] text-slate-300 hover:text-white border border-slate-800"
            )}
          >
            {b === "all"
              ? "All Bands (D1–D6)"
              : `${b} (${
                  b === "D1"
                    ? "0.93 µm"
                    : b === "D2"
                    ? "1.38 µm"
                    : b === "D3"
                    ? "2.03 µm"
                    : b === "D4"
                    ? "3.12 µm"
                    : b === "D5"
                    ? "4.12 µm"
                    : "4.71 µm"
                })`}
          </button>
        ))}
      </div>

      {/* Main Canvas Chart Stage */}
      <div className="relative rounded-xl border border-slate-800 bg-[#070b14] p-4 sm:p-5">
        {loading && (
          <div className="absolute top-3 right-4 z-20 font-mono text-xs text-amber-300">
            Syncing photometry...
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="block h-[360px] w-full cursor-crosshair rounded-lg"
        />

        {/* Point Inspection Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 rounded-xl border border-slate-700 bg-slate-950/95 p-3.5 shadow-xl backdrop-blur-md text-xs font-mono space-y-1"
            style={{
              left: Math.min(
                hoveredPoint.px + 12,
                canvasRef.current ? canvasRef.current.width - 240 : 300
              ),
              top: Math.max(10, hoveredPoint.py - 75)
            }}
          >
            <div className="font-bold text-amber-300">{hoveredPoint.obsId}</div>
            <div className="text-slate-200">
              MJD: <span className="text-white font-semibold">{formatMjd(hoveredPoint.mjd, 1)}</span> ({hoveredPoint.utcDate})
            </div>
            <div className="text-sky-300">{hoveredPoint.bandpass}</div>
            <div className="text-slate-200">
              Flux:{" "}
              <span className="text-amber-400 font-semibold">
                {hoveredPoint.fluxDensityMjy} ± {(hoveredPoint.fluxErrorUJy / 1000).toFixed(3)} mJy
              </span>
            </div>
            {hoveredPoint.abMagnitude !== null && (
              <div className="text-slate-200">
                AB Mag: {hoveredPoint.abMagnitude} ± {hoveredPoint.magError} mag
              </div>
            )}
            {hoveredPoint.pulsationPhase !== null && hoveredPoint.pulsationPhase !== undefined && (
              <div className="text-purple-300">
                Mira Phase (P=245.6d): φ = {hoveredPoint.pulsationPhase}
              </div>
            )}
            <div className="text-xs text-slate-400 pt-0.5">
              SNR: {hoveredPoint.snr}σ · Modeled at QR2 Timestamp
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
