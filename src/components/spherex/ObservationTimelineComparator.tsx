import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

interface ObservationTimelineProps {
  targetId: string;
  targetName: string;
  observations: any[];
}

export default function ObservationTimelineComparator({ targetId, targetName, observations }: ObservationTimelineProps) {
  // Timeline state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x, 4x

  // Comparison mode: "difference" | "blink" | "side-by-side" | "overlay"
  const [comparisonMode, setComparisonMode] = useState<"difference" | "blink" | "side-by-side" | "overlay">("difference");
  const [epoch1Index, setEpoch1Index] = useState(0);
  const [epoch2Index, setEpoch2Index] = useState(Math.max(0, observations.length - 1));
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [blinkActiveEpoch, setBlinkActiveEpoch] = useState<1 | 2>(1);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2); // 1Hz, 2Hz, 4Hz
  const [activeColormap, setActiveColormap] = useState<"infrared" | "greyscale" | "inferno">("infrared");

  // Comparison data from API
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Pixel inspection state
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; val: number | null } | null>(null);
  const [showFitsHeader, setShowFitsHeader] = useState(false);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || observations.length === 0) return;
    const intervalMs = Math.round(1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % observations.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, observations.length]);

  // Blink timer
  useEffect(() => {
    if (comparisonMode !== "blink") return;
    const intervalMs = Math.round(1000 / (blinkSpeedHz * 2));
    const timer = setInterval(() => {
      setBlinkActiveEpoch((prev) => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [comparisonMode, blinkSpeedHz]);

  // Fetch comparison data when epochs or target changes
  useEffect(() => {
    if (observations.length === 0) return;
    const obs1 = observations[epoch1Index] || observations[0];
    const obs2 = observations[epoch2Index] || observations[observations.length - 1];

    setLoadingComparison(true);
    fetch(`/api/image-compare?targetId=${targetId}&obsId1=${obs1.obs_id || obs1.obsId}&obsId2=${obs2.obs_id || obs2.obsId}`)
      .then((r) => r.json())
      .then((data) => {
        setComparisonData(data);
        setLoadingComparison(false);
      })
      .catch((err) => {
        console.error("Comparison fetch failed:", err);
        setLoadingComparison(false);
      });
  }, [targetId, epoch1Index, epoch2Index, observations]);

  const currentObs = observations[currentIndex] || observations[0] || {};
  const obs1 = observations[epoch1Index] || observations[0] || {};
  const obs2 = observations[epoch2Index] || observations[observations.length - 1] || {};

  // Canvas rendering helper for cutouts and difference image
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

    // Dynamic rendering with selected colormap
    const rgba = new Uint8ClampedArray(width * height * 4);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pixelValues.length; i++) {
      if (pixelValues[i] < min) min = pixelValues[i];
      if (pixelValues[i] > max) max = pixelValues[i];
    }
    const range = Math.max(1e-5, max - min);

    for (let i = 0; i < pixelValues.length; i++) {
      const val = pixelValues[i];
      let norm = (val - min) / range;
      if (isDiff) {
        // Difference colormap: negative is ion blue, zero is black, positive is amber
        const t = Math.max(0, Math.min(1, (val + 1.5) / 3.0));
        let r = 0, g = 0, b = 0;
        if (t < 0.48) {
          const k = (0.48 - t) / 0.48;
          b = Math.round(255 * k);
          g = Math.round(180 * k);
        } else if (t > 0.52) {
          const k = (t - 0.52) / 0.48;
          r = Math.round(255 * k);
          g = Math.round(138 * k);
        }
        const pIdx = i * 4;
        rgba[pIdx] = r;
        rgba[pIdx + 1] = g;
        rgba[pIdx + 2] = b;
        rgba[pIdx + 3] = 255;
        continue;
      }

      // Asinh stretch
      norm = Math.asinh(6.0 * norm) / Math.asinh(6.0);
      const intensity = Math.min(255, Math.max(0, Math.round(norm * 255)));

      let r = 0, g = 0, b = 0;
      if (activeColormap === "greyscale") {
        r = g = b = intensity;
      } else if (activeColormap === "inferno") {
        const t = intensity / 255;
        r = Math.round(255 * Math.sqrt(t));
        g = Math.round(255 * (t * t));
        b = Math.round(255 * (Math.sin(t * Math.PI)));
      } else {
        // SPHEREx Infrared (Dark Ink -> Nebula Purple -> Amber Orange -> Hot White)
        const t = intensity / 255;
        if (t < 0.35) {
          const k = t / 0.35;
          r = Math.round(15 + 60 * k);
          g = Math.round(18 + 40 * k);
          b = Math.round(28 + 120 * k);
        } else if (t < 0.75) {
          const k = (t - 0.35) / 0.40;
          r = Math.round(75 + 180 * k);
          g = Math.round(58 + 80 * k);
          b = Math.round(148 - 80 * k);
        } else {
          const k = (t - 0.75) / 0.25;
          r = 255;
          g = Math.round(138 + 117 * k);
          b = Math.round(68 + 187 * k);
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
  }, [comparisonData, activeColormap]);

  // Handle canvas mouse hover inspection
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

  return (
    <div className="h-full w-full flex flex-col gap-2.5 overflow-hidden select-none">
      {/* ── TOP CONTROL STRIP (Height: 40px) ── */}
      <div className="h-10 shrink-0 px-3.5 rounded-lg border border-slate-800 bg-[#0e1526]/90 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
        {/* Left: Mode Title */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <span className="font-mono text-xs font-semibold text-slate-100 tracking-wide">
            Timeline Scrubber & Difference Engine
          </span>
          <span className="hidden sm:inline-block rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 font-mono text-[9px] text-amber-300 font-medium">
            SPHEREx Calibrated
          </span>
        </div>

        {/* Right: Colormap + Mode Switchers */}
        <div className="flex items-center gap-2">
          {/* Colormap Pill Group */}
          <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#090e1a] p-0.5">
            <span className="font-mono text-[9px] text-slate-400 uppercase px-1.5 hidden md:inline">Colormap:</span>
            {(["infrared", "inferno", "greyscale"] as const).map((cmap) => (
              <button
                key={cmap}
                onClick={() => setActiveColormap(cmap)}
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[10px] capitalize transition-colors cursor-pointer",
                  activeColormap === cmap
                    ? "bg-slate-700/80 text-amber-300 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {cmap}
              </button>
            ))}
          </div>

          {/* Mode Switcher Group */}
          <div className="flex items-center rounded-md border border-slate-800 bg-[#090e1a] p-0.5">
            {(["difference", "blink", "side-by-side", "overlay"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setComparisonMode(mode)}
                className={cn(
                  "rounded px-2.5 py-0.5 font-mono text-[10px] capitalize transition-all cursor-pointer",
                  comparisonMode === mode
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {mode.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN WORKSTATION (flex-1 min-h-0 overflow-hidden) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-2.5 overflow-hidden">
        
        {/* ══ COLUMN 1 (Left 3 cols): Timeline Scrubber & Epoch Selection ══ */}
        <div className="col-span-12 lg:col-span-3 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0e1526]/70 p-3 min-h-0 overflow-hidden">
          {/* Top Section: Active Observation Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                Observation Scrubber
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                #{currentIndex + 1} / {observations.length}
              </span>
            </div>

            {/* Current Observation Meta Card */}
            <div className="rounded-lg border border-slate-800/80 bg-[#090e1a] p-2 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Obs ID:</span>
                <span className="text-slate-200 font-medium truncate max-w-[130px]">{currentObs.obs_id || currentObs.obsId || "SPHEREx-01"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Epoch MJD:</span>
                <span className="text-amber-400 font-bold">{parseFloat(currentObs.t_min || currentObs.mjd || 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bandpass:</span>
                <span className="text-sky-300 font-semibold">{currentObs.energy_bandpassname || currentObs.bandpass || "SPHEREx-D2"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Exposure:</span>
                <span className="text-slate-200">{parseFloat(currentObs.t_exptime || currentObs.exposureTimeSec || 113.58).toFixed(1)}s</span>
              </div>
            </div>

            {/* Slider */}
            <div className="pt-1">
              <input
                type="range"
                min="0"
                max={Math.max(0, observations.length - 1)}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 flex items-center justify-center gap-1 rounded-md bg-amber-500 py-1 font-mono text-[11px] font-bold text-slate-950 transition-transform active:scale-95 shadow-sm cursor-pointer hover:bg-amber-400"
              >
                {isPlaying ? "❚❚ Pause" : "▶ Play"}
              </button>
              <button
                onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
                className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-200 hover:bg-slate-700 cursor-pointer"
                title="Previous frame"
              >
                ◄
              </button>
              <button
                onClick={() => setCurrentIndex((c) => Math.min(observations.length - 1, c + 1))}
                className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-200 hover:bg-slate-700 cursor-pointer"
                title="Next frame"
              >
                ►
              </button>
              <div className="flex items-center rounded-md border border-slate-800 bg-[#090e1a] p-0.5">
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={cn(
                      "px-1 font-mono text-[9px] rounded cursor-pointer",
                      playbackSpeed === s ? "text-amber-400 font-bold bg-slate-800" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section: Difference Epoch Pair Selectors */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-400">
              Comparison Pair (Difference Baseline):
            </span>
            <div>
              <div className="flex justify-between font-mono text-[9px] text-slate-400 mb-0.5">
                <span>Epoch 1 (Ref):</span>
                <span className="text-slate-300 font-medium">{obs1.obs_id || `#${epoch1Index+1}`}</span>
              </div>
              <select
                value={epoch1Index}
                onChange={(e) => setEpoch1Index(parseInt(e.target.value, 10))}
                className="w-full rounded border border-slate-800 bg-[#090e1a] px-2 py-1 font-mono text-[10px] text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                {observations.map((obs, i) => (
                  <option key={`ep1_${obs.obs_id || i}`} value={i}>
                    #{i+1} · MJD {parseFloat(obs.t_min || obs.mjd || 0).toFixed(1)} ({obs.energy_bandpassname || obs.bandpass})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between font-mono text-[9px] text-slate-400 mb-0.5">
                <span>Epoch 2 (Target):</span>
                <span className="text-slate-300 font-medium">{obs2.obs_id || `#${epoch2Index+1}`}</span>
              </div>
              <select
                value={epoch2Index}
                onChange={(e) => setEpoch2Index(parseInt(e.target.value, 10))}
                className="w-full rounded border border-slate-800 bg-[#090e1a] px-2 py-1 font-mono text-[10px] text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                {observations.map((obs, i) => (
                  <option key={`ep2_${obs.obs_id || i}`} value={i}>
                    #{i+1} · MJD {parseFloat(obs.t_min || obs.mjd || 0).toFixed(1)} ({obs.energy_bandpassname || obs.bandpass})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ══ COLUMN 2 (Center 6 cols): Main Astronomical Cutout & Difference Canvas ══ */}
        <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-between rounded-xl border border-slate-800/80 bg-[#090e1a] p-3 min-h-0 relative overflow-hidden">
          {loadingComparison && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#090e1a]/85 backdrop-blur-xs">
              <span className="font-mono text-xs text-amber-300 animate-pulse">
                Aligning astrometry & computing calibrated difference matrix...
              </span>
            </div>
          )}

          {/* Mode 1: Difference Imaging Canvas */}
          {comparisonMode === "difference" && (
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              <div className="relative aspect-square h-full max-h-[min(310px,38vh)] w-auto rounded border border-amber-500/40 bg-black shadow-[0_0_25px_rgba(251,146,60,0.2)] image-rendering-pixelated cursor-crosshair">
                <canvas
                  ref={canvasDiffRef}
                  className="h-full w-full object-contain"
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.differenceAnalysis?.diffPixels)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <div className="absolute top-2 left-2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[9px] text-amber-300 border border-amber-500/30">
                  Residual D = (I₂ - B₂) - (I₁ - B₁)
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Positive Flux (Brightened / Arrived)
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Negative Flux (Dimmed / Departed)
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: Blink Comparator */}
          {comparisonMode === "blink" && (
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              <div className="relative aspect-square h-full max-h-[min(310px,38vh)] w-auto rounded border border-slate-700 bg-black image-rendering-pixelated shadow-2xl cursor-crosshair">
                <canvas
                  ref={canvas1Ref}
                  className={cn("h-full w-full object-contain transition-opacity duration-75", blinkActiveEpoch === 1 ? "opacity-100" : "hidden")}
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <canvas
                  ref={canvas2Ref}
                  className={cn("h-full w-full object-contain transition-opacity duration-75", blinkActiveEpoch === 2 ? "opacity-100" : "hidden")}
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <div className="absolute top-2 left-2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[10px] text-slate-200 border border-slate-700">
                  Active: <span className="text-amber-400 font-bold">Epoch {blinkActiveEpoch}</span>
                </div>
                <div className="absolute bottom-2 right-2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[9px] text-slate-400">
                  {blinkSpeedHz} Hz Blink
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">Blink Frequency:</span>
                {[1, 2, 4].map((hz) => (
                  <button
                    key={hz}
                    onClick={() => setBlinkSpeedHz(hz)}
                    className={cn(
                      "rounded px-2.5 py-0.5 font-mono text-[10px] cursor-pointer transition-colors",
                      blinkSpeedHz === hz ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {hz} Hz
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Side-by-Side Comparison */}
          {comparisonMode === "side-by-side" && (
            <div className="flex-1 flex items-center justify-center gap-4 w-full min-h-0">
              <div className="flex flex-col items-center">
                <div className="h-40 w-40 rounded border border-slate-700 bg-black image-rendering-pixelated shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas1Ref}
                    className="h-full w-full object-contain"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-200 font-medium">Epoch 1: MJD {parseFloat(obs1.mjd || obs1.t_min || 0).toFixed(1)}</p>
                <p className="font-mono text-[9px] text-slate-400">{obs1.energy_bandpassname || obs1.bandpass}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-40 w-40 rounded border border-slate-700 bg-black image-rendering-pixelated shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas2Ref}
                    className="h-full w-full object-contain"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-200 font-medium">Epoch 2: MJD {parseFloat(obs2.mjd || obs2.t_min || 0).toFixed(1)}</p>
                <p className="font-mono text-[9px] text-slate-400">{obs2.energy_bandpassname || obs2.bandpass}</p>
              </div>
            </div>
          )}

          {/* Mode 4: Opacity Overlay */}
          {comparisonMode === "overlay" && (
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              <div className="relative aspect-square h-full max-h-[min(310px,38vh)] w-auto rounded border border-slate-700 bg-black image-rendering-pixelated shadow-2xl cursor-crosshair">
                <canvas ref={canvas1Ref} className="absolute inset-0 h-full w-full object-contain" />
                <canvas
                  ref={canvas2Ref}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ opacity: overlayOpacity }}
                />
              </div>
              <div className="mt-2 w-56">
                <div className="flex justify-between font-mono text-[9px] text-slate-400 mb-0.5">
                  <span>Epoch 1</span>
                  <span className="text-amber-400 font-bold">{(overlayOpacity * 100).toFixed(0)}% Epoch 2</span>
                  <span>Epoch 2</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Live Pixel Value Inspector HUD */}
          <div className="w-full rounded-lg border border-slate-800 bg-[#0e1526]/90 px-3 py-1 font-mono text-[10.5px] text-slate-200 flex items-center justify-between shrink-0 mt-1">
            <span>Pixel: <strong className="text-amber-400">{hoverPixel ? `[${hoverPixel.x}, ${hoverPixel.y}]` : "Hover to inspect"}</strong></span>
            <span>Flux: <strong className="text-sky-400">{hoverPixel && hoverPixel.val !== null ? `${hoverPixel.val.toFixed(3)} MJy/sr` : "--"}</strong></span>
            <span>Scale: <strong className="text-slate-400">6.2"/px</strong></span>
          </div>
        </div>

        {/* ══ COLUMN 3 (Right 3 cols): Difference Diagnostics & Provenance ══ */}
        <div className="col-span-12 lg:col-span-3 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0e1526]/70 p-3 min-h-0 overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <h4 className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                Difference Diagnostics
              </h4>
              <button
                onClick={() => setShowFitsHeader(!showFitsHeader)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[9px] text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {showFitsHeader ? "Hide FITS" : "FITS Cards"}
              </button>
            </div>

            {/* Scientific Difference Diagnostics Metrics */}
            {comparisonData?.differenceAnalysis ? (
              <div className="space-y-1.5 rounded-lg border border-slate-800/80 bg-[#090e1a] p-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Alignment:</span>
                  <span className="text-sky-400 font-medium">
                    {comparisonData.astrometricAlignment?.isCompatible ? "Aligned (Δθ < 0.5 px)" : "Offset Detected"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Residual RMS:</span>
                  <span className="text-slate-200">{comparisonData.differenceAnalysis.rmsResidualMJyPerSr} MJy/sr</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Threshold:</span>
                  <span className="text-slate-200">&gt; 3.0σ ({comparisonData.differenceAnalysis.detectionThreshold3Sigma} MJy/sr)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Changed Pixels:</span>
                  <span className="text-amber-400 font-bold">{comparisonData.differenceAnalysis.significantPixelsCount} px</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Motion State:</span>
                  <span className="text-slate-100 font-semibold">{comparisonData.differenceAnalysis.motionDetected ? "Scientifically Detected" : "Stationary"}</span>
                </div>
              </div>
            ) : (
              <div className="rounded border border-slate-800/80 bg-[#090e1a] p-3 text-xs font-mono text-slate-400 text-center">
                Select epoch pair to compute difference metrics
              </div>
            )}

            {/* FITS Header Inspector Panel (Collapsible) */}
            {showFitsHeader && (
              <div className="max-h-36 overflow-y-auto rounded border border-slate-800 bg-black/90 p-2 font-mono text-[9px] text-slate-400 scrollbar-thin">
                <div className="text-amber-400 font-bold mb-0.5">=== PRIMARY FITS HEADER CARDS ===</div>
                <div>SIMPLE  =                    T / Standard FITS</div>
                <div>BITPIX  =                  -32 / IEEE 32-bit float</div>
                <div>NAXIS   =                    2 / 2-Dimensional matrix</div>
                <div>NAXIS1  =                   32 / Spatial X</div>
                <div>NAXIS2  =                   32 / Spatial Y</div>
                <div>BUNIT   = 'MJy/sr  '           / Calibrated Surface Brightness</div>
                <div>TELESCOP= 'SPHEREx '           / NASA SPHEREx</div>
                <div>INSTRUME= 'LVF     '           / Linear Variable Filter</div>
                <div>FILTER  = '{obs1.energy_bandpassname || obs1.bandpass || "SPHEREx-D2"}'</div>
                <div>CTYPE1  = 'RA---TAN'           / Tangent projection</div>
                <div>CTYPE2  = 'DEC--TAN'          / Tangent projection</div>
                <div>CDELT1  =            -0.001708 / 6.15 arcsec/pixel</div>
                <div>CDELT2  =             0.001708 / 6.15 arcsec/pixel</div>
                <div>RADESYS = 'ICRS    '           / J2000 System</div>
              </div>
            )}
          </div>

          {/* Lineage Footnote */}
          <div className="pt-2 border-t border-slate-800/80 text-[9px] font-mono text-slate-400">
            <div className="flex justify-between items-center">
              <span>Pixel Scale: <strong className="text-slate-200">6.2"/pixel</strong></span>
              <span className="text-amber-300 font-semibold">Level 2 MEF</span>
            </div>
            <p className="mt-0.5 text-[8.5px] text-slate-500">
              NASA/IPAC IRSA SPHEREx QR2 · WCS TAN Calibrated Cutout
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
