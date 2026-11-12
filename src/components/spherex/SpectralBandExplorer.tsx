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

    const width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    const height = (canvas.height = 350);
    const padLeft = 65;
    const padRight = 30;
    const padTop = 32;
    const padBottom = 45;

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

      ctx.fillStyle = isSelectedDet ? "#ffc08a" : "rgba(255, 255, 255, 0.35)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${d.id} (${d.r})`, (x1 + x2) / 2, padTop + 14);
    });

    // Draw Grid & Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    // Horizontal Y Grid (Flux)
    const yTicks = 5;
    ctx.fillStyle = "#8d93a1";
    ctx.font = "10px 'JetBrains Mono', monospace";
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
      ctx.fillText(`${wl}µm`, x, height - padBottom + 16);
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
    ctx.lineWidth = 2;
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
      ctx.arc(x, y, isSelected ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#ff8a3d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
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
      const size = 5.5;
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
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(a.band.split(" ")[1] || a.band, x, Math.max(padTop + 24, y - 9));
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
    const padLeft = 65;
    const padRight = 30;
    const padTop = 32;
    const padBottom = 45;

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
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            102-Channel Spectroscopic Analyzer · 6 Detector Arrays (D1–D6)
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            SPHEREx Near-Infrared Spectral Explorer ({targetSpectra?.spectralType || targetSpectra?.target?.spectralType || "SED"})
          </h3>
        </div>

        {/* Detector Array Quick Tabs */}
        <div className="flex flex-wrap rounded-lg border border-white/10 bg-ink p-1 text-xs">
          {["all", "D1", "D2", "D3", "D4", "D5", "D6"].map((d) => (
            <button
              key={d}
              onClick={() => handleSelectDetector(d)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                selectedDetector === d
                  ? "bg-ember text-ink font-bold"
                  : "text-mist hover:text-bone"
              )}
            >
              {d === "all" ? "Full Spectrum (102 Ch)" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Provenance & Resolving Power Banner */}
      <div className="mt-4 rounded-lg border border-white/10 bg-ink-3 px-4 py-2.5 font-mono text-[11px] text-mist flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-ember-soft">Spectral Model & Anchors:</strong>{" "}
          {targetSpectra?.dataClassification ||
            "102-channel SPHEREx LVF spectrophotometric model anchored to verified 2MASS, AllWISE, and Spitzer archival broadband photometry."}
        </span>
        <span className="text-ion">
          Resolving Power: D1–D3 (R≈41) · D4 (R≈35) · D5 (R≈110) · D6 (R≈130)
        </span>
      </div>

      {/* Main Canvas Spectrum Display */}
      <div className="relative mt-4 rounded-lg border border-white/10 bg-ink p-4">
        {loading && (
          <div className="absolute top-3 right-4 z-20 font-mono text-[10px] text-ember-soft">
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
          className="block h-[350px] w-full cursor-pointer"
        />

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-mist">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-ember">
              <span className="h-2 w-2 rounded-full bg-ember" /> 102-Channel SPHEREx LVF Spectral Model (±1σ)
            </span>
            <span className="flex items-center gap-1.5 text-ion">
              <span className="h-2 w-2 rotate-45 bg-ion inline-block" /> Verified Archival Photometry (2MASS / AllWISE / Spitzer)
            </span>
          </div>
          <span>Click any channel or scrub below to inspect channel telemetry</span>
        </div>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 rounded-md border border-white/20 bg-ink-2/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono"
            style={{
              left: Math.min(
                hoveredPoint.px + 12,
                canvasRef.current ? canvasRef.current.width - 240 : 300
              ),
              top: Math.max(10, hoveredPoint.py - 75)
            }}
          >
            <div className="font-semibold text-ember-soft">
              {hoveredPoint.bandName} (Channel #{hoveredPoint.bandIndex}/102)
            </div>
            <div className="text-white mt-1">λ = {hoveredPoint.centerWavelengthUm} µm</div>
            <div className="text-mist">Resolving Power: R = {hoveredPoint.resolvingPower}</div>
            <div className="text-ember font-medium mt-1">
              Flux: {hoveredPoint.fluxDensityMjy} ± {hoveredPoint.fluxErrorMjy ?? 0.01} mJy
            </div>
            <div className="text-[10px] text-bone mt-0.5">
              Quality Flag: <span className="text-ion">{hoveredPoint.qualityFlag || "GOOD"}</span>
            </div>
            <div className="text-[10px] text-ion mt-1">{hoveredPoint.diagnosticFeature}</div>
          </div>
        )}
      </div>

      {/* Selected Bandpass Detail Card */}
      {selectedBandObj && (
        <div className="mt-5 rounded-lg border border-white/10 bg-ink-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase text-mist">
                Selected Spectral Channel #{selectedBandObj.index} of 102
              </span>
              <h4 className="mt-1 font-mono text-lg text-ember font-bold">
                {selectedBandObj.bandName} · λ = {selectedBandObj.centerWavelengthUm} µm ·{" "}
                {selectedSedPoint.fluxDensityMjy} ± {selectedSedPoint.fluxErrorMjy ?? 0.01} mJy
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-mist">
              <div>
                Bandwidth: <span className="text-bone">{selectedBandObj.bandwidthUm} µm</span>
              </div>
              <div>
                Resolving Power: <span className="text-bone">R = {selectedBandObj.resolvingPower}</span>
              </div>
              <div>
                Quality Flag:{" "}
                <span className="text-ion font-semibold">
                  {selectedSedPoint.qualityFlag || "GOOD"}
                </span>
              </div>
              <div>
                Detector:{" "}
                <span className="text-ember-soft font-semibold">{selectedBandObj.detectorName}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
            <div>
              <p className="text-mist text-[10px] uppercase">Primary Diagnostic Features</p>
              <p className="mt-1 text-bone font-medium">
                {selectedBandObj.primaryFeatures || "Continuum mapping"}
              </p>
            </div>
            <div>
              <p className="text-mist text-[10px] uppercase">Channel Wavelength Window</p>
              <p className="mt-1 text-ion">
                {selectedBandObj.minWavelengthUm} µm – {selectedBandObj.maxWavelengthUm} µm
              </p>
            </div>
            <div>
              <p className="text-mist text-[10px] uppercase">Archival Calibration Anchor</p>
              <p className="mt-1 text-bone">
                {targetSpectra?.archivalPhotometry
                  ?.map((a: any) => `${a.band}: ${a.fluxMjy ?? a.fluxDensityMjy} mJy`)
                  .slice(0, 2)
                  .join(" · ") || "2MASS / AllWISE"}
              </p>
            </div>
          </div>

          {/* Scrubber slider for all 102 bands */}
          <div className="mt-5 pt-3 border-t border-white/10">
            <div className="flex justify-between font-mono text-[10px] text-mist mb-1">
              <span>Ch 1 · 0.75 µm (D1, R≈41)</span>
              <span className="text-ember font-bold">
                Scrub 102 SPHEREx LVF Channels (Current: #{selectedBandIndex})
              </span>
              <span>Ch 102 · 5.00 µm (D6, R≈130)</span>
            </div>
            <input
              type="range"
              min="1"
              max="102"
              value={selectedBandIndex}
              onChange={(e) => setSelectedBandIndex(parseInt(e.target.value, 10))}
              className="w-full accent-ember cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
