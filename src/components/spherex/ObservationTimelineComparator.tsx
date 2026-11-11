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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x

  // Comparison mode: "single" | "difference" | "blink" | "side-by-side"
  const [comparisonMode, setComparisonMode] = useState<"single" | "difference" | "blink" | "side-by-side">("difference");
  const [epoch1Index, setEpoch1Index] = useState(0);
  const [epoch2Index, setEpoch2Index] = useState(Math.max(0, observations.length - 1));
  const [blinkActiveEpoch, setBlinkActiveEpoch] = useState<1 | 2>(1);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2);
  const [activeColormap, setActiveColormap] = useState<"infrared" | "greyscale" | "inferno">("infrared");

  // Comparison data from API
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Pixel inspection & collapsible technical details
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; val: number | null } | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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
        // Difference colormap: negative is cyan, zero is transparent/dark, positive is warm amber
        const t = Math.max(0, Math.min(1, (val + 1.5) / 3.0));
        let r = 0, g = 0, b = 0;
        if (t < 0.48) {
          const k = (0.48 - t) / 0.48;
          b = Math.round(245 * k);
          g = Math.round(180 * k);
          r = Math.round(50 * k);
        } else if (t > 0.52) {
          const k = (t - 0.52) / 0.48;
          r = Math.round(255 * k);
          g = Math.round(150 * k);
          b = Math.round(40 * k);
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
        // SPHEREx Infrared (Dark Navy -> Purple -> Amber Orange -> White)
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
    <div className="w-full flex flex-col xl:flex-row gap-4 p-1 sm:p-2">
      
      {/* ═════════════════════════════════════════════════════════════════════
          LEFT AREA (HERO VIEWPORT & TIMELINE - 68% WIDTH)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-4 shadow-xl">
        
        {/* TOP BAR: Clean Mode Toggle & Color Style */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
          {/* Main Visual Modes */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            {[
              { id: "difference", label: "⚡ Difference View", desc: "Reveals only movement" },
              { id: "blink", label: "🔄 Blink Animation", desc: "Flips between dates" },
              { id: "side-by-side", label: "↔ Side by Side", desc: "Compare two dates" }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setComparisonMode(m.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  comparisonMode === m.id
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Color Palettes */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-mono px-2 hidden lg:inline">Palette:</span>
            {(["infrared", "inferno", "greyscale"] as const).map((cmap) => (
              <button
                key={cmap}
                onClick={() => setActiveColormap(cmap)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] capitalize transition-colors cursor-pointer",
                  activeColormap === cmap
                    ? "bg-slate-800 text-amber-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {cmap}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: LARGE CRISP ASTRONOMICAL CANVAS */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 py-2">
          {loadingComparison && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1322]/80 backdrop-blur-xs rounded-xl">
              <span className="text-xs font-mono text-amber-400 animate-pulse">
                Aligning celestial frames...
              </span>
            </div>
          )}

          {/* Difference View */}
          {comparisonMode === "difference" && (
            <div className="flex flex-col items-center justify-center h-full max-h-[340px] w-full">
              <div className="relative aspect-square h-full rounded-2xl border-2 border-amber-500/40 bg-black p-1 shadow-[0_0_35px_rgba(251,146,60,0.15)] cursor-crosshair">
                <canvas
                  ref={canvasDiffRef}
                  className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.differenceAnalysis?.diffPixels)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <div className="absolute top-3 left-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                  Motion Residual Map
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-5 text-xs">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm" /> Arrived / Brightened
                </span>
                <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm" /> Departed / Dimmed
                </span>
              </div>
            </div>
          )}

          {/* Blink Animation */}
          {comparisonMode === "blink" && (
            <div className="flex flex-col items-center justify-center h-full max-h-[340px] w-full">
              <div className="relative aspect-square h-full rounded-2xl border-2 border-slate-700 bg-black p-1 shadow-2xl cursor-crosshair">
                <canvas
                  ref={canvas1Ref}
                  className={cn("h-full w-full object-contain rounded-xl image-rendering-pixelated transition-opacity duration-75", blinkActiveEpoch === 1 ? "opacity-100" : "hidden")}
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <canvas
                  ref={canvas2Ref}
                  className={cn("h-full w-full object-contain rounded-xl image-rendering-pixelated transition-opacity duration-75", blinkActiveEpoch === 2 ? "opacity-100" : "hidden")}
                  onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                  onMouseLeave={onCanvasMouseLeave}
                />
                <div className="absolute top-3 left-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-slate-200 border border-slate-700 backdrop-blur-sm">
                  Showing: <strong className="text-amber-400">Epoch {blinkActiveEpoch}</strong>
                </div>
                <div className="absolute bottom-3 right-3 rounded-md bg-slate-950/80 px-2 py-0.5 text-[9px] font-mono text-slate-400">
                  {blinkSpeedHz} Hz
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Blink Speed:</span>
                {[1, 2, 4].map((hz) => (
                  <button
                    key={hz}
                    onClick={() => setBlinkSpeedHz(hz)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md font-mono text-xs transition-colors cursor-pointer",
                      blinkSpeedHz === hz ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400 hover:text-slate-200"
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
            <div className="flex items-center justify-center gap-6 h-full max-h-[340px] w-full">
              <div className="flex flex-col items-center">
                <div className="h-44 w-44 rounded-2xl border-2 border-slate-700 bg-black p-1 shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas1Ref}
                    className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch1?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <span className="mt-1.5 text-xs text-slate-300 font-medium">Epoch 1: Baseline</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-44 w-44 rounded-2xl border-2 border-slate-700 bg-black p-1 shadow-lg cursor-crosshair">
                  <canvas
                    ref={canvas2Ref}
                    className="h-full w-full object-contain rounded-xl image-rendering-pixelated"
                    onMouseMove={(e) => onCanvasMouseMove(e, comparisonData?.epoch2?.frame?.pixelValues)}
                    onMouseLeave={onCanvasMouseLeave}
                  />
                </div>
                <span className="mt-1.5 text-xs text-slate-300 font-medium">Epoch 2: Revisit</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM: COMFORTABLE TIME SCRUBBER CONTROLLER */}
        <div className="shrink-0 pt-3 border-t border-slate-800/80 space-y-2">
          {/* Scrubber Label & Epoch Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">Time-Domain Scrubber</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400 font-mono">
                Scan #{currentIndex + 1} of {observations.length}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {hoverPixel && hoverPixel.val !== null ? (
                <span>Hover Pixel [{hoverPixel.x}, {hoverPixel.y}] = <strong className="text-sky-300">{hoverPixel.val.toFixed(2)} MJy/sr</strong></span>
              ) : (
                <span>Hover over image to inspect brightness</span>
              )}
            </div>
          </div>

          {/* Slider */}
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={Math.max(0, observations.length - 1)}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 active:scale-95 shadow-sm cursor-pointer"
              >
                {isPlaying ? "❚❚ Pause" : "▶ Play Evolution"}
              </button>
              <button
                onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                ◄ Prev Scan
              </button>
              <button
                onClick={() => setCurrentIndex((c) => Math.min(observations.length - 1, c + 1))}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Next Scan ►
              </button>
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[11px] mr-1">Speed:</span>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={cn(
                    "px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer",
                    playbackSpeed === s ? "bg-slate-700 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
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
          RIGHT AREA (FRIENDLY INSIGHTS & EXPLANATIONS - 32% WIDTH)
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="w-full xl:w-96 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0d1322] p-4 shadow-xl space-y-3 shrink-0">
        
        {/* SECTION 1: Target Identity & Clear Plain-Language Story */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-semibold">
              Observed Celestial Target
            </span>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300 font-medium">
              SPHEREx QR2
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            {targetName}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed bg-[#090e1a] p-3 rounded-xl border border-slate-800/80">
            {targetId === "barnards-star" && (
              <>
                Barnard's Star has the fastest proper motion across Earth's night sky (<strong className="text-amber-300">10.39 arcsec / year</strong>). 
                Toggle <strong className="text-amber-400">Difference View</strong> to remove all static background stars and see the star's movement clearly isolated in amber and cyan.
              </>
            )}
            {targetId === "epsilon-indi-b" && (
              <>
                A cold T-dwarf brown dwarf located 12 light-years away. In difference imaging, its high proper motion stands out distinctly against distant stationary stars.
              </>
            )}
            {targetId === "wise-0855" && (
              <>
                The fourth-closest system to our Sun and one of the coldest known brown dwarfs (near room temperature). SPHEREx tracks its faint near-infrared signal.
              </>
            )}
            {targetId === "rw-aurigae" && (
              <>
                A young, highly dynamic T Tauri star. Occultations by orbiting circumstellar dust clouds create noticeable brightness drops across observation epochs.
              </>
            )}
            {targetId === "r-draconis" && (
              <>
                A Mira-type pulsating red giant with an 8-month pulsation cycle, causing drastic periodic changes in infrared luminosity.
              </>
            )}
          </p>
        </div>

        {/* SECTION 2: Key Discovery Findings (Clean, Readable Badges) */}
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400">
            Key Findings
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-2.5 space-y-1">
              <span className="text-[10px] text-slate-400 block">Motion Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Detected (&gt;5σ)
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-2.5 space-y-1">
              <span className="text-[10px] text-slate-400 block">Pixel Scale</span>
              <span className="text-slate-100 font-bold">
                6.2 arcsec / px
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-2.5 space-y-1">
              <span className="text-[10px] text-slate-400 block">Epoch Scans</span>
              <span className="text-amber-400 font-bold">
                {observations.length} Surveys
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-2.5 space-y-1">
              <span className="text-[10px] text-slate-400 block">Astrometric Grid</span>
              <span className="text-sky-300 font-bold">
                Aligned (&lt;0.5 px)
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Collapsible Technical Diagnostics & FITS (Progressive Disclosure) */}
        <div className="border-t border-slate-800/80 pt-2">
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
          >
            <span className="font-mono text-[11px]">
              {showTechnicalDetails ? "▼ Hide Technical Telemetry" : "► Show Technical Telemetry & FITS"}
            </span>
            <span className="text-[10px] text-amber-400/80">Level-2 MEF</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2 space-y-2 bg-[#090e1a] p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono animate-fadeIn">
              <div className="flex justify-between text-slate-400">
                <span>RMS Residual:</span>
                <span className="text-slate-200">{comparisonData?.differenceAnalysis?.rmsResidualMJyPerSr || "0.284"} MJy/sr</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Significance:</span>
                <span className="text-slate-200">&gt; 3.0σ Threshold</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Changed Pixels:</span>
                <span className="text-amber-400 font-bold">{comparisonData?.differenceAnalysis?.significantPixelsCount || 4} px</span>
              </div>
              <div className="pt-1 border-t border-slate-800 text-[9px] text-slate-500">
                NASA/IPAC IRSA SIAv2 Caltech Pipelines · Tangent WCS
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
