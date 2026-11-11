import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

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
  };
  onSelectTarget?: (targetId: string) => void;
}

const SURVEYS = [
  { id: "P/2MASS/color", name: "2MASS Near-IR (J+H+Ks)", band: "NIR 1.2-2.2 µm", desc: "Authentic near-infrared all-sky survey matching SPHEREx primary spectral bands." },
  { id: "P/allWISE/color", name: "AllWISE (W1+W2+W3+W4)", band: "MIR 3.4-22 µm", desc: "NASA Wide-field Infrared Survey Explorer mid-infrared all-sky atlas." },
  { id: "P/DSS2/color", name: "DSS2 Optical Color", band: "Optical 0.4-0.9 µm", desc: "Digitized Sky Survey optical baseline from Palomar & UK Schmidt plates." },
  { id: "P/PanSTARRS/DR1/color-z-zg-g", name: "Pan-STARRS DR1", band: "Optical/NIR g-r-i-z-y", desc: "Panoramic Survey Telescope and Rapid Response System DR1." }
];

export default function AladinSkyExplorer({ target, onSelectTarget }: SkyExplorerProps) {
  const aladinContainerRef = useRef<HTMLDivElement>(null);
  const aladinInstanceRef = useRef<any>(null);
  const footprintOverlayRef = useRef<any>(null);
  const targetMarkerRef = useRef<any>(null);

  const [aladinReady, setAladinReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState("P/2MASS/color");
  const [showFootprint, setShowFootprint] = useState(true);
  const [showCatalog, setShowCatalog] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ ra: string; dec: string }>({
    ra: target.raSexagesimal,
    dec: target.decSexagesimal
  });
  const [fovDegrees, setFovDegrees] = useState(0.25); // 15 arcminutes

  // Dynamically load Aladin Lite v3 if not yet on window
  useEffect(() => {
    let isMounted = true;

    const loadAladinScript = () => {
      if (window.A) {
        initAladin();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="aladin.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (isMounted) initAladin();
        });
        existingScript.addEventListener("error", () => {
          if (isMounted) setLoadError("Unable to reach CDS Strasbourg Aladin Lite CDN. Using authenticated fallback survey viewer.");
        });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";
      script.charset = "utf-8";
      script.async = true;
      script.onload = () => {
        if (isMounted) initAladin();
      };
      script.onerror = () => {
        if (isMounted) setLoadError("Aladin Lite CDN unreachable. Operating in offline astronomical imagery mode.");
      };
      document.head.appendChild(script);
    };

    const initAladin = () => {
      if (!window.A || !aladinContainerRef.current) return;

      const initPromise = window.A.init ? window.A.init : Promise.resolve();

      initPromise
        .then(() => {
          if (!isMounted || !aladinContainerRef.current) return;

          try {
            // Clean container if re-initializing
            aladinContainerRef.current.innerHTML = "";

            const aladin = window.A.aladin(aladinContainerRef.current, {
              survey: activeSurvey,
              fov: fovDegrees,
              target: `${target.raDeg} ${target.decDeg}`,
              cooFrame: "J2000",
              showLayersControl: true,
              showGotoControl: true,
              showZoomControl: true,
              showFullscreenControl: true,
              showReticle: true
            });

            aladinInstanceRef.current = aladin;
            setAladinReady(true);
            setLoadError(null);

            // Add SPHEREx Footprint Overlay
            updateOverlays(aladin);

            // Track coordinate hover if supported
            if (typeof aladin.on === "function") {
              aladin.on("positionChanged", (pos: any) => {
                if (pos && pos.ra && pos.dec) {
                  setCurrentCoords({
                    ra: `${pos.ra.toFixed(4)}°`,
                    dec: `${pos.dec.toFixed(4)}°`
                  });
                }
              });
            }
          } catch (err: any) {
            console.error("Aladin initialization error:", err);
            setLoadError(err.message || "Failed to initialize WebGL Aladin viewport");
          }
        })
        .catch((err: any) => {
          console.error("Aladin init promise error:", err);
          if (isMounted) setLoadError("Failed to initialize CDS astronomical libraries.");
        });
    };

    loadAladinScript();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update center position when target prop changes
  useEffect(() => {
    if (!aladinInstanceRef.current || !aladinReady) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.gotoRaDec === "function") {
        aladin.gotoRaDec(target.raDeg, target.decDeg);
      } else if (typeof aladin.gotoObject === "function") {
        aladin.gotoObject(`${target.raDeg} ${target.decDeg}`);
      }
      updateOverlays(aladin);
    } catch (e) {
      console.warn("Aladin goto target exception:", e);
    }
  }, [target.id, aladinReady]);

  // Update SPHEREx Footprint and Target Marker overlays
  const updateOverlays = (aladin: any) => {
    if (!aladin) return;
    try {
      // 1. Target Marker
      if (window.A && window.A.marker) {
        if (targetMarkerRef.current && typeof aladin.removeOverlay === "function") {
          aladin.removeOverlay(targetMarkerRef.current);
        }
        const markerLayer = window.A.graphicOverlay({ name: `${target.name} Dossier`, color: "#ff8a3d", lineWidth: 2 });
        const marker = window.A.marker(target.raDeg, target.decDeg, {
          popupTitle: `🔭 ${target.name}`,
          popupDesc: `<strong>${target.type}</strong> (${target.spectralType})<br/>RA: ${target.raSexagesimal} (${target.raDeg.toFixed(5)}°)<br/>Dec: ${target.decSexagesimal} (${target.decDeg.toFixed(5)}°)<br/>NASA SPHEREx Priority Science Target`
        });
        markerLayer.add(marker);
        aladin.addOverlay(markerLayer);
        targetMarkerRef.current = markerLayer;
      }

      // 2. SPHEREx 2048x2048 LVF Array Footprint (3.5° x 3.5° FPA detector with 6.2"/pixel)
      if (showFootprint && window.A && window.A.polygon) {
        if (footprintOverlayRef.current && typeof aladin.removeOverlay === "function") {
          aladin.removeOverlay(footprintOverlayRef.current);
        }
        const halfFov = 0.12; // 0.24 deg zoomed footprint box for target inspection
        const cosDec = Math.cos((target.decDeg * Math.PI) / 180);
        const dRa = halfFov / (cosDec || 1);
        const dDec = halfFov;

        const polyCoords = [
          [target.raDeg - dRa, target.decDeg - dDec],
          [target.raDeg + dRa, target.decDeg - dDec],
          [target.raDeg + dRa, target.decDeg + dDec],
          [target.raDeg - dRa, target.decDeg + dDec]
        ];

        const fovLayer = window.A.graphicOverlay({ name: "SPHEREx Detector Footprint", color: "#ff8a3d", lineWidth: 1.5 });
        const fovPoly = window.A.polygon(polyCoords, {
          color: "#ff8a3d",
          fill: true,
          fillColor: "rgba(255, 138, 61, 0.08)",
          lineWidth: 1.5
        });
        fovLayer.add(fovPoly);
        aladin.addOverlay(fovLayer);
        footprintOverlayRef.current = fovLayer;
      }
    } catch (err) {
      console.warn("Failed to update Aladin overlays:", err);
    }
  };

  // Change survey
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
      console.warn("Survey switch exception:", e);
    }
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!aladinInstanceRef.current) return;
    try {
      const aladin = aladinInstanceRef.current;
      if (typeof aladin.zoom === "function") {
        aladin.zoom(factor);
      } else if (typeof aladin.setFov === "function") {
        const nextFov = factor > 1 ? fovDegrees * 0.75 : fovDegrees * 1.35;
        setFovDegrees(nextFov);
        aladin.setFov(nextFov);
      }
    } catch (e) {
      console.warn("Zoom exception:", e);
    }
  };

  return (
    <div className="h-full w-full flex flex-col rounded-2xl border border-slate-800 bg-[#0d1322] shadow-xl overflow-hidden">
      {/* Top Controls Header */}
      <div className="h-12 shrink-0 border-b border-slate-800 bg-[#0b1120] px-4 flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-slate-100 font-semibold">
            Aladin Lite v3 Celestial Sky Map
          </span>
          <span className="text-slate-600">·</span>
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-300">
            {target.name} ({target.raSexagesimal}, {target.decSexagesimal})
          </span>
        </div>

        {/* Survey Layer Selector Tabs */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400 uppercase mr-1 hidden sm:inline">Survey:</span>
          {SURVEYS.map((s) => (
            <button
              key={s.id}
              onClick={() => switchSurvey(s.id)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] transition-all cursor-pointer",
                activeSurvey === s.id
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
              title={s.desc}
            >
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Action Toggles & Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !showFootprint;
              setShowFootprint(next);
              if (aladinInstanceRef.current) updateOverlays(aladinInstanceRef.current);
            }}
            className={cn(
              "rounded px-2.5 py-1 font-mono text-[10px] transition-colors cursor-pointer",
              showFootprint ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold" : "bg-slate-800 text-slate-400 hover:text-slate-200"
            )}
          >
            SPHEREx Footprint
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => handleZoom(1.5)}
            className="rounded bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="rounded bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={() => {
              if (aladinInstanceRef.current) {
                aladinInstanceRef.current.gotoRaDec(target.raDeg, target.decDeg);
                aladinInstanceRef.current.setFov(0.25);
              }
            }}
            className="rounded bg-slate-800 px-2.5 py-1 font-mono text-[10px] text-slate-300 hover:text-slate-100 cursor-pointer"
            title="Recenter on Target"
          >
            Recenter
          </button>
        </div>
      </div>

      {/* Main Aladin Lite Viewport Canvas */}
      <div className="flex-1 min-h-0 relative w-full bg-[#05060a]">
        {/* Aladin Div Container */}
        <div
          ref={aladinContainerRef}
          id="aladin-lite-div"
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Fallback Viewport if Aladin CDN fails or is offline */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#090e1a]/95 backdrop-blur-xs text-center z-20">
            <div className="max-w-md rounded-xl border border-amber-500/40 bg-[#0d1322] p-6 shadow-2xl">
              <span className="font-mono text-xs uppercase tracking-wider text-amber-400">
                Archival Survey Mode Active
              </span>
              <h4 className="mt-2 font-serif text-xl text-slate-100">
                Real All-Sky Survey: 2MASS Near-Infrared
              </h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">
                {loadError}
              </p>
              <div className="mt-4 rounded border border-slate-800 bg-black/60 p-3 font-mono text-[11px] text-left text-slate-400 space-y-1">
                <div>Target: <span className="text-slate-200">{target.name}</span></div>
                <div>Coordinates (J2000): <span className="text-amber-400">{target.raSexagesimal} {target.decSexagesimal}</span></div>
                <div>Survey Baseline: <span className="text-slate-200">2MASS J/H/Ks (1.2 - 2.2 µm)</span></div>
                <div>SPHEREx Pixel Scale: <span className="text-sky-300">6.2 arcsec / pixel</span></div>
              </div>
              <button
                onClick={() => window.open(`https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(target.name)}&survey=${encodeURIComponent(activeSurvey)}`, "_blank")}
                className="mt-4 inline-flex items-center gap-2 rounded bg-amber-500 px-4 py-2 font-mono text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Open Full CDS Sky Atlas In New Tab ↗
              </button>
            </div>
          </div>
        )}

        {/* Floating Astrometric Coordinate & Survey HUD */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-slate-800 bg-[#0d1322]/90 px-3.5 py-2 backdrop-blur-md shadow-xl text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>Target: {target.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
            <span>RA: <strong className="text-slate-200">{target.raSexagesimal}</strong></span>
            <span>Dec: <strong className="text-slate-200">{target.decSexagesimal}</strong></span>
            <span>FOV: <strong className="text-amber-400">{fovDegrees.toFixed(3)}°</strong></span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-800 text-[9px] text-amber-300">
            Active Layer: {SURVEYS.find(s => s.id === activeSurvey)?.name}
          </div>
        </div>

        {/* Quick Target Switcher Chips */}
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
                "rounded px-2.5 py-1 text-left font-mono text-[10px] backdrop-blur-md transition-all shadow-md cursor-pointer",
                target.id === t.id
                  ? "bg-amber-500 text-slate-950 font-bold border border-amber-500"
                  : "bg-[#0d1322]/80 text-slate-300 hover:text-slate-100 hover:bg-[#0d1322] border border-slate-800"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Survey Information & Scientific Legend Footer */}
      <div className="h-10 shrink-0 border-t border-slate-800 bg-[#0b1120] px-4 text-xs font-mono text-slate-400 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full border border-amber-500 bg-amber-500/30" />
            SPHEREx 6.2"/pix Footprint
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            J2000 Center
          </span>
          <span className="text-slate-300 text-[11px]">
            Survey: <span className="text-amber-300 font-semibold">{SURVEYS.find(s => s.id === activeSurvey)?.band}</span>
          </span>
        </div>
        <div className="text-[10px] text-slate-500 hidden sm:block">
          Data: CDS Strasbourg Aladin Lite v3 · HiPS All-Sky Multi-Resolution
        </div>
      </div>
    </div>
  );
}
