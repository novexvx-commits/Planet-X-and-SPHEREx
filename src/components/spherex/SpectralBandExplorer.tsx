import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

interface SpectralExplorerProps {
  targetId: string;
}

export default function SpectralBandExplorer({ targetId }: SpectralExplorerProps) {
  const [catalog, setCatalog] = useState<any>(null);
  const [targetSpectra, setTargetSpectra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetector, setSelectedDetector] = useState<string>("all");
  const [selectedBandIndex, setSelectedBandIndex] = useState<number>(1);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch spectral catalog and target SED
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/spectra/catalog").then((r) => r.json()),
      fetch(`/api/spectra/${targetId}`).then((r) => r.json())
    ])
      .then(([cat, spec]) => {
        setCatalog(cat);
        setTargetSpectra(spec);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load spectral data:", err);
        setLoading(false);
      });
  }, [targetId]);

  // Render Interactive Canvas SED (Spectral Energy Distribution)
  useEffect(() => {
    if (!targetSpectra || !canvasRef.current || !targetSpectra.sedPoints) return;
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

    const points = targetSpectra.sedPoints;
    const minLambda = 0.75;
    const maxLambda = 5.00;
    const lambdaSpan = maxLambda - minLambda;

    const fluxes = points.map((p: any) => p.fluxDensityMjy);
    const minFlux = Math.min(...fluxes);
    const maxFlux = Math.max(...fluxes);
    const fluxRange = Math.max(0.01, maxFlux - minFlux);

    const getX = (lambda: number) => padLeft + ((lambda - minLambda) / lambdaSpan) * (width - padLeft - padRight);
    const getY = (flux: number) => height - padBottom - ((flux - minFlux) / fluxRange) * (height - padTop - padBottom);

    // Draw detector array shading across background
    const detectorSpans = [
      { id: "D1", min: 0.75, max: 1.11, color: "rgba(108, 229, 255, 0.05)" },
      { id: "D2", min: 1.11, max: 1.64, color: "rgba(155, 123, 255, 0.05)" },
      { id: "D3", min: 1.64, max: 2.42, color: "rgba(184, 164, 255, 0.05)" },
      { id: "D4", min: 2.42, max: 3.82, color: "rgba(255, 192, 138, 0.05)" },
      { id: "D5", min: 3.82, max: 4.42, color: "rgba(255, 138, 61, 0.06)" },
      { id: "D6", min: 4.42, max: 5.00, color: "rgba(226, 85, 46, 0.07)" }
    ];

    detectorSpans.forEach((d) => {
      const x1 = getX(d.min);
      const x2 = getX(d.max);
      ctx.fillStyle = d.color;
      ctx.fillRect(x1, padTop, x2 - x1, height - padTop - padBottom);

      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(d.id, (x1 + x2) / 2, padTop + 14);
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
      ctx.fillText(flux.toFixed(flux < 1 ? 3 : 1), padLeft - 8, y + 3);
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
    ctx.fillText("Wavelength λ (microns, µm) — SPHEREx 0.75 to 5.00 µm Coverage", width / 2, height - 10);

    // Draw Continuous Spectrum Line
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

    // Draw Individual 102 Band Points
    points.forEach((p: any) => {
      const x = getX(p.centerWavelengthUm);
      const y = getY(p.fluxDensityMjy);
      const isSelected = p.bandIndex === selectedBandIndex;

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
    });
  }, [targetSpectra, selectedBandIndex]);

  // Handle Canvas Mouse Hover
  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!targetSpectra || !canvasRef.current || !targetSpectra.sedPoints) return;
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

    const points = targetSpectra.sedPoints;
    const minLambda = 0.75;
    const maxLambda = 5.00;
    const lambdaSpan = maxLambda - minLambda;

    const fluxes = points.map((p: any) => p.fluxDensityMjy);
    const minFlux = Math.min(...fluxes);
    const maxFlux = Math.max(...fluxes);
    const fluxRange = Math.max(0.01, maxFlux - minFlux);

    const getX = (lambda: number) => padLeft + ((lambda - minLambda) / lambdaSpan) * (width - padLeft - padRight);
    const getY = (flux: number) => height - padBottom - ((flux - minFlux) / fluxRange) * (height - padTop - padBottom);

    let closest = null;
    let minDistance = 20;

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

  const selectedBandObj = catalog?.bands?.find((b: any) => b.index === selectedBandIndex) || catalog?.bands?.[0] || {};

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            102-Band Spectroscopic Analyzer
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            SPHEREx Near-Infrared Spectral Explorer
          </h3>
        </div>

        {/* Detector Array Quick Tabs */}
        <div className="flex flex-wrap rounded-lg border border-white/10 bg-ink p-1 text-xs">
          {["all", "D1", "D2", "D3", "D4", "D5", "D6"].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDetector(d)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                selectedDetector === d ? "bg-ember text-ink font-bold" : "text-mist hover:text-bone"
              )}
            >
              {d === "all" ? "Full Spectrum" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Spectrum Display */}
      <div className="relative mt-4 rounded-lg border border-white/10 bg-ink p-4">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/75 backdrop-blur-xs">
            <span className="font-mono text-xs text-ember-soft animate-pulse">
              Synthesizing 102-channel spectrophotometric profile...
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseMove={onCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onClick={() => {
            if (hoveredPoint) setSelectedBandIndex(hoveredPoint.bandIndex);
          }}
          className="block h-[340px] w-full cursor-pointer"
        />

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-30 rounded-md border border-white/20 bg-ink-2/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono"
            style={{
              left: Math.min(hoveredPoint.px + 12, canvasRef.current ? canvasRef.current.width - 220 : 300),
              top: Math.max(10, hoveredPoint.py - 60)
            }}
          >
            <div className="font-semibold text-ember-soft">{hoveredPoint.bandName}</div>
            <div className="text-white mt-1">λ = {hoveredPoint.centerWavelengthUm} µm</div>
            <div className="text-mist">Resolving Power: R ~ {hoveredPoint.resolvingPower}</div>
            <div className="text-ember font-medium mt-1">Flux: {hoveredPoint.fluxDensityMjy} mJy</div>
            <div className="text-[10px] text-ion mt-1">{hoveredPoint.diagnosticFeature}</div>
          </div>
        )}
      </div>

      {/* Selected Bandpass Detail Card */}
      {selectedBandObj && (
        <div className="mt-6 rounded-lg border border-white/10 bg-ink-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase text-mist">
                Selected Spectral Channel #{selectedBandObj.index} of 102
              </span>
              <h4 className="mt-1 font-mono text-lg text-ember font-bold">
                {selectedBandObj.bandName} · λ = {selectedBandObj.centerWavelengthUm} µm
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-mist">
              <div>
                Bandwidth: <span className="text-bone">{selectedBandObj.bandwidthUm} µm</span>
              </div>
              <div>
                Resolving Power: <span className="text-bone">R = {selectedBandObj.resolvingPower}</span>
              </div>
              <div>
                Detector: <span className="text-ember-soft font-semibold">{selectedBandObj.detectorName}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
            <div>
              <p className="text-mist text-[10px] uppercase">Primary Diagnostic Features</p>
              <p className="mt-1 text-bone font-medium">{selectedBandObj.primaryFeatures || "Continuum mapping"}</p>
            </div>
            <div>
              <p className="text-mist text-[10px] uppercase">Scientific Wavelength Window</p>
              <p className="mt-1 text-ion">
                {selectedBandObj.minWavelengthUm} µm – {selectedBandObj.maxWavelengthUm} µm
              </p>
            </div>
          </div>

          {/* Scrubber slider for all 102 bands */}
          <div className="mt-5 pt-3 border-t border-white/10">
            <div className="flex justify-between font-mono text-[10px] text-mist mb-1">
              <span>0.75 µm (Array 1)</span>
              <span className="text-ember font-bold">Scrub 102 Channels</span>
              <span>5.00 µm (Array 6)</span>
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

