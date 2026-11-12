import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { getLocalTargetById } from "../../lib/scientificFallback";

declare global {
  interface Window {
    A?: any;
  }
}

interface SkyExplorerProps {
  target: {
    id: string;
    name: string;
    raDeg: number;
    decDeg: number;
    raSexagesimal: string;
    decSexagesimal: string;
    type: string;
    spectralType: string;
    distancePc?: number;
    distanceLy?: number;
    totalProperMotionArcsecYr?: number;
    positionAngleDeg?: number;
    astrometricCatalog?: string;
    astrometricCatalogId?: string;
  };
  onSelectTarget?: (targetId: string) => void;
}

const SURVEYS = [
  {
    id: "P/2MASS/color",
    shortName: "2MASS",
    name: "2MASS Near-IR (J+H+Ks)",
    band: "Near-IR 1.2–2.2 µm",
    desc: "Two Micron All-Sky Survey near-infrared imagery matching SPHEREx D2/D3 bands."
  },
  {
    id: "P/allWISE/color",
    shortName: "AllWISE",
    name: "AllWISE (W1+W2+W3+W4)",
    band: "Mid-IR 3.4–22 µm",
    desc: "Wide-field Infrared Survey Explorer mid-infrared atlas matching SPHEREx D4–D6."
  },
  {
    id: "P/DSS2/color",
    shortName: "DSS2",
    name: "DSS2 Optical Color",
    band: "Optical 0.4–0.9 µm",
    desc: "Digitized Sky Survey optical baseline from Palomar & UK Schmidt plates."
  },
  {
    id: "P/PanSTARRS/DR1/color-z-zg-g",
    shortName: "Pan-STARRS",
    name: "Pan-STARRS DR1",
    band: "Optical/NIR g–y",
    desc: "Panoramic Survey Telescope and Rapid Response System DR1."
  }
];

