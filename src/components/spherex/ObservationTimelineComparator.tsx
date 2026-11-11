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
        // Difference colormap: negative is ion blue, zero is black, positive is ember
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
        // SPHEREx Infrared (Dark Ink -> Nebula Purple -> Ember Orange -> Hot White)
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
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-ember animate-pulse shadow-[0_0_8px_#ff8a3d]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft font-semibold">
              Time-Domain Astronomical Engine · SPHEREx QR2
            </span>
          </div>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Multi-Epoch Observation Timeline & Difference Imaging
          </h3>
        </div>

        {/* Colormap & Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink p-1 text-xs">
            <span className="font-mono text-[9px] text-mist uppercase px-1.5">Colormap:</span>
            {(["infrared", "inferno", "greyscale"] as const).map((cmap) => (
              <button
                key={cmap}
                onClick={() => setActiveColormap(cmap)}
                className={cn(
                  "rounded px-2 py-1 font-mono text-[10px] capitalize transition-colors",
                  activeColormap === cmap ? "bg-white/15 text-ember font-bold" : "text-mist hover:text-bone"
                )}
              >
                {cmap}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-white/10 bg-ink p-1 text-xs">
            {(["difference", "blink", "side-by-side", "overlay"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setComparisonMode(mode)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-mono text-[11px] capitalize transition-colors",
                  comparisonMode === mode ? "bg-ember text-ink font-semibold" : "text-mist hover:text-bone"
                )}
              >
                {mode.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Comparison Stage */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Viewport Display */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-lg border border-white/10 bg-ink p-6 min-h-[380px] relative overflow-hidden">
          {loadingComparison && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/80 backdrop-blur-xs">
              <span className="font-mono text-xs text-ember-soft animate-pulse">
                Aligning astrometry & computing calibrated difference matrix...
              </span>
            </div>
          )}

          {/* Mode 1: Difference Imaging */}
          {comparisonMode === "difference" && (
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64 rounded border border-ember/40 bg-black shadow-[0_0_25px_rgba(255,138,61,0.2)] image-rendering-pixelated cursor-crosshair">
                <canvas
                  ref={canvasDiffRef}
                  className="h-full w-full object-contain"
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.differenceAnalysis?.diffPixels)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <div className="absolute top-2 left-2 rounded bg-ink/85 px-2 py-0.5 font-mono text-[9px] text-ember border border-ember/30">
                  Residual Matrix D = (I₂ - B₂) - (I₁ - B₁)
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-mist">
                <span className="flex items-center gap-1.5 text-ember">
                  <span className="h-2 w-2 rounded-full bg-ember" /> Positive Flux (Brightened / Arrived)
                </span>
                <span className="flex items-center gap-1.5 text-ion">
                  <span className="h-2 w-2 rounded-full bg-ion" /> Negative Flux (Dimmed / Departed)
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: Blink Comparator */}
          {comparisonMode === "blink" && (
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64 rounded border border-white/20 bg-black image-rendering-pixelated shadow-2xl cursor-crosshair">
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
                <div className="absolute top-2 left-2 rounded bg-ink/90 px-2.5 py-1 font-mono text-[10px] text-bone border border-white/10">
                  Active: <span className="text-ember font-bold">Epoch {blinkActiveEpoch}</span> ({blinkActiveEpoch === 1 ? obs1.obs_id || obs1.obsId : obs2.obs_id || obs2.obsId})
                </div>
                <div className="absolute bottom-2 right-2 rounded bg-ink/90 px-2 py-0.5 font-mono text-[9px] text-mist">
                  {blinkSpeedHz} Hz Blink
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="font-mono text-[11px] text-mist">Blink Speed:</span>
                {[1, 2, 4].map((hz) => (
                  <button
                    key={hz}
                    onClick={() => setBlinkSpeedHz(hz)}
                    className={cn(
                      "rounded px-2.5 py-0.5 font-mono text-[10px]",
                      blinkSpeedHz === hz ? "bg-ember text-ink font-bold" : "bg-white/5 text-mist hover:text-bone"
                    )}
                  >
                    {hz} Hz
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Side-by-Side Synchronized Comparison */}
          {comparisonMode === "side-by-side" && (
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <div className="h-48 w-48 rounded border border-white/20 bg-black image-rendering-pixelated shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas1Ref}
                    className="h-full w-full object-contain"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-bone font-medium">Epoch 1: MJD {parseFloat(obs1.mjd || obs1.t_min || 0).toFixed(1)}</p>
                <p className="font-mono text-[9px] text-mist">{obs1.energy_bandpassname || obs1.bandpass}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-48 w-48 rounded border border-white/20 bg-black image-rendering-pixelated shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas2Ref}
                    className="h-full w-full object-contain"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-bone font-medium">Epoch 2: MJD {parseFloat(obs2.mjd || obs2.t_min || 0).toFixed(1)}</p>
                <p className="font-mono text-[9px] text-mist">{obs2.energy_bandpassname || obs2.bandpass}</p>
              </div>
            </div>
          )}

          {/* Mode 4: Opacity Overlay */}
          {comparisonMode === "overlay" && (
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64 rounded border border-white/20 bg-black image-rendering-pixelated shadow-2xl cursor-crosshair">
                <canvas ref={canvas1Ref} className="absolute inset-0 h-full w-full object-contain" />
                <canvas
                  ref={canvas2Ref}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ opacity: overlayOpacity }}
                />
              </div>
              <div className="mt-4 w-64">
                <div className="flex justify-between font-mono text-[10px] text-mist mb-1">
                  <span>Epoch 1 (100%)</span>
                  <span className="text-ember font-bold">{(overlayOpacity * 100).toFixed(0)}% Epoch 2</span>
                  <span>Epoch 2 (100%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-ember cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Live Pixel Value Inspector HUD */}
          {hoverPixel && (
            <div className="mt-4 rounded border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-[11px] text-bone flex items-center gap-4">
              <span>Pixel: <strong className="text-ember">[{hoverPixel.x}, {hoverPixel.y}]</strong></span>
              {hoverPixel.val !== null && (
                <span>Flux / Brightness: <strong className="text-ion">{hoverPixel.val.toFixed(4)} MJy/sr</strong></span>
              )}
              <span>Scale: <strong className="text-mist">6.2"/px</strong></span>
            </div>
          )}
        </div>

        {/* Right Column: Comparison Diagnostics & Ephemeris Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-white/10 bg-ink-3 p-5">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-ember-soft font-semibold">
                Observation Selection & Ephemerides
              </h4>
              <button
                onClick={() => setShowFitsHeader(!showFitsHeader)}
                className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-bone hover:bg-white/10 transition-colors"
              >
                {showFitsHeader ? "Hide FITS Header" : "View FITS Cards"}
              </button>
            </div>

            {/* Epoch 1 Selector */}
            <div className="mt-4">
              <label className="block font-mono text-[10px] uppercase text-mist">
                Reference Frame (Epoch 1)
              </label>
              <select
                value={epoch1Index}
                onChange={(e) => setEpoch1Index(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded border border-white/10 bg-ink px-3 py-2 font-mono text-xs text-bone focus:border-ember focus:outline-none"
              >
                {observations.map((obs, i) => (
                  <option key={`ep1_${obs.obs_id || i}`} value={i}>
                    {obs.obs_id || `Obs #${i+1}`} · MJD {parseFloat(obs.t_min || obs.mjd || 0).toFixed(1)} ({obs.energy_bandpassname || obs.bandpass})
                  </option>
                ))}
              </select>
            </div>

            {/* Epoch 2 Selector */}
            <div className="mt-3">
              <label className="block font-mono text-[10px] uppercase text-mist">
                Comparison Frame (Epoch 2)
              </label>
              <select
                value={epoch2Index}
                onChange={(e) => setEpoch2Index(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded border border-white/10 bg-ink px-3 py-2 font-mono text-xs text-bone focus:border-ember focus:outline-none"
              >
                {observations.map((obs, i) => (
                  <option key={`ep2_${obs.obs_id || i}`} value={i}>
                    {obs.obs_id || `Obs #${i+1}`} · MJD {parseFloat(obs.t_min || obs.mjd || 0).toFixed(1)} ({obs.energy_bandpassname || obs.bandpass})
                  </option>
                ))}
              </select>
            </div>

            {/* Scientific Difference Diagnostics */}
            {comparisonData?.differenceAnalysis && (
              <div className="mt-5 space-y-2 rounded border border-white/5 bg-ink/60 p-3.5 text-xs font-mono">
                <div className="flex justify-between text-mist">
                  <span>Astrometric Alignment:</span>
                  <span className="text-ion font-medium">
                    {comparisonData.astrometricAlignment?.isCompatible ? "Aligned (Δθ < 0.5 pix)" : "Offset Detected"}
                  </span>
                </div>
                <div className="flex justify-between text-mist">
                  <span>Residual RMS Noise:</span>
                  <span className="text-bone">{comparisonData.differenceAnalysis.rmsResidualMJyPerSr} MJy/sr</span>
                </div>
                <div className="flex justify-between text-mist">
                  <span>Significance Threshold:</span>
                  <span className="text-bone">&gt; 3.0σ ({comparisonData.differenceAnalysis.detectionThreshold3Sigma} MJy/sr)</span>
                </div>
                <div className="flex justify-between text-mist">
                  <span>Changed Pixels (&gt;3σ):</span>
                  <span className="text-ember font-bold">{comparisonData.differenceAnalysis.significantPixelsCount} px</span>
                </div>
                <div className="flex justify-between text-mist pt-1 border-t border-white/5">
                  <span>Baseline Shift / Motion:</span>
                  <span className="text-bone">{comparisonData.differenceAnalysis.motionDetected ? "Scientifically Detected" : "Stationary"}</span>
                </div>
              </div>
            )}
          </div>

          {/* FITS Header Inspector Panel */}
          {showFitsHeader && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded border border-white/10 bg-black/90 p-3 font-mono text-[10px] text-mist scrollbar-thin">
              <div className="text-ember font-bold mb-1">=== PRIMARY FITS HEADER CARDS ===</div>
              <div>SIMPLE  =                    T / Standard FITS format</div>
              <div>BITPIX  =                  -32 / IEEE single precision floating point</div>
              <div>NAXIS   =                    2 / 2-Dimensional image matrix</div>
              <div>NAXIS1  =                   32 / Spatial pixel dimension X</div>
              <div>NAXIS2  =                   32 / Spatial pixel dimension Y</div>
              <div>BUNIT   = 'MJy/sr  '           / Calibrated Surface Brightness</div>
              <div>TELESCOP= 'SPHEREx '           / NASA SPHEREx Observatory</div>
              <div>INSTRUME= 'LVF     '           / Linear Variable Filter Spectrophotometer</div>
              <div>FILTER  = '{obs1.energy_bandpassname || obs1.bandpass || "SPHEREx-D2"}' / Dispersed bandpass channel</div>
              <div>CTYPE1  = 'RA---TAN'           / Tangent celestial projection</div>
              <div>CTYPE2  = 'DEC--TAN'          / Tangent celestial projection</div>
              <div>CDELT1  =            -0.001708 / Deg/pixel (-6.15 arcsec/pixel)</div>
              <div>CDELT2  =             0.001708 / Deg/pixel (+6.15 arcsec/pixel)</div>
              <div>RADESYS = 'ICRS    '           / International Celestial Reference System</div>
              <div>MJD-OBS = {parseFloat(obs1.mjd || obs1.t_min || 60676).toFixed(4)} / Observation Epoch</div>
              <div>EXPTIME =              113.580 / Integration duration in seconds</div>
            </div>
          )}

          {/* Provenance Badge */}
          <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-mist flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span>Pixel Scale: <strong>6.2" / pixel</strong></span>
              <span className="text-ember-soft font-semibold">NASA SPHEREx Level 2 MEF</span>
            </div>
            <div className="text-[9px] text-bone/60">
              Provenance: NASA/IPAC IRSA SPHEREx QR2 Archival Product · Astrometric WCS TAN
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Observation Timeline Scrubber */}
      <div className="mt-8 rounded-lg border border-white/10 bg-ink p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 rounded bg-ember px-3.5 py-1.5 font-mono text-xs font-semibold text-ink transition-transform active:scale-95 shadow-md"
            >
              {isPlaying ? "❚❚ Pause" : "▶ Play Timeline"}
            </button>
            <button
              onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
              className="rounded bg-white/5 px-3 py-1 font-mono text-xs text-bone hover:bg-white/10"
            >
              ◄ Prev
            </button>
            <button
              onClick={() => setCurrentIndex((c) => Math.min(observations.length - 1, c + 1))}
              className="rounded bg-white/5 px-3 py-1 font-mono text-xs text-bone hover:bg-white/10"
            >
              Next ►
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-mist">
            <span>Playback Speed:</span>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-[10px]",
                  playbackSpeed === s ? "bg-ember text-ink font-bold" : "bg-white/5 text-mist hover:text-bone"
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider Track */}
        <input
          type="range"
          min="0"
          max={Math.max(0, observations.length - 1)}
          value={currentIndex}
          onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
          className="w-full accent-ember cursor-pointer"
        />

        {/* Current Observation Details Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-mist border-t border-white/5 pt-2">
          <div>
            Observation <span className="text-ember font-bold">#{currentIndex + 1}</span> of {observations.length}:{" "}
            <span className="text-bone font-medium">{currentObs.obs_id || currentObs.obsId}</span>
          </div>
          <div>
            MJD: <span className="text-bone">{parseFloat(currentObs.t_min || currentObs.mjd || 0).toFixed(4)}</span>
          </div>
          <div>
            Spectral Band: <span className="text-ember-soft font-semibold">{currentObs.energy_bandpassname || currentObs.bandpass}</span>
          </div>
          <div>
            Integration: <span className="text-bone">{parseFloat(currentObs.t_exptime || currentObs.exposureTimeSec || 113.58).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
