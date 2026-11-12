import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { getSpectralBandsCatalog, getTargetSpectra } from "../../lib/scientificFallback";

interface SpectralExplorerProps {
  targetId: string;
}

export default function SpectralBandExplorer({ targetId }: SpectralExplorerProps) {
  const [catalog, setCatalog] = useState<any>(() => getSpectralBandsCatalog());
  const [targetSpectra, setTargetSpectra] = useState<any>(() => getTargetSpectra(targetId));
  const [loading, setLoading] = useState(false);
  const [selectedDetector, setSelectedDetector] = useState<string>("all");
  const [selectedBandIndex, setSelectedBandIndex] = useState<number>(1);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [showChannelDetails, setShowChannelDetails] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync with backend API while keeping immediate fallback
  useEffect(() => {
    setTargetSpectra(getTargetSpectra(targetId));
    setHoveredPoint(null);
    setLoading(true);
    Promise.all([
      fetch("/api/spectra/catalog").then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/spectra/${targetId}`).then((r) => (r.ok ? r.json() : null))
    ])
      .then(([cat, spec]) => {
        if (cat && cat.bands) setCatalog(cat);
        if (spec && spec.sedPoints) setTargetSpectra(spec);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [targetId]);

  const handleSelectDetector = (det: string) => {
    setSelectedDetector(det);
    if (det !== "all") {
      const detNum = parseInt(det.replace("D", ""), 10);
      if (!isNaN(detNum)) {
        const firstChannel = (detNum - 1) * 17 + 1;
        setSelectedBandIndex(firstChannel);
      }
    }
  };

  // Render Interactive Canvas SED (Spectral Energy Distribution)
  useEffect(() => {
    if (!targetSpectra || !canvasRef.current || !targetSpectra.sedPoints) return;
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

    const points = targetSpectra.sedPoints;
    const archival = targetSpectra.archivalPhotometry || [];
    const minLambda = 0.75;
    const maxLambda = 5.0;
    const lambdaSpan = maxLambda - minLambda;

    const allFluxes = [
      ...points.map((p: any) => p.fluxDensityMjy),
      ...archival.map((a: any) => a.fluxMjy ?? a.fluxDensityMjy ?? 0)
    ];
    const minFlux = Math.min(...allFluxes);
    const maxFlux = Math.max(...allFluxes) * 1.06;
    const fluxRange = Math.max(0.005, maxFlux - minFlux);

    const getX = (lambda: number) =>
      padLeft + ((lambda - minLambda) / lambdaSpan) * (width - padLeft - padRight);
    const getY = (flux: number) =>
      height - padBottom - ((flux - minFlux) / fluxRange) * (height - padTop - padBottom);

    // Draw detector array shading across background
    const detectorSpans = [
      { id: "D1", min: 0.75, max: 1.11, r: "R~41", color: "rgba(108, 229, 255, 0.05)", activeColor: "rgba(108, 229, 255, 0.16)" },
      { id: "D2", min: 1.11, max: 1.64, r: "R~41", color: "rgba(155, 123, 255, 0.05)", activeColor: "rgba(155, 123, 255, 0.16)" },
      { id: "D3", min: 1.64, max: 2.42, r: "R~41", color: "rgba(184, 164, 255, 0.05)", activeColor: "rgba(184, 164, 255, 0.16)" },
      { id: "D4", min: 2.42, max: 3.82, r: "R~35", color: "rgba(255, 192, 138, 0.05)", activeColor: "rgba(255, 192, 138, 0.16)" },
      { id: "D5", min: 3.82, max: 4.42, r: "R~110", color: "rgba(255, 138, 61, 0.06)", activeColor: "rgba(255, 138, 61, 0.18)" },
      { id: "D6", min: 4.42, max: 5.0, r: "R~130", color: "rgba(226, 85, 46, 0.07)", activeColor: "rgba(226, 85, 46, 0.18)" }
    ];

    detectorSpans.forEach((d) => {
      const x1 = getX(d.min);
      const x2 = getX(d.max);
      const isSelectedDet = selectedDetector === d.id;
      ctx.fillStyle = isSelectedDet ? d.activeColor : d.color;
      ctx.fillRect(x1, padTop, x2 - x1, height - padTop - padBottom);

      if (isSelectedDet) {
        ctx.strokeStyle = "rgba(255, 138, 61, 0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, padTop, x2 - x1, height - padTop - padBottom);
      }

      ctx.fillStyle = isSelectedDet ? "#ffc08a" : "rgba(255, 255, 255, 0.45)";
      ctx.font = "10.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${d.id} (${d.r})`, (x1 + x2) / 2, padTop + 16);
    });

    // Draw Grid & Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    // Horizontal Y Grid (Flux)
    const yTicks = 5;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks;
      const flux = minFlux + frac * fluxRange;
      const y = height - padBottom - frac * (height - padTop - padBottom);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(flux.toFixed(maxFlux < 2 ? 3 : 1), padLeft - 8, y + 3);
    }

    // Vertical X Grid (Wavelength)
    const wavelengths = [0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    ctx.textAlign = "center";
    wavelengths.forEach((wl) => {
      const x = getX(wl);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(`${wl} µm`, x, height - padBottom + 18);
    });

    // Labels
    ctx.fillStyle = "#ffc08a";
    ctx.textAlign = "left";
    ctx.fillText("Flux Density F_ν (mJy)", padLeft, padTop - 12);
    ctx.textAlign = "center";
    ctx.fillText(
      "Wavelength λ (µm) — 102-Channel SPHEREx LVF Model + Verified Archival Photometry",
      width / 2,
      height - 10
    );

    // Draw Continuous 102-Channel Spectrum Line
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    points.forEach((p: any, idx: number) => {
      const x = getX(p.centerWavelengthUm);
      const y = getY(p.fluxDensityMjy);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Individual 102 Band Points + Uncertainties
    points.forEach((p: any) => {
      const x = getX(p.centerWavelengthUm);
      const y = getY(p.fluxDensityMjy);
      const isSelected = p.bandIndex === selectedBandIndex;
      const inSelectedDetector =
        selectedDetector === "all" || p.bandName.startsWith(selectedDetector);

      ctx.globalAlpha = inSelectedDetector ? 1.0 : 0.35;

      // Error bar
      if (p.fluxErrorMjy) {
        const yTop = getY(p.fluxDensityMjy + p.fluxErrorMjy);
        const yBot = getY(Math.max(0, p.fluxDensityMjy - p.fluxErrorMjy));
        ctx.strokeStyle = "rgba(255, 138, 61, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBot);
        ctx.stroke();
      }

      ctx.fillStyle = isSelected ? "#ffffff" : "#ff8a3d";
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 5.5 : 2.75, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#ff8a3d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 9.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    });

    // Overlay Real Archival Broadband Photometry Points (2MASS / AllWISE / Spitzer) as Cyan Diamonds
    archival.forEach((a: any) => {
      const aFlux = a.fluxMjy ?? a.fluxDensityMjy;
      if (aFlux === undefined || a.wavelengthUm < minLambda || a.wavelengthUm > maxLambda) return;
      const x = getX(a.wavelengthUm);
      const y = getY(aFlux);

      // Error bar
      if (a.fluxErrorMjy) {
        const yTop = getY(aFlux + a.fluxErrorMjy);
        const yBot = getY(Math.max(0, aFlux - a.fluxErrorMjy));
        ctx.strokeStyle = "#6ce5ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBot);
        ctx.stroke();
      }

      // Draw Cyan Diamond
      const size = 6;
      ctx.fillStyle = "#6ce5ff";
      ctx.strokeStyle = "#05060a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Band Label
      ctx.fillStyle = "#6ce5ff";
      ctx.font = "10.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(a.band.split(" ")[1] || a.band, x, Math.max(padTop + 26, y - 10));
    });
  }, [targetSpectra, selectedBandIndex, selectedDetector]);

  // Handle Canvas Mouse Hover
  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!targetSpectra || !canvasRef.current || !targetSpectra.sedPoints) return;
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

    const points = targetSpectra.sedPoints;
    const archival = targetSpectra.archivalPhotometry || [];
    const minLambda = 0.75;
    const maxLambda = 5.0;
    const lambdaSpan = maxLambda - minLambda;

    const allFluxes = [
      ...points.map((p: any) => p.fluxDensityMjy),
      ...archival.map((a: any) => a.fluxMjy ?? a.fluxDensityMjy ?? 0)
    ];
    const minFlux = Math.min(...allFluxes);
    const maxFlux = Math.max(...allFluxes) * 1.06;
    const fluxRange = Math.max(0.005, maxFlux - minFlux);

    const getX = (lambda: number) =>
      padLeft + ((lambda - minLambda) / lambdaSpan) * (width - padLeft - padRight);
    const getY = (flux: number) =>
      height - padBottom - ((flux - minFlux) / fluxRange) * (height - padTop - padBottom);

    let closest = null;
    let minDistance = 22;

    points.forEach((p: any) => {
      const px = getX(p.centerWavelengthUm);
      const py = getY(p.fluxDensityMjy);
      const dist = Math.hypot(px - mouseX, py - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...p, px, py };
      }
    });

    setHoveredPoint(closest);
  };

  const selectedBandObj =
    catalog?.bands?.find((b: any) => b.index === selectedBandIndex) ||
    catalog?.bands?.[0] ||
    {};
  const selectedSedPoint =
    targetSpectra?.sedPoints?.find((p: any) => p.bandIndex === selectedBandIndex) ||
    targetSpectra?.sedPoints?.[0] ||
    {};

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-semibold">
            102-Channel Spectroscopic Analyzer · 6 Detector Arrays (D1–D6)
          </span>
          <h3 className="mt-1 font-serif text-2xl sm:text-3xl text-slate-100">
            SPHEREx Near-Infrared Spectral Explorer ({targetSpectra?.spectralType || targetSpectra?.target?.spectralType || "SED"})
          </h3>
        </div>

        {/* Detector Array Quick Tabs */}
        <div className="flex flex-wrap rounded-xl border border-slate-800 bg-[#070b14] p-1 text-xs">
          {["all", "D1", "D2", "D3", "D4", "D5", "D6"].map((d) => (
            <button
              key={d}
              onClick={() => handleSelectDetector(d)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                selectedDetector === d
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:text-white"
              )}
            >
              {d === "all" ? "Full Spectrum (102 Ch)" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Canonical Data Classification & Resolving Power Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-4 font-mono text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-purple-300 font-bold">
            MODEL / SIMULATION
          </span>
          <span>Continuous 102-channel SPHEREx LVF spectral model anchored to</span>
          <span className="rounded-md bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-sky-300 font-bold">
            REAL OBSERVATION
          </span>
          <span>verified 2MASS, AllWISE & Spitzer archival broadband photometry (not 102 individually retrieved SPHEREx spectra).</span>
        </div>
        <span className="text-sky-300 font-semibold shrink-0">
          Resolving Power: D1–D3 (R≈41) · D4 (R≈35) · D5 (R≈110) · D6 (R≈130)
        </span>
      </div>

      {/* Main Canvas Spectrum Display */}
      <div className="relative rounded-xl border border-slate-800 bg-[#070b14] p-4 sm:p-5">
        {loading && (
          <div className="absolute top-3 right-4 z-20 font-mono text-xs text-amber-300">
            Syncing 102-channel SED...
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onClick={() => {
            if (hoveredPoint) setSelectedBandIndex(hoveredPoint.bandIndex);
          }}
          className="block h-[360px] w-full cursor-pointer rounded-lg"
        />

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2 text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> 102-Channel SPHEREx LVF Spectral Model (±1σ)
            </span>
            <span className="flex items-center gap-2 text-sky-300">
              <span className="h-2.5 w-2.5 rotate-45 bg-sky-400 inline-block" /> Verified Archival Photometry (2MASS / AllWISE / Spitzer)
            </span>
          </div>
          <span className="text-slate-400">Click any channel or scrub slider below to inspect channel telemetry</span>
        </div>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 rounded-xl border border-slate-700 bg-slate-950/95 p-3.5 shadow-xl backdrop-blur-md text-xs font-mono space-y-1"
            style={{
              left: Math.min(
                hoveredPoint.px + 12,
                canvasRef.current ? canvasRef.current.width - 250 : 300
              ),
              top: Math.max(10, hoveredPoint.py - 80)
            }}
          >
            <div className="font-bold text-amber-300">
              {hoveredPoint.bandName} (Channel #{hoveredPoint.bandIndex}/102)
            </div>
            <div className="text-white font-semibold">λ = {hoveredPoint.centerWavelengthUm} µm</div>
            <div className="text-slate-300">Resolving Power: R = {hoveredPoint.resolvingPower}</div>
            <div className="text-amber-400 font-semibold">
              Model Flux: {hoveredPoint.fluxDensityMjy} ± {hoveredPoint.fluxErrorMjy ?? 0.01} mJy
            </div>
            <div className="text-xs text-sky-300 pt-0.5">{hoveredPoint.diagnosticFeature}</div>
          </div>
        )}
      </div>

      {/* Selected Bandpass Prioritized 4-Metric Card & Scrubber */}
      {selectedBandObj && (
        <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-5 space-y-5">
          {/* Scrubber slider for all 102 bands */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-300 mb-2">
              <span>Ch 1 · 0.75 µm (D1, R≈41)</span>
              <span className="text-amber-300 font-bold">
                Scrub 102 SPHEREx LVF Channels — Active: #{selectedBandIndex} ({selectedBandObj.bandName})
              </span>
              <span>Ch 102 · 5.00 µm (D6, R≈130)</span>
            </div>
            <input
              type="range"
              min="1"
              max="102"
              value={selectedBandIndex}
              onChange={(e) => setSelectedBandIndex(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* 4 Prioritized Channel Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4">
              <p className="text-xs uppercase text-slate-400">Channel Wavelength (λ)</p>
              <p className="mt-1.5 text-lg sm:text-xl font-bold text-slate-100">
                {selectedBandObj.centerWavelengthUm} µm
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Window: {selectedBandObj.minWavelengthUm}–{selectedBandObj.maxWavelengthUm} µm
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4">
              <p className="text-xs uppercase text-slate-400">LVF Model Flux Density</p>
              <p className="mt-1.5 text-lg sm:text-xl font-bold text-amber-400">
                {selectedSedPoint.fluxDensityMjy} mJy
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ± {selectedSedPoint.fluxErrorMjy ?? 0.01} mJy (1σ model)
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4">
              <p className="text-xs uppercase text-slate-400">Resolving Power & Array</p>
              <p className="mt-1.5 text-lg sm:text-xl font-bold text-sky-300">
                R = {selectedBandObj.resolvingPower}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedBandObj.detectorName} (Δλ = {selectedBandObj.bandwidthUm} µm)
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4">
              <p className="text-xs uppercase text-slate-400">Primary Diagnostic Feature</p>
              <p className="mt-1.5 text-sm sm:text-base font-bold text-slate-100">
                {selectedBandObj.primaryFeatures || "Continuum Mapping"}
              </p>
              <p className="mt-1 text-xs text-emerald-400">
                Quality Flag: {selectedSedPoint.qualityFlag || "GOOD"}
              </p>
            </div>
          </div>

          {/* Collapsible Archival Photometry Calibration Anchor Details */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowChannelDetails(!showChannelDetails)}
              className="w-full flex items-center justify-between text-xs font-mono text-slate-300 hover:text-amber-300 py-1 cursor-pointer"
            >
              <span>
                {showChannelDetails
                  ? "▼ Hide Archival Broadband Calibration Anchors"
                  : "► View Archival Broadband Calibration Anchors (2MASS / AllWISE / Spitzer)"}
              </span>
              <span className="text-sky-300">
                {targetSpectra?.archivalPhotometry?.length || 0} Catalog Anchors
              </span>
            </button>

            {showChannelDetails && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
                {targetSpectra?.archivalPhotometry?.map((a: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-[#070b14] p-3">
                    <span className="text-sky-300 font-bold block">{a.band}</span>
                    <span className="text-slate-400 block mt-0.5">λ = {a.wavelengthUm} µm</span>
                    <span className="text-slate-100 font-semibold block mt-1">
                      {a.fluxMjy ?? a.fluxDensityMjy} ± {a.fluxErrorMjy} mJy
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
