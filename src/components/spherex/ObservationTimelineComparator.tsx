import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import {
  compareObservations,
  getLocalTargetById,
  formatMjd,
  formatElapsedDays
} from "../../lib/scientificFallback";

interface ObservationTimelineProps {
  targetId: string;
  targetName: string;
  target?: any;
  observations: any[];
}

export default function ObservationTimelineComparator({
  targetId,
  targetName,
  target,
  observations
}: ObservationTimelineProps) {
  const activeTarget = { ...getLocalTargetById(targetId), ...(target || {}) };
  const obsCount = observations.length;
  const hasMultipleEpochs = obsCount >= 2;

  // Timeline state: default to latest observation so Epoch 1 (index 0) vs Epoch 2 (currentIndex) spans the full baseline
  const [currentIndex, setCurrentIndex] = useState<number>(() => Math.max(0, obsCount - 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Comparison mode: "difference" | "blink" | "side-by-side"
  const [comparisonMode, setComparisonMode] = useState<"difference" | "blink" | "side-by-side">("difference");
  const [blinkActiveEpoch, setBlinkActiveEpoch] = useState<1 | 2>(1);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2);
  const [activeColormap, setActiveColormap] = useState<"infrared" | "greyscale" | "inferno">("infrared");

  // Reset currentIndex to the last observation whenever target or observation list changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, observations.length - 1));
  }, [targetId, observations.length]);

  const epoch1Index = 0;
  const epoch2Index = currentIndex > 0 ? currentIndex : Math.max(0, obsCount - 1);

  const obs1 = observations[epoch1Index] || null;
  const obs2 = observations[epoch2Index] || null;
  const currentObs = observations[currentIndex] || obs2 || obs1 || {};

  // Compute instant local comparison so canvas is NEVER blank or uninitialized
  const localComparison = useMemo(() => {
    if (!hasMultipleEpochs || !obs1 || !obs2) return null;
    try {
      return compareObservations({
        targetId,
        obs1: {
          obsId: obs1.obs_id || obs1.obsId || "SPHEREx-EP1",
          bandpass: obs1.energy_bandpassname || obs1.bandpass || "SPHEREx-D2",
          mjd: parseFloat(obs1.t_min || obs1.mjd) || 60850,
          utcDate: obs1.utcDate || obs1.obs_release_date,
          centerRa: parseFloat(obs1.s_ra || obs1.centerRa) || activeTarget.raDeg,
          centerDec: parseFloat(obs1.s_dec || obs1.centerDec) || activeTarget.decDeg
        },
        obs2: {
          obsId: obs2.obs_id || obs2.obsId || "SPHEREx-EP2",
          bandpass: obs2.energy_bandpassname || obs2.bandpass || "SPHEREx-D2",
          mjd: parseFloat(obs2.t_min || obs2.mjd) || 61160,
          utcDate: obs2.utcDate || obs2.obs_release_date,
          centerRa: parseFloat(obs2.s_ra || obs2.centerRa) || activeTarget.raDeg,
          centerDec: parseFloat(obs2.s_dec || obs2.centerDec) || activeTarget.decDeg
        },
        cutoutSize: 32
      });
    } catch {
      return null;
    }
  }, [targetId, obs1, obs2, hasMultipleEpochs, activeTarget.raDeg, activeTarget.decDeg]);

  const [apiComparisonData, setApiComparisonData] = useState<any>(null);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; val: number | null } | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const comparisonData = apiComparisonData || localComparison;

  // Playback timer (only enabled when >= 2 epochs exist)
  useEffect(() => {
    if (!isPlaying || !hasMultipleEpochs) return;
    const intervalMs = Math.round(700 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next >= obsCount ? 1 : next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, obsCount, hasMultipleEpochs]);

  // Blink timer
  useEffect(() => {
    if (comparisonMode !== "blink" || !hasMultipleEpochs) return;
    const intervalMs = Math.round(1000 / (blinkSpeedHz * 2));
    const timer = setInterval(() => {
      setBlinkActiveEpoch((prev) => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [comparisonMode, blinkSpeedHz, hasMultipleEpochs]);

  const obs1Id = obs1?.obs_id || obs1?.obsId || "";
  const obs2Id = obs2?.obs_id || obs2?.obsId || "";

  // Sync comparison data with backend API when epochs change
  useEffect(() => {
    setApiComparisonData(null);
    if (!hasMultipleEpochs || !obs1Id || !obs2Id) return;

    let active = true;
    const id1 = encodeURIComponent(obs1Id);
    const id2 = encodeURIComponent(obs2Id);
    fetch(`/api/image-compare?targetId=${encodeURIComponent(targetId)}&obsId1=${id1}&obsId2=${id2}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && data.differenceAnalysis) {
          setApiComparisonData(data);
        }
      })
      .catch(() => {
        // Keep localComparison
      });

    return () => {
      active = false;
    };
  }, [targetId, epoch1Index, epoch2Index, obs1Id, obs2Id, hasMultipleEpochs]);

  // Canvas rendering helper for cutouts and difference residual map
  const renderCutoutToCanvas = (
    canvas: HTMLCanvasElement | null,
    pixelValues: number[] | undefined,
    fallbackRgba: number[] | undefined,
    width: number,
    height: number,
    isDiff = false
  ) => {
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!pixelValues || pixelValues.length === 0) {
      if (fallbackRgba && fallbackRgba.length > 0) {
        const imgData = new ImageData(new Uint8ClampedArray(fallbackRgba), width, height);
        ctx.putImageData(imgData, 0, 0);
      }
      return;
    }

    const rgba = new Uint8ClampedArray(width * height * 4);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pixelValues.length; i++) {
      if (pixelValues[i] < min) min = pixelValues[i];
      if (pixelValues[i] > max) max = pixelValues[i];
    }
    const range = Math.max(1e-5, max - min);
    const maxAbs = Math.max(Math.abs(min), Math.abs(max), 0.25);

    for (let i = 0; i < pixelValues.length; i++) {
      const val = pixelValues[i];
      if (isDiff) {
        // Auto-scaled diverging residual colormap: negative is cyan, zero is dark slate, positive is warm amber
        const norm = Math.max(-1, Math.min(1, val / maxAbs));
        let r = 10, g = 14, b = 24;
        if (norm < -0.04) {
          const k = Math.pow(Math.abs(norm), 0.75);
          r = Math.round(14 + 60 * k);
          g = Math.round(20 + 195 * k);
          b = Math.round(35 + 220 * k);
        } else if (norm > 0.04) {
          const k = Math.pow(norm, 0.75);
          r = Math.round(20 + 235 * k);
          g = Math.round(18 + 145 * k);
          b = Math.round(24 + 35 * k);
        }
        const pIdx = i * 4;
        rgba[pIdx] = r;
        rgba[pIdx + 1] = g;
        rgba[pIdx + 2] = b;
        rgba[pIdx + 3] = 255;
        continue;
      }

      let norm = (val - min) / range;
      norm = Math.asinh(6.0 * norm) / Math.asinh(6.0);
      const intensity = Math.min(255, Math.max(0, Math.round(norm * 255)));

      let r = 0, g = 0, b = 0;
      if (activeColormap === "greyscale") {
        r = g = b = intensity;
      } else if (activeColormap === "inferno") {
        const t = intensity / 255;
        r = Math.round(255 * Math.sqrt(t));
        g = Math.round(255 * (t * t));
        b = Math.round(255 * Math.sin(t * Math.PI));
      } else {
        const t = intensity / 255;
        if (t < 0.35) {
          const k = t / 0.35;
          r = Math.round(12 + 50 * k);
          g = Math.round(16 + 35 * k);
          b = Math.round(28 + 110 * k);
        } else if (t < 0.75) {
          const k = (t - 0.35) / 0.40;
          r = Math.round(62 + 185 * k);
          g = Math.round(51 + 95 * k);
          b = Math.round(138 - 80 * k);
        } else {
          const k = (t - 0.75) / 0.25;
          r = 255;
          g = Math.round(146 + 109 * k);
          b = Math.round(58 + 197 * k);
        }
      }

      const pIdx = i * 4;
      rgba[pIdx] = r;
      rgba[pIdx + 1] = g;
      rgba[pIdx + 2] = b;
      rgba[pIdx + 3] = 255;
    }

    const imgData = new ImageData(rgba, width, height);
    ctx.putImageData(imgData, 0, 0);
  };

  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!comparisonData) return;
    if (comparisonData.epoch1?.frame) {
      renderCutoutToCanvas(
        canvas1Ref.current,
        comparisonData.epoch1.frame.pixelValues,
        comparisonData.epoch1.frame.rgbaData,
        32,
        32
      );
    }
    if (comparisonData.epoch2?.frame) {
      renderCutoutToCanvas(
        canvas2Ref.current,
        comparisonData.epoch2.frame.pixelValues,
        comparisonData.epoch2.frame.rgbaData,
        32,
        32
      );
    }
    if (comparisonData.differenceAnalysis) {
      renderCutoutToCanvas(
        canvasDiffRef.current,
        comparisonData.differenceAnalysis.diffPixels,
        comparisonData.differenceAnalysis.diffRgba,
        32,
        32,
        true
      );
    }
  }, [comparisonData, activeColormap, comparisonMode, blinkActiveEpoch]);

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, framePixels?: number[]) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 32);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 32);

    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      const idx = y * 32 + x;
      const val = framePixels ? framePixels[idx] : null;
      setHoverPixel({ x, y, val });
    }
  };

  const onCanvasMouseLeave = () => {
    setHoverPixel(null);
  };

  const diffAnalysis = comparisonData?.differenceAnalysis;
  const isProperMotionTarget = diffAnalysis?.phenomenonType === "proper-motion" || activeTarget.totalProperMotionArcsecYr > 1.0;

  // Consistent MJD & Elapsed Days formatting (MJD 60902.9 to 61164.9 -> Δt = 262.0 days)
  const rawMjd1 = obs1 ? Number(obs1.t_min || obs1.mjd) : 0;
  const rawMjd2 = obs2 ? Number(obs2.t_min || obs2.mjd) : 0;
  const formattedMjd1 = obs1 ? formatMjd(rawMjd1, 1) : "N/A";
  const formattedMjd2 = obs2 ? formatMjd(rawMjd2, 1) : "N/A";
  const formattedDeltaDays =
    diffAnalysis?.baselineDaysFormatted ||
    (obs1 && obs2 ? formatElapsedDays(rawMjd1, rawMjd2, 1) : "0.0");

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      {/* ═════════════════════════════════════════════════════════════════════
          LEFT AREA (HERO VIEWPORT & TIMELINE - 8 COLUMNS)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="xl:col-span-8 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-5 sm:p-6 shadow-xl">
        {/* TOP BAR: Clean Mode Toggle & Color Style */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl bg-[#070b14] p-1 border border-slate-800">
            {[
              { id: "difference", label: "⚡ Difference View", desc: "Background-subtracted residual" },
              { id: "blink", label: "🔄 Blink Animation", desc: "Alternates Epoch 1 & Epoch 2" },
              { id: "side-by-side", label: "↔ Side by Side", desc: "Compare two survey passes" }
            ].map((m) => (
              <button
                key={m.id}
                disabled={!hasMultipleEpochs}
                onClick={() => setComparisonMode(m.id as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  comparisonMode === m.id
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-300 hover:text-white"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-[#070b14] p-1 border border-slate-800 text-xs">
            <span className="text-slate-400 text-xs font-mono px-2 hidden lg:inline">Palette:</span>
            {(["infrared", "inferno", "greyscale"] as const).map((cmap) => (
              <button
                key={cmap}
                onClick={() => setActiveColormap(cmap)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs capitalize transition-colors cursor-pointer",
                  activeColormap === cmap
                    ? "bg-slate-800 text-amber-300 font-semibold"
                    : "text-slate-300 hover:text-white"
                )}
              >
                {cmap}
              </button>
            ))}
          </div>
        </div>

        {/* CANONICAL SCIENTIFIC DATA CLASSIFICATION & EPOCH PROVENANCE BANNER */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="rounded-md bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-purple-300 font-bold">
                MODEL / SIMULATION
              </span>
              <span className="text-slate-300">32×32 WCS PSF Cutout Reconstruction</span>
              <span className="text-slate-600">+</span>
              <span className="rounded-md bg-sky-500/15 border border-sky-500/40 px-2.5 py-0.5 text-sky-300 font-bold">
                REAL OBSERVATION
              </span>
              <span className="text-slate-300">IRSA QR2 Timestamps</span>
              <span className="text-slate-600">+</span>
              <span className="rounded-md bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-amber-300 font-bold">
                DERIVED FROM REAL DATA
              </span>
              <span className="text-slate-300">Proper Motion Shift</span>
            </div>
          </div>

          {obs1 && obs2 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-300">
              <div>
                Epoch 1: <strong className="text-sky-300">{obs1Id}</strong> ({(obs1.utcDate || "").slice(0, 10)} · MJD {formattedMjd1})
                <span className="mx-2 text-slate-500">→</span>
                Epoch 2: <strong className="text-amber-300">{obs2Id}</strong> ({(obs2.utcDate || "").slice(0, 10)} · MJD {formattedMjd2})
              </div>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-amber-300 font-semibold">
                Baseline Δt = {formattedDeltaDays} days
              </div>
            </div>
          )}
        </div>

        {/* CENTER: ASTRONOMICAL CANVAS OR EXPLICIT UNAVAILABLE STATE */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[310px] py-4">
          {!hasMultipleEpochs ? (
            <div className="max-w-md rounded-2xl border border-slate-700 bg-[#090e1a] p-6 text-center space-y-3">
              <div className="inline-block rounded-md bg-rose-500/15 border border-rose-500/40 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-rose-300 font-bold">
                UNAVAILABLE
              </div>
              <div className="text-sm font-mono uppercase tracking-wider text-amber-400 font-semibold">
                {obsCount === 0 ? "No Multi-Epoch Cutouts Available" : "Single Epoch Available — Playback Disabled"}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {obsCount === 0
                  ? `Zero SPHEREx QR2 exposures were returned for ${targetName}. Multi-epoch difference imaging requires at least two exposures.`
                  : `Only 1 observation epoch is available for ${targetName}. Difference imaging and time-domain playback require at least 2 distinct epochs.`}
              </p>
              <a
                href={`https://irsa.ipac.caltech.edu/Missions/spherex.html`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 font-mono text-xs text-amber-300 hover:bg-amber-500/30"
              >
                Verify NASA/IPAC IRSA SPHEREx Archive ↗
              </a>
            </div>
          ) : (
            <>
              {/* Difference View */}
              {comparisonMode === "difference" && (
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <div className="relative aspect-square h-[270px] w-[270px] rounded-2xl border-2 border-amber-500/40 bg-[#0a0e18] p-1.5 shadow-[0_0_35px_rgba(251,146,60,0.15)] cursor-crosshair">
                    <canvas
                      ref={canvasDiffRef}
                      className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                      onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.differenceAnalysis?.diffPixels)}
                      onMouseLeave={onCanvasMouseLeave}
                    />
                    <div className="absolute top-2.5 left-2.5 rounded-md bg-slate-950/90 px-2.5 py-1 text-xs font-mono text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                      {isProperMotionTarget ? "Proper Motion Dipole Residual" : "Photometric Variability Residual"}
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-slate-950/90 px-2.5 py-1 text-xs font-mono text-slate-200 border border-slate-700 font-semibold">
                      Δt = {formattedDeltaDays} d
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs">
                    <span className="flex items-center gap-2 text-amber-300 font-medium">
                      <span className="h-3 w-3 rounded-full bg-amber-400 shadow-sm" /> +ΔFlux (Epoch 2 Position / Brighter)
                    </span>
                    <span className="flex items-center gap-2 text-sky-300 font-medium">
                      <span className="h-3 w-3 rounded-full bg-sky-400 shadow-sm" /> −ΔFlux (Epoch 1 Position / Dimmer)
                    </span>
                  </div>
                </div>
              )}

              {/* Blink Animation */}
              {comparisonMode === "blink" && (
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <div className="relative aspect-square h-[270px] w-[270px] rounded-2xl border-2 border-slate-700 bg-[#0a0e18] p-1.5 shadow-2xl cursor-crosshair">
                    <canvas
                      ref={canvas1Ref}
                      className={cn(
                        "h-full w-full object-contain rounded-xl image-rendering-pixelated transition-opacity duration-75",
                        blinkActiveEpoch === 1 ? "opacity-100" : "hidden"
                      )}
                      onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                      onMouseLeave={onCanvasMouseLeave}
                    />
                    <canvas
                      ref={canvas2Ref}
                      className={cn(
                        "h-full w-full object-contain rounded-xl image-rendering-pixelated transition-opacity duration-75",
                        blinkActiveEpoch === 2 ? "opacity-100" : "hidden"
                      )}
                      onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                      onMouseLeave={onCanvasMouseLeave}
                    />
                    <div className="absolute top-2.5 left-2.5 rounded-md bg-slate-950/90 px-2.5 py-1 text-xs font-mono text-slate-200 border border-slate-700 backdrop-blur-sm">
                      Showing: <strong className="text-amber-400">Epoch {blinkActiveEpoch}</strong> ({blinkActiveEpoch === 1 ? obs1Id : obs2Id})
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-slate-950/90 px-2.5 py-1 text-xs font-mono text-slate-300">
                      {blinkSpeedHz} Hz
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-300">Blink Cadence:</span>
                    {[1, 2, 4].map((hz) => (
                      <button
                        key={hz}
                        onClick={() => setBlinkSpeedHz(hz)}
                        className={cn(
                          "px-3 py-1 rounded-md font-mono text-xs transition-colors cursor-pointer",
                          blinkSpeedHz === hz ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:text-white"
                        )}
                      >
                        {hz} Hz
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Side by Side */}
              {comparisonMode === "side-by-side" && (
                <div className="flex flex-wrap items-center justify-center gap-8 h-full w-full">
                  <div className="flex flex-col items-center">
                    <div className="h-52 w-52 rounded-2xl border-2 border-slate-700 bg-[#0a0e18] p-1.5 shadow-lg cursor-crosshair">
                      <canvas
                        ref={canvas1Ref}
                        className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                        onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                        onMouseLeave={onCanvasMouseLeave}
                      />
                    </div>
                    <span className="mt-2 text-xs text-slate-200 font-mono">
                      Epoch 1: <strong className="text-sky-300">{obs1Id}</strong> (MJD {formattedMjd1})
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-52 w-52 rounded-2xl border-2 border-slate-700 bg-[#0a0e18] p-1.5 shadow-lg cursor-crosshair">
                      <canvas
                        ref={canvas2Ref}
                        className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                        onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                        onMouseLeave={onCanvasMouseLeave}
                      />
                    </div>
                    <span className="mt-2 text-xs text-slate-200 font-mono">
                      Epoch 2: <strong className="text-amber-300">{obs2Id}</strong> (MJD {formattedMjd2})
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTTOM: TIME SCRUBBER CONTROLLER */}
        <div className="shrink-0 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">Time-Domain Scrubber</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-mono font-medium">
                {obsCount === 0
                  ? "0 Scans Available"
                  : obsCount === 1
                  ? "Scan #1 of 1 (Single Epoch)"
                  : `Scan #${currentIndex + 1} of ${obsCount} (${currentObs.obs_id || currentObs.obsId || "QR2"})`}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              {hoverPixel && hoverPixel.val !== null ? (
                <span>
                  Pixel [{hoverPixel.x}, {hoverPixel.y}] ={" "}
                  <strong className="text-sky-300">{hoverPixel.val.toFixed(2)} MJy/sr</strong>
                </span>
              ) : (
                <span className="text-slate-400">Hover over cutout to inspect surface brightness (MJy/sr)</span>
              )}
            </div>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={Math.max(0, obsCount - 1)}
              disabled={!hasMultipleEpochs}
              value={Math.min(currentIndex, Math.max(0, obsCount - 1))}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                disabled={!hasMultipleEpochs}
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 active:scale-95 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlaying ? "❚❚ Pause" : "▶ Play Evolution"}
              </button>
              <button
                disabled={!hasMultipleEpochs}
                onClick={() => setCurrentIndex((c) => Math.max(1, c - 1))}
                className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ◄ Prev Scan
              </button>
              <button
                disabled={!hasMultipleEpochs}
                onClick={() => setCurrentIndex((c) => Math.min(obsCount - 1, c + 1))}
                className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next Scan ►
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1">Speed:</span>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  disabled={!hasMultipleEpochs}
                  onClick={() => setPlaybackSpeed(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-mono text-xs cursor-pointer disabled:opacity-40",
                    playbackSpeed === s ? "bg-slate-700 text-amber-300 font-bold" : "text-slate-300 hover:text-white"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          RIGHT AREA (SCIENTIFIC TARGET DOSSIER & PRIORITIZED METRICS - 4 COLUMNS)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="xl:col-span-4 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-5 sm:p-6 shadow-xl space-y-5">
        {/* SECTION 1: Verified Target Identity & Classification */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
              {activeTarget.type}
            </span>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs text-amber-300 font-mono font-semibold">
              {activeTarget.spectralType}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-100">{activeTarget.name}</h3>
            <p className="mt-1 text-xs font-mono text-slate-300">
              ICRS J2000: {activeTarget.raSexagesimal} · {activeTarget.decSexagesimal} ({activeTarget.raDeg}°, {activeTarget.decDeg}°)
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#090e1a] p-3.5 rounded-xl border border-slate-800/80">
            {activeTarget.scienceDescription}
          </p>

          {activeTarget.components && activeTarget.components.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs font-mono space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
                Resolved Binary Brown Dwarf Components
              </div>
              {activeTarget.components.map((comp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-slate-200">
                  <span>
                    {comp.designation}: <strong className="text-amber-300">{comp.spectralType}</strong>
                  </span>
                  <span className="text-slate-300">
                    T_eff ≈ {comp.effectiveTempK} K · ~{comp.massJupiter} M_Jup
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: 4 Core Prioritized Astrometric & Epoch Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold">
              Key Astrometric & Baseline Metrics
            </h4>
            <span className="text-xs font-mono text-sky-300">
              {activeTarget.id === "wise-0855" ? "Spitzer / WISE" : "ESA Gaia DR3"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 space-y-1">
              <span className="text-xs text-slate-400 block">Distance (d)</span>
              <span className="text-sky-300 font-bold font-mono text-sm sm:text-base block">
                {activeTarget.distancePc} pc
              </span>
              <span className="text-xs font-mono text-slate-400 block">
                {activeTarget.distanceLy} light-years
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 space-y-1">
              <span className="text-xs text-slate-400 block">Proper Motion (μ)</span>
              <span className={cn("font-bold font-mono text-sm sm:text-base block", isProperMotionTarget ? "text-emerald-400" : "text-sky-300")}>
                {activeTarget.totalProperMotionArcsecYr}″/yr
              </span>
              <span className="text-xs font-mono text-slate-400 block">
                PA {activeTarget.positionAngleDeg}° (E of N)
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 space-y-1">
              <span className="text-xs text-slate-400 block">Parallax (π)</span>
              <span className="text-slate-100 font-bold font-mono text-sm sm:text-base block">
                {activeTarget.parallaxMas} mas
              </span>
              <span className="text-xs font-mono text-slate-400 block">
                ± {activeTarget.parallaxErrorMas ?? 0.04} mas (1σ)
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-3.5 space-y-1">
              <span className="text-xs text-slate-400 block">Selected Baseline Shift</span>
              <span className="text-amber-300 font-bold font-mono text-sm sm:text-base block">
                {diffAnalysis ? `${diffAnalysis.trueDisplacementArcsec}″` : "N/A"}
              </span>
              <span className="text-xs font-mono text-slate-400 block">
                {diffAnalysis ? `${diffAnalysis.trueDisplacementPixels} px (${formattedDeltaDays} d)` : "Single epoch"}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Collapsible Secondary Technical Telemetry & FITS */}
        <div className="border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between rounded-xl bg-[#090e1a] border border-slate-800 px-3.5 py-2.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <span className="font-mono font-medium">
              {showTechnicalDetails ? "▼ Hide Secondary Telemetry & FITS" : "► View Secondary Telemetry & FITS Link"}
            </span>
            <span className="text-xs font-mono text-amber-400">
              {obsCount} QR2 Epochs
            </span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2.5 space-y-2 bg-[#090e1a] p-3.5 rounded-xl border border-slate-800 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>IRSA QR2 Coverage:</span>
                <span className="text-amber-300">
                  {obsCount} Sampled ({activeTarget.spherexContext?.coverageEpochCount || obsCount} Total)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Catalog Source ID:</span>
                <span className="text-sky-300">{activeTarget.astrometricCatalogId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Residual Summary:</span>
                <span className="text-amber-300 text-right">{diffAnalysis?.statusSummary || "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>RMS Residual:</span>
                <span className="text-slate-200">{diffAnalysis?.rmsResidualMJyPerSr ?? "N/A"} MJy/sr</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Significant Pixels (&gt;3σ):</span>
                <span className="text-amber-400 font-bold">{diffAnalysis?.significantPixelsCount ?? 0} px</span>
              </div>
              {(currentObs.accessUrl || currentObs.access_url) && (
                <div className="pt-2 border-t border-slate-800">
                  <a
                    href={currentObs.accessUrl || currentObs.access_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline break-all"
                  >
                    Download IRSA Level-2 FITS ({currentObs.obs_id || currentObs.obsId}) ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
