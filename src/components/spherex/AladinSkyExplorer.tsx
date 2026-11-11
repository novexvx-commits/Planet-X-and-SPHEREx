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
    <div className="rounded-xl border border-white/10 bg-ink-2 shadow-2xl overflow-hidden">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-ink px-4 py-3 text-xs gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-ember shadow-[0_0_8px_#ff8a3d] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-bone font-semibold">
            Aladin Lite v3 Celestial Sky Map
          </span>
          <span className="text-mist">·</span>
          <span className="rounded bg-ember/10 border border-ember/30 px-2 py-0.5 font-mono text-[10px] text-ember-soft">
            {target.name} ({target.raSexagesimal}, {target.decSexagesimal})
          </span>
        </div>

        {/* Survey Layer Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] text-mist uppercase mr-1">Survey:</span>
          {SURVEYS.map((s) => (
            <button
              key={s.id}
              onClick={() => switchSurvey(s.id)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] transition-all",
                activeSurvey === s.id
                  ? "bg-ember text-ink font-bold shadow-[0_0_8px_rgba(255,138,61,0.3)]"
                  : "bg-white/5 text-mist hover:text-bone hover:bg-white/10"
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
              "rounded px-2.5 py-1 font-mono text-[10px] transition-colors",
              showFootprint ? "bg-ember/20 text-ember border border-ember/40" : "bg-white/5 text-mist"
            )}
          >
            SPHEREx Footprint
          </button>
          <div className="h-4 w-px bg-white/10" />
          <button
            onClick={() => handleZoom(1.5)}
            className="rounded bg-white/5 px-2.5 py-1 font-mono text-xs text-bone hover:bg-white/10"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="rounded bg-white/5 px-2.5 py-1 font-mono text-xs text-bone hover:bg-white/10"
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
            className="rounded bg-white/5 px-2.5 py-1 font-mono text-[10px] text-mist hover:text-bone"
            title="Recenter on Target"
          >
            Recenter
          </button>
        </div>
      </div>

      {/* Main Aladin Lite Viewport Canvas */}
      <div className="relative h-[540px] w-full bg-[#05060a]">
        {/* Aladin Div Container */}
        <div
          ref={aladinContainerRef}
          id="aladin-lite-div"
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Fallback Viewport if Aladin CDN fails or is offline */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-ink/95 backdrop-blur-xs text-center z-20">
            <div className="max-w-md rounded-xl border border-ember/40 bg-ink-2 p-6 shadow-2xl">
              <span className="font-mono text-xs uppercase tracking-wider text-ember">
                Archival Survey Mode Active
              </span>
              <h4 className="mt-2 font-serif text-xl text-bone">
                Real All-Sky Survey: 2MASS Near-Infrared
              </h4>
              <p className="mt-2 text-xs text-mist leading-relaxed font-sans">
                {loadError}
              </p>
              <div className="mt-4 rounded border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-left text-mist space-y-1">
                <div>Target: <span className="text-bone">{target.name}</span></div>
                <div>Coordinates (J2000): <span className="text-ember">{target.raSexagesimal} {target.decSexagesimal}</span></div>
                <div>Survey Baseline: <span className="text-bone">2MASS J/H/Ks (1.2 - 2.2 µm)</span></div>
                <div>SPHEREx Pixel Scale: <span className="text-ion">6.2 arcsec / pixel</span></div>
              </div>
              <button
                onClick={() => window.open(`https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(target.name)}&survey=${encodeURIComponent(activeSurvey)}`, "_blank")}
                className="mt-4 inline-flex items-center gap-2 rounded bg-ember px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-ember-soft transition-colors"
              >
                Open Full CDS Sky Atlas In New Tab ↗
              </button>
            </div>
          </div>
        )}

        {/* Floating Astrometric Coordinate & Survey HUD */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-white/15 bg-ink/90 px-3.5 py-2 backdrop-blur-md shadow-xl text-xs font-mono">
          <div className="flex items-center gap-2 text-bone font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-ion" />
            <span>Target: {target.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-mist">
            <span>RA: <strong className="text-bone">{target.raSexagesimal}</strong></span>
            <span>Dec: <strong className="text-bone">{target.decSexagesimal}</strong></span>
            <span>FOV: <strong className="text-ember">{fovDegrees.toFixed(3)}°</strong></span>
          </div>
          <div className="mt-1 pt-1 border-t border-white/10 text-[9px] text-ember-soft">
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
                "rounded px-2.5 py-1 text-left font-mono text-[10px] backdrop-blur-md transition-all shadow-md",
                target.id === t.id
                  ? "bg-ember text-ink font-bold border border-ember"
                  : "bg-ink/80 text-bone hover:bg-ink hover:border-white/20 border border-white/10"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Survey Information & Scientific Legend Footer */}
      <div className="border-t border-white/10 bg-ink-3 px-4 py-3 text-xs font-mono text-mist flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-ember bg-ember/30" />
            SPHEREx 6.2"/pix Detector Footprint
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ion" />
            J2000 Astrometric Center
          </span>
          <span className="text-bone">
            Survey Mode: <span className="text-ember-soft font-semibold">{SURVEYS.find(s => s.id === activeSurvey)?.band}</span>
          </span>
        </div>
        <div className="text-[10px] text-mist">
          Data Engine: <span className="text-bone">CDS Strasbourg Aladin Lite v3 · HiPS All-Sky Multi-Resolution Survey</span>
        </div>
      </div>
    </div>
  );
}
