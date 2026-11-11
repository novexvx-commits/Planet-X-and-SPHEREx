import { useEffect, useRef, useState } from "react";
import { Arrow } from "../ui";
import { cn } from "../../utils/cn";

interface MotionViewerProps {
  targetId: string;
}

export default function MotionDetectionViewer({ targetId }: MotionViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/motion/${targetId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Motion fetch failed:", err);
        setLoading(false);
      });
  }, [targetId]);

  // Render Trajectory Vector Plot on Canvas
  useEffect(() => {
    if (!data || !canvasRef.current || !data.centroidHistory) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width = canvas.parentElement?.clientWidth || 500;
    const height = canvas.height = 360;

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

    // Draw detector pixel scale indicator (6.2 arcsec / pixel)
    ctx.strokeStyle = "rgba(255, 138, 61, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(centerX - 50, centerY - 50, 100, 100);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 138, 61, 0.5)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText("1 SPHEREx Pixel (6.2\")", centerX - 45, centerY - 55);

    // Plot Centroid History & Trajectory
    const history = data.centroidHistory;
    if (history.length > 0) {
      // Find min and max RA / Dec to auto-scale plot
      const pixelScale = 22; // display pixels per arcsec

      ctx.strokeStyle = "#ff8a3d";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const screenCoords: { x: number; y: number; ep: any }[] = [];

      history.forEach((h: any, i: number) => {
        // Delta from initial epoch in arcseconds
        const dRaArcsec = (h.measuredRaDeg - history[0].measuredRaDeg) * Math.cos((h.measuredDecDeg * Math.PI) / 180) * 3600;
        const dDecArcsec = (h.measuredDecDeg - history[0].measuredDecDeg) * 3600;

        const sx = centerX + dRaArcsec * pixelScale;
        const sy = centerY - dDecArcsec * pixelScale;
        screenCoords.push({ x: sx, y: sy, ep: h });

        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Draw points and uncertainty circles
      screenCoords.forEach((p, idx) => {
        // Uncertainty radius
        const errPix = p.ep.astrometricUncertaintyArcsec * pixelScale;
        ctx.strokeStyle = "rgba(108, 229, 255, 0.4)";
        ctx.fillStyle = "rgba(108, 229, 255, 0.08)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, errPix), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Centroid Point
        ctx.fillStyle = idx === 0 ? "#6ce5ff" : idx === screenCoords.length - 1 ? "#ff8a3d" : "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label Epoch
        ctx.fillStyle = "#ece8e1";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(`${p.ep.epochId} (${p.ep.yearDecimal})`, p.x + 8, p.y - 4);
      });

      // Draw Gaia Proper Motion Vector Prediction as dashed arrow
      if (data.gaiaReferenceAstrometry) {
        const gaia = data.gaiaReferenceAstrometry;
        const totalYears = (history[history.length - 1].yearDecimal - history[0].yearDecimal) || 0.72;
        const predRaShift = (gaia.properMotionRaMasYr / 1000) * totalYears;
        const predDecShift = (gaia.properMotionDecMasYr / 1000) * totalYears;

        const start = screenCoords[0];
        const endX = start.x + predRaShift * pixelScale;
        const endY = start.y - predDecShift * pixelScale;

        ctx.strokeStyle = "rgba(155, 123, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#9b7bff";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("Gaia DR3 Astrometric Prediction", endX + 8, endY + 4);
      }
    }
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-2 p-8 text-center">
        <p className="font-mono text-xs text-ember-soft animate-pulse">
          Analyzing multi-epoch astrometric centroids and proper motion vectors...
        </p>
      </div>
    );
  }

  if (!data || !data.centroidHistory) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-2 p-8 text-center text-mist">
        No motion detection data available for target.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            Astrometric Vector Engine
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Multi-Epoch Motion Detection & Proper Motion
          </h3>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink px-3 py-1 font-mono text-xs">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              data.overallAssessment?.hasDetectedMotion ? "bg-ember shadow-[0_0_8px_#ff8a3d]" : "bg-mist"
            )}
          />
          <span className="text-bone">
            {data.overallAssessment?.hasDetectedMotion ? "Physical Motion Confirmed (>5σ)" : "Static Field / Low Motion"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Canvas Plot */}
        <div className="lg:col-span-7 rounded-lg border border-white/10 bg-ink p-4 flex flex-col items-center">
          <div className="w-full flex justify-between font-mono text-[10px] text-mist mb-2">
            <span>Astrometric Displacement Trajectory (ICRS)</span>
            <span className="text-ember-soft">SPHEREx QR2 Centroiding</span>
          </div>
          <canvas ref={canvasRef} className="h-[340px] w-full block" />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-ion">
              <span className="h-2 w-2 rounded-full bg-ion" /> Measured SPHEREx Centroids (±1σ)
            </span>
            <span className="flex items-center gap-1.5 text-nebula">
              <span className="h-2 w-2 rounded-full bg-nebula" /> Gaia DR3 Reference Vector
            </span>
          </div>
        </div>

        {/* Quantitative Astrometric Measurements Table */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-white/10 bg-ink-3 p-5">
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-ember-soft font-semibold">
              Measured Motion Metrics
            </h4>

            {/* Gaia DR3 Reference Stats */}
            <div className="mt-4 rounded border border-white/5 bg-ink/70 p-3 font-mono text-xs space-y-1.5">
              <p className="text-[10px] uppercase text-mist">Gaia DR3 Reference Astrometry</p>
              <div className="flex justify-between text-bone">
                <span>Total Proper Motion:</span>
                <span className="text-ember font-semibold">{data.gaiaReferenceAstrometry?.totalProperMotionArcsecYr || 0}" / yr</span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>μ_RA cos(Dec):</span>
                <span>{data.gaiaReferenceAstrometry?.properMotionRaMasYr} mas/yr</span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>μ_Dec:</span>
                <span>{data.gaiaReferenceAstrometry?.properMotionDecMasYr} mas/yr</span>
              </div>
              <div className="flex justify-between text-mist text-[11px]">
                <span>Position Angle:</span>
                <span>{data.gaiaReferenceAstrometry?.positionAngleDeg}° (E of N)</span>
              </div>
            </div>

            {/* SPHEREx Multi-Epoch Vector Breakdown */}
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase text-mist mb-2">SPHEREx Measured Vectors</p>
              <div className="space-y-2">
                {data.motionVectors?.map((v: any, idx: number) => (
                  <div key={idx} className="rounded border border-white/10 bg-ink p-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center text-bone">
                      <span className="text-ember-soft font-semibold">{v.fromEpoch} → {v.toEpoch}</span>
                      <span className="text-[10px] text-mist">Δt = {v.dtYears} yr</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-mist">
                      <span>Displacement:</span>
                      <span className="text-bone">{v.measuredDisplacementArcsec} arcsec</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-mist">
                      <span>Velocity:</span>
                      <span className="text-ember font-medium">{v.measuredVelocityArcsecYr}" / yr</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-mist">
                      <span>Significance:</span>
                      <span className={cn(v.significanceSigma >= 5 ? "text-ember font-bold" : "text-mist")}>
                        {v.significanceSigma}σ ({v.confidenceDescription.split(" ")[0]})
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