export default function AladinSkyExplorer({ target, onSelectTarget }: SkyExplorerProps) {
  const fullTarget = { ...getLocalTargetById(target.id), ...target };
  const aladinContainerRef = useRef<HTMLDivElement>(null);
  const aladinInstanceRef = useRef<any>(null);
  const footprintOverlayRef = useRef<any>(null);
  const targetCatalogRef = useRef<any>(null);

  const [aladinReady, setAladinReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeSurvey, setActiveSurvey] = useState("P/2MASS/color");
  const [showFootprint, setShowFootprint] = useState(true);
  const [showCatalogMarkers, setShowCatalogMarkers] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ ra: string; dec: string }>({
    ra: fullTarget.raSexagesimal,
    dec: fullTarget.decSexagesimal
  });
  const [fovDegrees, setFovDegrees] = useState(0.25); // 15 arcminutes

  // Keep coordinate display synced when target changes
  useEffect(() => {
    setCurrentCoords({
      ra: fullTarget.raSexagesimal,
      dec: fullTarget.decSexagesimal
    });
  }, [fullTarget.id, fullTarget.raSexagesimal, fullTarget.decSexagesimal]);

  // Initialize Aladin Lite v3.8.2 ES Module + WebAssembly/WebGL2 engine
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    setInitializing(true);
    setLoadError(null);

    timeoutId = setTimeout(() => {
      if (isMounted && !aladinInstanceRef.current) {
        setInitializing(false);
        setAladinReady(false);
        setLoadError(
          "Aladin Lite v3 initialization timed out (WebGL2 context or HiPS tile server did not respond within 10 seconds)."
        );
      }
    }, 10000);

    const bootAladin = async () => {
      try {
        let A = window.A;
        if (!A || typeof A.aladin !== "function") {
          let mod: any;
          try {
            const localModuleUrl = "/vendor/aladin.js";
            mod = await import(/* @vite-ignore */ localModuleUrl);
          } catch {
            const cdnModuleUrl = "https://cdn.jsdelivr.net/npm/aladin-lite@3/dist/aladin.js";
            mod = await import(/* @vite-ignore */ cdnModuleUrl);
          }
          A = mod?.default || mod;
          if (!A || typeof A.aladin !== "function") {
            throw new Error("Aladin Lite v3 ES module did not export a valid API object.");
          }
          window.A = A;
        }

        if (A.init) {
          await A.init;
        }

        if (!isMounted || !aladinContainerRef.current) return;

        // Ensure layout dimensions are committed before WebGL2 canvas creation
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!isMounted || !aladinContainerRef.current) return;

        aladinContainerRef.current.innerHTML = "";

        const aladin = A.aladin(aladinContainerRef.current, {
          survey: activeSurvey,
          fov: fovDegrees,
          target: `${fullTarget.raDeg} ${fullTarget.decDeg}`,
          cooFrame: "ICRS",
          showLayersControl: true,
          showGotoControl: true,
          showZoomControl: true,
          showFullscreenControl: true,
          showReticle: true
        });

        aladinInstanceRef.current = aladin;
        if (timeoutId) clearTimeout(timeoutId);
        setAladinReady(true);
        setInitializing(false);
        setLoadError(null);

        updateOverlays(aladin, showFootprint, showCatalogMarkers);

        if (typeof aladin.on === "function") {
          aladin.on("positionChanged", (pos: any) => {
            if (isMounted && pos && typeof pos.ra === "number" && typeof pos.dec === "number") {
              setCurrentCoords({
                ra: `${pos.ra.toFixed(5)}°`,
                dec: `${pos.dec.toFixed(5)}°`
              });
            }
          });
          aladin.on("zoomChanged", (fov: any) => {
            if (isMounted && typeof fov === "number" && !isNaN(fov)) {
              setFovDegrees(fov);
            }
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (timeoutId) clearTimeout(timeoutId);
        const msg =
          typeof err === "string"
            ? err
            : err?.message || "Failed to initialize Aladin Lite v3 WebGL2 sky survey engine.";
        setInitializing(false);
        setAladinReady(false);
        setLoadError(msg);
      }
    };

    if (!(window as any).__marsadAladinRejectionGuard) {
      (window as any).__marsadAladinRejectionGuard = true;
      window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
        const reasonStr = String(event?.reason?.message || event?.reason || "");
        if (
          !reasonStr ||
          reasonStr === "undefined" ||
          reasonStr.includes("Failed to fetch") ||
          reasonStr.includes("NetworkError") ||
          reasonStr.includes("Load failed")
        ) {
          event.preventDefault();
        }
      });
    }

    bootAladin();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      aladinInstanceRef.current = null;
    };
  }, [retryCount]);

  // Update target center and overlays when target or toggle controls change
  useEffect(() => {
    if (!aladinInstanceRef.current || !aladinReady) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.gotoRaDec === "function") {
        aladin.gotoRaDec(fullTarget.raDeg, fullTarget.decDeg);
      } else if (typeof aladin.gotoObject === "function") {
        aladin.gotoObject(`${fullTarget.raDeg} ${fullTarget.decDeg}`);
      }
      updateOverlays(aladin, showFootprint, showCatalogMarkers);
    } catch (e) {
      console.warn("Aladin target update warning:", e);
    }
  }, [fullTarget.id, fullTarget.raDeg, fullTarget.decDeg, aladinReady, showFootprint, showCatalogMarkers]);

  // Manage Aladin Lite v3 Catalog Marker and SPHEREx Sub-Array Polygon Overlays
  const updateOverlays = (aladin: any, footprintVisible: boolean, markersVisible: boolean) => {
    const A = window.A;
    if (!aladin || !A) return;
    try {
      if (typeof aladin.removeOverlays === "function") {
        aladin.removeOverlays();
      }
      footprintOverlayRef.current = null;
      targetCatalogRef.current = null;

      // 1. Target Catalog Marker (using A.catalog + A.marker as required by Aladin Lite v3)
      if (markersVisible && typeof A.catalog === "function" && typeof A.marker === "function") {
        const cat = A.catalog({
          name: `${fullTarget.name} (${fullTarget.astrometricCatalog || "ICRS"})`,
          color: "#6ce5ff",
          sourceSize: 14
        });
        const marker = A.marker(
          fullTarget.raDeg,
          fullTarget.decDeg,
          {
            popupTitle: `${fullTarget.name} (${fullTarget.spectralType})`,
            popupDesc: `Type: ${fullTarget.type}<br/>Distance: ${fullTarget.distancePc} pc (${fullTarget.distanceLy} ly)<br/>RA: ${fullTarget.raSexagesimal} (${fullTarget.raDeg.toFixed(5)}°)<br/>Dec: ${fullTarget.decSexagesimal} (${fullTarget.decDeg.toFixed(5)}°)`
          }
        );
        if (typeof cat.addSources === "function") {
          cat.addSources([marker]);
        }
        if (typeof aladin.addCatalog === "function") {
          aladin.addCatalog(cat);
        }
        targetCatalogRef.current = cat;
      }

      // 2. SPHEREx Sub-Array Inspection Reticle Polygon (using A.graphicOverlay + A.polygon)
      if (footprintVisible && typeof A.graphicOverlay === "function" && typeof A.polygon === "function") {
        const halfFov = 0.08; // 9.6 arcmin inspection box
        const cosDec = Math.max(0.1, Math.cos((fullTarget.decDeg * Math.PI) / 180));
        const dRa = halfFov / cosDec;
        const dDec = halfFov;

        const polyCoords = [
          [fullTarget.raDeg - dRa, fullTarget.decDeg - dDec],
          [fullTarget.raDeg + dRa, fullTarget.decDeg - dDec],
          [fullTarget.raDeg + dRa, fullTarget.decDeg + dDec],
          [fullTarget.raDeg - dRa, fullTarget.decDeg + dDec]
        ];

        const fovLayer = A.graphicOverlay({
          name: "SPHEREx Sub-Array Reticle",
          color: "#ff8a3d",
          lineWidth: 2
        });
        const fovPoly = A.polygon(polyCoords, {
          color: "#ff8a3d",
          lineWidth: 2
        });
        if (typeof fovLayer.addFootprints === "function") {
          fovLayer.addFootprints([fovPoly]);
        } else if (typeof fovLayer.add === "function") {
          fovLayer.add(fovPoly);
        }
        if (typeof aladin.addOverlay === "function") {
          aladin.addOverlay(fovLayer);
        }
        footprintOverlayRef.current = fovLayer;
      }

      if (typeof aladin.showReticle === "function") {
        aladin.showReticle(footprintVisible || markersVisible);
      }
    } catch (err) {
      console.warn("Aladin overlay update warning:", err);
    }
  };

  // Switch active HiPS survey
  const switchSurvey = (surveyId: string) => {
    setActiveSurvey(surveyId);
    if (!aladinInstanceRef.current) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.setImageSurvey === "function") {
        aladin.setImageSurvey(surveyId);
      } else if (typeof aladin.setBaseImageLayer === "function") {
        aladin.setBaseImageLayer(surveyId);
      }
    } catch (e) {
      console.warn("Survey switch warning:", e);
    }
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    const nextFov = Math.max(0.02, Math.min(15, factor > 1 ? fovDegrees * 0.68 : fovDegrees * 1.45));
    setFovDegrees(nextFov);
    if (!aladinInstanceRef.current) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.setFoV === "function") {
        aladin.setFoV(nextFov);
      } else if (typeof aladin.setFov === "function") {
        aladin.setFov(nextFov);
      } else if (factor > 1 && typeof aladin.increaseZoom === "function") {
        aladin.increaseZoom();
      } else if (factor < 1 && typeof aladin.decreaseZoom === "function") {
        aladin.decreaseZoom();
      }
    } catch (e) {
      console.warn("Zoom warning:", e);
    }
  };

  // Recenter on current target
  const handleRecenter = () => {
    setFovDegrees(0.25);
    setCurrentCoords({
      ra: fullTarget.raSexagesimal,
      dec: fullTarget.decSexagesimal
    });
    if (!aladinInstanceRef.current) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.gotoRaDec === "function") {
        aladin.gotoRaDec(fullTarget.raDeg, fullTarget.decDeg);
      }
      if (typeof aladin.setFoV === "function") {
        aladin.setFoV(0.25);
      } else if (typeof aladin.setFov === "function") {
        aladin.setFov(0.25);
      }
    } catch (e) {
      console.warn("Recenter warning:", e);
    }
  };

  const handleRetryAladin = () => {
    aladinInstanceRef.current = null;
    setAladinReady(false);
    setLoadError(null);
    setInitializing(true);
    setRetryCount((c) => c + 1);
  };

  const currentSurveyMeta = SURVEYS.find((s) => s.id === activeSurvey) || SURVEYS[0];

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b101d] shadow-2xl overflow-hidden">
      {/* Section Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0d1424] px-6 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-semibold",
                loadError
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  loadError ? "bg-amber-400" : "bg-emerald-400"
                )}
              />
              {loadError ? "UNAVAILABLE" : "REAL OBSERVATION"}
            </span>
            <span className="font-mono text-xs text-slate-400">
              CDS Strasbourg Aladin Lite v3.8 · Multi-Resolution HiPS Survey Atlas
            </span>
          </div>
          <h2 className="font-serif text-2xl text-bone">
            Interactive Celestial Sky Map — {fullTarget.name}
          </h2>
        </div>

        {/* Survey Selector & Viewport Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Survey Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#070b14] p-1">
            <span className="px-2 font-mono text-xs text-slate-400">Survey:</span>
            {SURVEYS.map((s) => (
              <button
                key={s.id}
                onClick={() => switchSurvey(s.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-xs transition-all cursor-pointer",
                  activeSurvey === s.id
                    ? "bg-ember text-ink font-bold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                )}
                title={s.desc}
              >
                {s.shortName}
              </button>
            ))}
          </div>

          {/* Reticle, Markers & Zoom Controls */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#070b14] p-1">
            <button
              onClick={() => setShowFootprint((prev) => !prev)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                showFootprint
                  ? "bg-ember/20 text-ember border border-ember/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Toggle SPHEREx sub-array inspection box"
            >
              SPHEREx Reticle
            </button>
            <button
              onClick={() => setShowCatalogMarkers((prev) => !prev)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                showCatalogMarkers
                  ? "bg-ion/20 text-ion border border-ion/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Toggle ICRS target catalog marker"
            >
              Catalog Markers
            </button>
            <div className="h-4 w-px bg-slate-800 mx-0.5" />
            <button
              onClick={() => handleZoom(1.5)}
              className="rounded-lg bg-slate-800/80 px-3 py-1.5 font-mono text-xs font-bold text-bone hover:bg-slate-700 cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => handleZoom(0.7)}
              className="rounded-lg bg-slate-800/80 px-3 py-1.5 font-mono text-xs font-bold text-bone hover:bg-slate-700 cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={handleRecenter}
              className="rounded-lg bg-slate-800/80 px-3 py-1.5 font-mono text-xs text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
              title="Recenter on target coordinates"
            >
              Recenter
            </button>
          </div>
        </div>
      </div>

      {/* Main Aladin Lite v3 WebGL2 Viewport */}
      <div className="relative h-[560px] w-full bg-[#05060a]">
        <div
          ref={aladinContainerRef}
          id="aladin-lite-div"
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Loading State Overlay */}
        {initializing && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-xs z-20 pointer-events-none">
            <div className="rounded-xl border border-slate-700 bg-[#0d1424] px-6 py-4 font-mono text-sm text-amber-300 shadow-2xl">
              Loading Aladin Lite v3 WebGL2 HiPS Survey Imagery...
            </div>
          </div>
        )}

        {/* Honest Error / Retry State (Never fakes a star map) */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#070b14]/95 z-20">
            <div className="max-w-lg rounded-2xl border border-amber-500/40 bg-[#0d1424] p-6 text-center shadow-2xl space-y-4">
              <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300 uppercase">
                UNAVAILABLE — Aladin Lite v3 WebGL2 Viewport Error
              </span>
              <h3 className="font-serif text-2xl text-bone">
                {fullTarget.name} ({fullTarget.spectralType})
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">{loadError}</p>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4 font-mono text-xs text-left text-slate-300 space-y-1.5">
                <div>
                  Target: <strong className="text-white">{fullTarget.name}</strong> ({fullTarget.type})
                </div>
                <div>
                  ICRS Coordinates:{" "}
                  <strong className="text-amber-300">
                    {fullTarget.raSexagesimal} · {fullTarget.decSexagesimal}
                  </strong>
                </div>
                <div>
                  Decimal (J2000): RA {fullTarget.raDeg.toFixed(5)}°, Dec {fullTarget.decDeg.toFixed(5)}°
                </div>
                <div>
                  Distance: <strong className="text-sky-300">{fullTarget.distancePc} pc ({fullTarget.distanceLy} ly)</strong>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  onClick={handleRetryAladin}
                  className="rounded-xl bg-ember px-5 py-2.5 font-mono text-xs font-bold text-ink hover:bg-ember-soft transition-colors cursor-pointer"
                >
                  Retry Aladin Sky Map Initialization ↻
                </button>
                <a
                  href={`https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(
                    `${fullTarget.raDeg} ${fullTarget.decDeg}`
                  )}&survey=${encodeURIComponent(activeSurvey)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 font-mono text-xs text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Open External CDS Atlas ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Clean Target & Coordinate HUD (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-700/80 bg-[#090e1a]/90 px-4 py-3 backdrop-blur-md shadow-xl font-mono text-xs space-y-1">
          <div className="flex items-center gap-2 text-white font-semibold">
            <span className="h-2 w-2 rounded-full bg-ion" />
            <span>
              {fullTarget.name} · {fullTarget.spectralType} ({fullTarget.distancePc} pc)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span>
              RA: <strong className="text-white">{currentCoords.ra}</strong>
            </span>
            <span>
              Dec: <strong className="text-white">{currentCoords.dec}</strong>
            </span>
            <span>
              FOV: <strong className="text-amber-300">{fovDegrees.toFixed(3)}°</strong>
            </span>
          </div>
          <div className="text-slate-400">
            Active Survey: <span className="text-amber-200">{currentSurveyMeta.name}</span> ({currentSurveyMeta.band})
          </div>
        </div>

        {/* Quick Target Switcher Pills (Top-Right) */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
          {[
            { id: "barnards-star", name: "Barnard's Star" },
            { id: "epsilon-indi-b", name: "Epsilon Indi B" },
            { id: "wise-0855", name: "WISE 0855" },
            { id: "rw-aurigae", name: "RW Aurigae" },
            { id: "r-draconis", name: "R Draconis" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTarget && onSelectTarget(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-left font-mono text-xs backdrop-blur-md transition-all shadow-md cursor-pointer",
                fullTarget.id === t.id
                  ? "bg-ember text-ink font-bold border border-ember"
                  : "bg-[#090e1a]/85 text-slate-200 hover:bg-[#0d1424] border border-slate-700/80"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Concise 3-Item Scientific Footer */}
      <div className="border-t border-slate-800 bg-[#090e1a] px-6 py-3.5 font-mono text-xs text-slate-300 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-xs border border-ember bg-ember/30" />
            SPHEREx Full FOV: 3.5° × 11.3° (6.15″/px native detector scale)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-ion" />
            Catalog Reference: {fullTarget.astrometricCatalog || "ESA Gaia DR3"}
          </span>
        </div>
        <span className="text-slate-400">
          Survey Provenance: CDS Strasbourg HiPS · {currentSurveyMeta.name}
        </span>
      </div>
    </div>
  );
}
