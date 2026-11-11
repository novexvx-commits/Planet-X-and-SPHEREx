import { useEffect, useRef, useState } from "react";
import { Arrow } from "../ui";
import { cn } from "../../utils/cn";

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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBand, setSelectedBand] = useState<string>("all");
  const [metric, setMetric] = useState<"flux" | "magnitude">("flux");
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lightcurve/${targetId}?band=${selectedBand}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Light curve fetch failed:", err);
        setLoading(false);
      });
  }, [targetId, selectedBand]);

  // Render Interactive Canvas Light Curve
  useEffect(() => {
    if (!data || !canvasRef.current || !data.measurements || data.measurements.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement?.clientWidth || 700;
    const height = canvas.height = 340;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, width, height);

    const measurements = data.measurements;
    const mjds = measurements.map((m: any) => m.mjd);
    const minMjd = Math.min(...mjds);
    const maxMjd = Math.max(...mjds);
    const mjdSpan = Math.max(1, maxMjd - minMjd);

    // Metric values
    const values = measurements.map((m: any) => metric === "flux" ? m.fluxDensityMjy : m.abMagnitude).filter((v: any) => v !== null && !isNaN(v));
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) { minVal *= 0.8; maxVal *= 1.2; }
    const valRange = Math.max(0.1, maxVal - minVal);

    // Coordinate conversion helpers
    const getX = (mjd: number) => padLeft + ((mjd - minMjd) / mjdSpan) * (width - padLeft - padRight);
    const getY = (val: number) => {
      // In astronomy, magnitudes are inverted (smaller = brighter)!
      if (metric === "magnitude") {
        return padTop + ((val - minVal) / valRange) * (height - padTop - padBottom);
      }
      return height - padBottom - ((val - minVal) / valRange) * (height - padTop - padBottom);
    };

    // Draw Axes & Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    // Horizontal Grid Lines & Y-labels
    const yTicks = 5;
    ctx.fillStyle = "#8d93a1";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks;
      const val = minVal + frac * valRange;
      const y = metric === "magnitude" ? padTop + frac * (height - padTop - padBottom) : height - padBottom - frac * (height - padTop - padBottom);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(metric === "flux" ? 2 : 1), padLeft - 8, y + 3);
    }

    // Vertical Grid Lines & X-labels
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
      ctx.fillText(mjd.toFixed(0), x, height - padBottom + 16);
    }

    // Axis Labels
    ctx.fillStyle = "#ffc08a";
    ctx.textAlign = "left";
    ctx.fillText(metric === "flux" ? "Flux Density (mJy)" : "AB Magnitude (mag — inverted)", padLeft, padTop - 12);
    ctx.textAlign = "center";
    ctx.fillText("Time (Modified Julian Date, MJD)", width / 2, height - 10);

    // Plot Data Points & Connecting Line for selected band
    // Group points by detector band
    const bands = Array.from(new Set(measurements.map((m: any) => m.detector)));

    bands.forEach((b: any) => {
      const bandPoints = measurements.filter((m: any) => m.detector === b);
      const color = BAND_COLORS[b] || "#ff8a3d";

      // Draw connecting line
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.65;
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

        // Photometric Error bar (±1σ)
        const err = metric === "flux" ? (p.fluxErrorUJy / 1000) : (p.magError || 0.05);
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

        // Point
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
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
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;

    const measurements = data.measurements;
    const mjds = measurements.map((m: any) => m.mjd);
    const minMjd = Math.min(...mjds);
    const maxMjd = Math.max(...mjds);
    const mjdSpan = Math.max(1, maxMjd - minMjd);

    const values = measurements.map((m: any) => metric === "flux" ? m.fluxDensityMjy : m.abMagnitude).filter((v: any) => v !== null && !isNaN(v));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = Math.max(0.1, maxVal - minVal);

    const getX = (mjd: number) => padLeft + ((mjd - minMjd) / mjdSpan) * (width - padLeft - padRight);
    const getY = (val: number) => {
      if (metric === "magnitude") {
        return padTop + ((val - minVal) / valRange) * (height - padTop - padBottom);
      }
      return height - padBottom - ((val - minVal) / valRange) * (height - padTop - padBottom);
    };

    let closest = null;
    let minDistance = 18; // 18px radius

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
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            Spectrophotometric Variability Analyzer
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Multi-Band Light Curves & Photometric Time-Series
          </h3>
        </div>

        {/* Metric and CSV Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Toggle */}
          <div className="flex rounded border border-white/10 bg-ink p-0.5 text-xs">
            <button
              onClick={() => setMetric("flux")}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                metric === "flux" ? "bg-ember text-ink font-semibold" : "text-mist hover:text-bone"
              )}
            >
              Flux (mJy)
            </button>
            <button
              onClick={() => setMetric("magnitude")}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                metric === "magnitude" ? "bg-ember text-ink font-semibold" : "text-mist hover:text-bone"
              )}
            >
              AB Magnitude
            </button>
          </div>

          {/* Download CSV */}
          <a
            href={`/api/lightcurve/${targetId}/csv?band=${selectedBand}`}
            download
            className="flex items-center gap-1.5 rounded border border-ember/40 bg-ember/10 px-3 py-1 font-mono text-xs text-ember hover:bg-ember/20 transition-colors"
          >
            <span>Download CSV</span>
            <Arrow className="h-3 w-3" dir="down" />
          </a>
        </div>
      </div>

      {/* Bandpass Selector Filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-mist mr-1">Detector Array:</span>
        {["all", "D1", "D2", "D3", "D4", "D5", "D6"].map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBand(b)}
            className={cn(
              "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
              selectedBand === b
                ? "bg-white/20 text-bone font-bold border border-white/40"
                : "bg-white/5 text-mist hover:text-bone border border-transparent"
            )}
          >
            {b === "all" ? "All Bands" : `${b} (${b === "D1" ? "0.9µm" : b === "D2" ? "1.4µm" : b === "D3" ? "2.0µm" : b === "D4" ? "3.1µm" : b === "D5" ? "4.1µm" : "4.7µm"})`}
          </button>
        ))}
      </div>

      {/* Main Canvas Chart Stage */}
      <div className="relative mt-4 rounded-lg border border-white/10 bg-ink p-4">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/75 backdrop-blur-xs">
            <span className="font-mono text-xs text-ember-soft animate-pulse">
              Extracting forced aperture photometry from SPHEREx MEFs...
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="block h-[340px] w-full cursor-crosshair"
        />

        {/* Point Inspection Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 rounded-md border border-white/20 bg-ink-2/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono"
            style={{
              left: Math.min(hoveredPoint.px + 12, canvasRef.current ? canvasRef.current.width - 200 : 300),
              top: Math.max(10, hoveredPoint.py - 60)
            }}
          >
            <div className="font-semibold text-ember-soft">{hoveredPoint.obsId}</div>
            <div className="mt-1 text-bone">
              MJD: <span className="text-white">{hoveredPoint.mjd}</span>
            </div>
            <div className="text-mist text-[11px]">{hoveredPoint.utcDate}</div>
            <div className="mt-1 text-ion">
              Band: {hoveredPoint.bandpass}
            </div>
            <div className="text-bone">
              Flux: <span className="text-ember font-medium">{hoveredPoint.fluxDensityMjy} mJy</span>
            </div>
            {hoveredPoint.abMagnitude !== null && (
              <div className="text-bone">
                AB Mag: {hoveredPoint.abMagnitude} ± {hoveredPoint.magError}
              </div>
            )}
            <div className="text-[10px] text-mist">
              SNR: {hoveredPoint.snr}σ
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics Bar */}
      {data?.statistics && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-white/5 bg-ink p-3 font-mono">
            <p className="text-[9px] uppercase text-mist">Time Span</p>
            <p className="text-sm text-bone font-medium mt-1">{data.statistics.timeSpanMjd} days</p>
          </div>
          <div className="rounded border border-white/5 bg-ink p-3 font-mono">
            <p className="text-[9px] uppercase text-mist">Flux Range (Min - Max)</p>
            <p className="text-sm text-bone font-medium mt-1">
              {data.statistics.minFluxDensityMjy} – {data.statistics.maxFluxDensityMjy} mJy
            </p>
          </div>
          <div className="rounded border border-white/5 bg-ink p-3 font-mono">
            <p className="text-[9px] uppercase text-mist">Variability Amplitude</p>
            <p className="text-sm text-ember-soft font-semibold mt-1">
              {data.statistics.variabilityRatio ? `×${data.statistics.variabilityRatio} ratio` : "N/A"}
            </p>
          </div>
          <div className="rounded border border-white/5 bg-ink p-3 font-mono">
            <p className="text-[9px] uppercase text-mist">Observations Count</p>
            <p className="text-sm text-ion font-medium mt-1">{data.totalMeasurementsCount} visits</p>
          </div>
        </div>
      )}
    </div>
  );
}

