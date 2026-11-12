import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { analyzeTargetMotion } from "../../lib/scientificFallback";

interface MotionViewerProps {
  targetId: string;
}

export default function MotionDetectionViewer({ targetId }: MotionViewerProps) {
  const [data, setData] = useState<any>(() => analyzeTargetMotion(targetId));
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fallback = analyzeTargetMotion(targetId);
    setData(fallback);
    setLoading(true);
    fetch(`/api/motion/${targetId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d && d.centroidHistory) {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [targetId]);

  // Render Trajectory Vector Plot on Canvas
  useEffect(() => {
    if (!data || !canvasRef.current || !data.centroidHistory) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 520);
    const height = (canvas.height = 360);

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, width, height);

    // Coordinate Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = width / 2;
    const centerY = height / 2;

    const history = data.centroidHistory;
    if (history.length > 0) {
      // Compute displacements in arcsec from Epoch 1 using spherical coordinate math
      const displacements = history.map((h: any) => {
        const dRaArcsec =
          (h.measuredRaDeg - history[0].measuredRaDeg) *
          Math.cos((h.measuredDecDeg * Math.PI) / 180) *
          3600;
        const dDecArcsec = (h.measuredDecDeg - history[0].measuredDecDeg) * 3600;
        return { dRaArcsec, dDecArcsec, ep: h };
      });

      const maxDisp = Math.max(
        0.5,
        ...displacements.map((d: any) => Math.hypot(d.dRaArcsec, d.dDecArcsec))
      );

      // Auto-scale display pixels per arcsecond so trajectory fits comfortably
      const pixelScale = maxDisp > 2 ? Math.min(24, 110 / maxDisp) : 20;
      const pixelBoxSize = 6.15 * pixelScale;

      // Draw SPHEREx 6.15"/px detector pixel scale reference box
      ctx.strokeStyle = "rgba(255, 138, 61, 0.32)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        centerX - pixelBoxSize / 2,
        centerY - pixelBoxSize / 2,
        pixelBoxSize,
        pixelBoxSize
      );
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 138, 61, 0.65)";
      ctx.font = "9.5px 'JetBrains Mono', monospace";
      ctx.fillText(
        "1 SPHEREx Pixel (6.15\" × 6.15\")",
        centerX - pixelBoxSize / 2,
        Math.max(16, centerY - pixelBoxSize / 2 - 8)
      );

      // Compass axes (N / E)
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(32, height - 24);
      ctx.lineTo(32, height - 56);
      ctx.moveTo(32, height - 24);
      ctx.lineTo(64, height - 24);
      ctx.stroke();
      ctx.fillStyle = "#8d93a1";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText("N (+Dec)", 18, height - 60);
      ctx.fillText("+RA", 68, height - 21);

      // Center trajectory around midpoint so full path stays inside canvas
      const midRa = displacements[displacements.length - 1].dRaArcsec / 2;
      const midDec = displacements[displacements.length - 1].dDecArcsec / 2;
      const originX = centerX - midRa * pixelScale;
      const originY = centerY + midDec * pixelScale;

      ctx.strokeStyle = "#ff8a3d";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const screenCoords: { x: number; y: number; ep: any; dRaArcsec: number; dDecArcsec: number }[] = [];

      displacements.forEach((d: any, i: number) => {
        const sx = originX + d.dRaArcsec * pixelScale;
        const sy = originY - d.dDecArcsec * pixelScale;
        screenCoords.push({ x: sx, y: sy, ep: d.ep, dRaArcsec: d.dRaArcsec, dDecArcsec: d.dDecArcsec });

        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Draw catalog Proper Motion Vector Prediction as dashed arrow
      if (data.gaiaReferenceAstrometry && screenCoords.length > 0) {
        const gaia = data.gaiaReferenceAstrometry;
        const totalYears =
          history[history.length - 1].yearDecimal - history[0].yearDecimal || 0.72;
        const predRaShift = (gaia.properMotionRaMasYr / 1000) * totalYears;
        const predDecShift = (gaia.properMotionDecMasYr / 1000) * totalYears;

        const start = screenCoords[0];
        const endX = start.x + predRaShift * pixelScale;
        const endY = start.y - predDecShift * pixelScale;

        ctx.strokeStyle = "rgba(155, 123, 255, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw points and 1-sigma astrometric uncertainty circles
      screenCoords.forEach((p, idx) => {
        const errPix = (p.ep.astrometricUncertaintyArcsec || 0.35) * pixelScale;
        ctx.strokeStyle = "rgba(108, 229, 255, 0.45)";
        ctx.fillStyle = "rgba(108, 229, 255, 0.08)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(5, errPix), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          idx === 0
            ? "#6ce5ff"
            : idx === screenCoords.length - 1
            ? "#ff8a3d"
            : "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Stagger epoch labels cleanly so low-PM stars don't overlap text
        const labelOffsetY = maxDisp < 0.5 ? (idx - 1) * 16 - 8 : idx % 2 === 0 ? -8 : 14;
        ctx.fillStyle = "#ece8e1";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(
          `${p.ep.epochId} (${p.ep.yearDecimal})`,
          Math.min(width - 135, Math.max(12, p.x + 10)),
          Math.min(height - 12, Math.max(18, p.y + labelOffsetY))
        );
      });
    }
  }, [data]);

  if (!data || !data.centroidHistory) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-2 p-8 text-center text-mist">
        No motion detection data available for target.
      </div>
    );
  }

  const catalogName = data.gaiaReferenceAstrometry?.catalog || "ESA Gaia DR3";

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            Astrometric Vector Engine · {catalogName}
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Multi-Epoch Motion Detection & Proper Motion
          </h3>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink px-3.5 py-1.5 font-mono text-xs">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              data.overallAssessment?.hasDetectedMotion
                ? "bg-ember shadow-[0_0_8px_#ff8a3d]"
                : "bg-ion"
            )}
          />
          <span className="text-bone">
            {data.overallAssessment?.statusLabel ||
              (data.overallAssessment?.hasDetectedMotion
                ? "Catalog Proper Motion Resolvable across SPHEREx Epochs"
                : "Stationary at SPHEREx 6.15″/px Scale")}
          </span>
        </div>
      </div>

      {/* Explicit Data Classification Banner */}
      <div className="mt-4 rounded-lg border border-ion/25 bg-ion/5 px-3.5 py-2 font-mono text-[11px] text-mist flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-ion">Methodology:</strong>{" "}
          {data.dataClassification ||
            `Spherical-coordinate trajectory propagated from verified ${catalogName} astrometry across SPHEREx QR2 observation epochs.`}
        </span>
        {loading && <span className="text-[10px] text-ember-soft">Syncing...</span>}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Canvas Plot */}
        <div className="lg:col-span-7 rounded-lg border border-white/10 bg-ink p-4 flex flex-col items-center">
          <div className="w-full flex justify-between font-mono text-[10px] text-mist mb-2">
            <span>Spherical ICRS Displacement Trajectory (ΔRA cos Dec, ΔDec)</span>
            <span className="text-ember-soft">
              Net Shift: {data.overallAssessment?.netDisplacementArcsec ?? 0}″ over{" "}
              {data.overallAssessment?.totalBaselineYears ?? 0} yr
            </span>
          </div>
          <canvas ref={canvasRef} className="h-[340px] w-full block" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-ion">
              <span className="h-2 w-2 rounded-full bg-ion" /> Propagated Epoch Centroids (±0.35″ SPHEREx 1σ)
            </span>
            <span className="flex items-center gap-1.5 text-nebula">
              <span className="h-2 w-2 rounded-full bg-nebula" /> {catalogName} Proper Motion Vector
            </span>
          </div>
        </div>

        {/* Quantitative Astrometric Measurements Table */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-white/10 bg-ink-3 p-5">
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-ember-soft font-semibold">
              Verified Astrometric Catalog & Multi-Epoch Metrics
            </h4>

            {/* Reference Catalog Stats */}
            <div className="mt-3 rounded border border-white/5 bg-ink/70 p-3 font-mono text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase text-mist">{catalogName}</p>
                <span className="text-[10px] text-ion">{data.gaiaReferenceAstrometry?.sourceId}</span>
              </div>
              <div className="flex justify-between text-bone">
                <span>Total Proper Motion (μ):</span>
                <span className="text-ember font-semibold">
                  {data.gaiaReferenceAstrometry?.totalProperMotionArcsecYr}″ / yr
                </span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>μ_α cos(δ):</span>
                <span className="text-bone">
                  {data.gaiaReferenceAstrometry?.properMotionRaMasYr} mas/yr
                </span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>μ_δ:</span>
                <span className="text-bone">
                  {data.gaiaReferenceAstrometry?.properMotionDecMasYr} mas/yr
                </span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>Position Angle (θ):</span>
                <span className="text-bone">
                  {data.gaiaReferenceAstrometry?.positionAngleDeg}° (E of N)
                </span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>Parallax (π):</span>
                <span className="text-bone">
                  {data.gaiaReferenceAstrometry?.parallaxMas} mas
                </span>
              </div>
            </div>

            {/* SPHEREx Multi-Epoch Vector Breakdown */}
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase text-mist mb-2">
                Epoch-to-Epoch Displacement Breakdown
              </p>
              <div className="space-y-2">
                {data.motionVectors?.map((v: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded border border-white/10 bg-ink p-2.5 font-mono text-xs"
                  >
                    <div className="flex justify-between items-center text-bone">
                      <span className="text-ember-soft font-semibold">
                        {v.fromEpoch} → {v.toEpoch}
                      </span>
                      <span className="text-[10px] text-mist">Δt = {v.dtYears} yr</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-mist">
                      <span>Angular Shift:</span>
                      <span className="text-bone">
                        {v.measuredDisplacementArcsec}″ ({v.pixelShiftSPHEREx ?? (v.measuredDisplacementArcsec / 6.15).toFixed(3)} px)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-mist">
                      <span>Catalog Velocity:</span>
                      <span className="text-ember font-medium">
                        {v.measuredVelocityArcsecYr}″ / yr
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-mist">
                      <span>SPHEREx Centroid SNR:</span>
                      <span
                        className={cn(
                          v.significanceSigma >= 3 ? "text-ember font-bold" : "text-mist"
                        )}
                      >
                        {v.significanceSigma}σ ({v.confidenceDescription.split(" (")[0]})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-white/10 font-mono text-[9.5px] text-mist leading-relaxed">
            {data.overallAssessment?.instrumentResolutionConstraint}
          </p>
        </div>
      </div>
    </div>
  );
}
