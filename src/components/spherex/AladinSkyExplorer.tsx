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
    id: "https://skies.esac.esa.int/DSSColor",
    legacyId: "P/DSS2/color",
    shortName: "DSS2",
    name: "DSS2 Optical Color",
    band: "Optical 0.4–0.9 µm",
    desc: "Digitized Sky Survey optical baseline from Palomar & UK Schmidt plates."
  },
  {
    id: "https://skies.esac.esa.int/2MASSColor",
    legacyId: "P/2MASS/color",
    shortName: "2MASS",
    name: "2MASS Near-IR (J+H+Ks)",
    band: "Near-IR 1.2–2.2 µm",
    desc: "Two Micron All-Sky Survey near-infrared imagery matching SPHEREx D2/D3 bands."
  },
  {
    id: "https://skies.esac.esa.int/AllWISEColor",
    legacyId: "P/allWISE/color",
    shortName: "AllWISE",
    name: "AllWISE (W1+W2+W3+W4)",
    band: "Mid-IR 3.4–22 µm",
    desc: "Wide-field Infrared Survey Explorer mid-infrared atlas matching SPHEREx D4–D6."
  },
  {
    id: "panstarrs",
    legacyId: "P/PanSTARRS/DR1/color-z-zg-g",
    shortName: "Pan-STARRS",
    name: "Pan-STARRS1 (PS1) DR1 Color",
    band: "Optical/NIR g–y (0.4–1.0 µm)",
    desc: "Panoramic Survey Telescope and Rapid Response System 3π Survey (δ ≥ -30°)."
  }
];

const PANSTARRS_TARGET_MAP: Record<
  string,
  {
    available: boolean;
    skycell?: string;
    imageUrl?: string;
    directFitsUrl?: string;
    reason?: string;
  }
> = {
  "barnards-star": {
    available: true,
    skycell: "1479.018",
    imageUrl:
      "https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=269.452083&dec=4.693389&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1479%2F018%2Frings.v3.skycell.1479.018.stk.g.unconv.fits",
    directFitsUrl: "https://ps1images.stsci.edu/rings.v3.skycell/1479/018/rings.v3.skycell.1479.018.stk.r.unconv.fits"
  },
  "epsilon-indi-b": {
    available: false,
    reason:
      "Declination δ = -56.78° is outside the Pan-STARRS1 3π survey observational footprint (southern horizon limit δ ≥ -30°)."
  },
  "wise-0855": {
    available: true,
    skycell: "1176.014",
    imageUrl:
      "https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=133.795125&dec=-7.245222&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1176%2F014%2Frings.v3.skycell.1176.014.stk.g.unconv.fits",
    directFitsUrl: "https://ps1images.stsci.edu/rings.v3.skycell/1176/014/rings.v3.skycell.1176.014.stk.r.unconv.fits"
  },
  "rw-aurigae": {
    available: true,
    skycell: "1947.066",
    imageUrl:
      "https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=76.95653&dec=30.40167&size=480&format=jpeg&red=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F1947%2F066%2Frings.v3.skycell.1947.066.stk.g.unconv.fits",
    directFitsUrl: "https://ps1images.stsci.edu/rings.v3.skycell/1947/066/rings.v3.skycell.1947.066.stk.r.unconv.fits"
  },
  "r-draconis": {
    available: true,
    skycell: "2526.066",
    imageUrl:
      "https://ps1images.stsci.edu/cgi-bin/fitscut.cgi?ra=248.16762&dec=66.75548&size=480&format=jpeg&red=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.y.unconv.fits&green=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.r.unconv.fits&blue=%2Frings.v3.skycell%2F2526%2F066%2Frings.v3.skycell.2526.066.stk.g.unconv.fits",
    directFitsUrl: "https://ps1images.stsci.edu/rings.v3.skycell/2526/066/rings.v3.skycell.2526.066.stk.r.unconv.fits"
  }
};

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
  const [activeSurvey, setActiveSurvey] = useState("https://skies.esac.esa.int/DSSColor");
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyNotice, setSurveyNotice] = useState<string | null>(null);
  const [showFootprint, setShowFootprint] = useState(true);
  const [showCatalogMarkers, setShowCatalogMarkers] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ ra: string; dec: string }>({
    ra: fullTarget.raSexagesimal,
    dec: fullTarget.decSexagesimal
  });
  const [fovDegrees, setFovDegrees] = useState(0.25); // 15 arcminutes
  const [panstarrsZoom, setPanstarrsZoom] = useState(1.0);
  const [panstarrsMeta, setPanstarrsMeta] = useState<any>(
    PANSTARRS_TARGET_MAP[fullTarget.id] || {
      available: fullTarget.decDeg >= -30.0,
      reason: fullTarget.decDeg < -30.0
        ? `Declination δ = ${fullTarget.decDeg.toFixed(2)}° is outside the Pan-STARRS1 3π survey footprint (southern limit δ ≥ -30°).`
        : undefined
    }
  );
  const [panstarrsLoading, setPanstarrsLoading] = useState(false);

  // Sync Pan-STARRS coverage & imagery whenever target or survey changes
  useEffect(() => {
    const mapped = PANSTARRS_TARGET_MAP[fullTarget.id];
    if (mapped) {
      setPanstarrsMeta(mapped);
      setPanstarrsLoading(false);
      return;
    }
    if (fullTarget.decDeg < -30.0) {
      setPanstarrsMeta({
        available: false,
        reason: `Declination δ = ${fullTarget.decDeg.toFixed(2)}° is outside the Pan-STARRS1 3π survey footprint (southern horizon limit δ ≥ -30°).`
      });
      setPanstarrsLoading(false);
      return;
    }
    setPanstarrsLoading(true);
    fetch(`/api/panstarrs?targetId=${fullTarget.id}&ra=${fullTarget.raDeg}&dec=${fullTarget.decDeg}`)
      .then((r) => r.json())
      .then((data) => {
        setPanstarrsMeta(data);
        setPanstarrsLoading(false);
      })
      .catch(() => {
        setPanstarrsMeta({
          available: fullTarget.decDeg >= -30.0,
          reason: fullTarget.decDeg < -30.0
            ? "Outside Pan-STARRS1 footprint (Dec < -30°)"
            : "Pan-STARRS cutout temporarily unreachable"
        });
        setPanstarrsLoading(false);
      });
  }, [fullTarget.id, fullTarget.raDeg, fullTarget.decDeg, activeSurvey]);

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
        let A = (window as any).A;
        if (!A || typeof A.aladin !== "function") {
          let mod: any;
          const runtimeImport = new Function("u", "return import(u)");
          try {
            mod = await runtimeImport("/vendor/aladin.js");
          } catch {
            try {
              mod = await runtimeImport("https://cdn.jsdelivr.net/npm/aladin-lite@3/dist/aladin.js");
            } catch (cdnErr) {
              console.warn("Failed to load Aladin Lite module from local and CDN:", cdnErr);
            }
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
    setSurveyNotice(null);
    if (surveyId === "panstarrs") {
      setSurveyLoading(false);
      return;
    }
    setSurveyLoading(true);
    if (!aladinInstanceRef.current) return;
    try {
      const aladin = aladinInstanceRef.current;
      const A = window.A;
      let layerRes: any = null;
      let surveyTarget: any = surveyId;
      if (A && typeof A.HiPS === "function" && surveyId.startsWith("http")) {
        try {
          surveyTarget = A.HiPS(surveyId);
        } catch {
          surveyTarget = surveyId;
        }
      }
      if (typeof aladin.setImageSurvey === "function") {
        layerRes = aladin.setImageSurvey(surveyTarget);
      } else if (typeof aladin.setBaseImageLayer === "function") {
        layerRes = aladin.setBaseImageLayer(surveyTarget);
      }
      if (layerRes && typeof layerRes.then === "function") {
        layerRes
          .then(() => {
            setSurveyLoading(false);
          })
          .catch((err: any) => {
            setSurveyLoading(false);
            setSurveyNotice(`Survey stream: ${err?.message || "HiPS tiles require live internet access"}`);
          });
      } else {
        setTimeout(() => setSurveyLoading(false), 700);
      }
    } catch (e: any) {
      setSurveyLoading(false);
      setSurveyNotice(`Notice switching survey: ${e?.message || "error switching survey"}`);
    }
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (activeSurvey === "panstarrs") {
      setPanstarrsZoom((prev) => Math.max(0.6, Math.min(3.5, factor > 1 ? prev * 1.3 : prev / 1.3)));
      return;
    }
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
    setPanstarrsZoom(1.0);
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

        {/* Pan-STARRS1 (PS1) DR1 Color Overlay & Coverage Handler */}
        {activeSurvey === "panstarrs" && (
          <div className="absolute inset-0 z-15 flex items-center justify-center bg-[#05060a]">
            {panstarrsMeta && !panstarrsMeta.available ? (
              /* Pan-STARRS Coverage Unavailable Banner (e.g. Epsilon Indi B at Dec < -30°) */
              <div className="p-6 max-w-lg w-full text-center space-y-4">
                <div className="rounded-2xl border border-amber-500/50 bg-[#0d1424] p-6 shadow-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300 uppercase">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Pan-STARRS1 Coverage Unavailable
                  </div>
                  <h3 className="font-serif text-2xl text-bone">
                    {fullTarget.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    Target declination <strong className="text-amber-300">δ = {fullTarget.decDeg >= 0 ? `+${fullTarget.decDeg.toFixed(2)}` : fullTarget.decDeg.toFixed(2)}°</strong> is outside the Pan-STARRS1 3π survey footprint. Pan-STARRS1 operated from Haleakala Observatory, Hawaii (+20° 42′ N) with an observational horizon cutoff at <strong className="text-white">δ ≥ -30°</strong>. Deep southern celestial objects were physically below the observatory horizon.
                  </p>
                  <div className="rounded-lg border border-slate-800 bg-[#070b14] p-3 text-left font-mono text-xs text-slate-300 space-y-1">
                    <div>Target ICRS: <strong className="text-white">{fullTarget.raSexagesimal} · {fullTarget.decSexagesimal}</strong></div>
                    <div>Survey Limit: <strong className="text-amber-400">δ ≥ -30.0° (Haleakala, Hawaii)</strong></div>
                    <div className="text-emerald-400">Available All-Sky: DSS2 (Optical), 2MASS (Near-IR), AllWISE (Mid-IR)</div>
                  </div>
                  <div className="pt-2 text-xs text-slate-400 font-mono">
                    Select a survey with full all-sky southern coverage:
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono text-xs">
                    <button
                      onClick={() => switchSurvey("https://skies.esac.esa.int/DSSColor")}
                      className="rounded-xl bg-ember px-4 py-2 font-bold text-ink hover:bg-ember-soft transition-colors cursor-pointer"
                    >
                      Switch to DSS2 Optical
                    </button>
                    <button
                      onClick={() => switchSurvey("https://skies.esac.esa.int/2MASSColor")}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      Switch to 2MASS Near-IR
                    </button>
                    <button
                      onClick={() => switchSurvey("https://skies.esac.esa.int/AllWISEColor")}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      Switch to AllWISE Mid-IR
                    </button>
                  </div>
                </div>
              </div>
            ) : panstarrsMeta?.imageUrl ? (
              /* Real Authentic Pan-STARRS1 Color Image Display */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
                <img
                  src={panstarrsMeta.imageUrl}
                  alt={`Pan-STARRS1 DR1 color cutout for ${fullTarget.name}`}
                  className="max-h-[88%] max-w-[88%] object-contain rounded-xl shadow-2xl transition-transform duration-200"
                  style={{ transform: `scale(${panstarrsZoom})` }}
                  loading="eager"
                />

                {/* SPHEREx Sub-Array Reticle Overlay */}
                {showFootprint && (
                  <div className="absolute pointer-events-none w-36 h-36 border-2 border-ember/70 rounded-xs flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-ember/80" />
                    <span className="absolute -top-5 left-1 font-mono text-[9px] text-ember tracking-wider uppercase bg-black/60 px-1 py-0.5 rounded-xs">
                      SPHEREx Sub-Array
                    </span>
                  </div>
                )}

                {/* Catalog Marker */}
                {showCatalogMarkers && (
                  <div className="absolute pointer-events-none flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full border border-ion/80 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-ion" />
                    </div>
                    <span className="font-mono text-[10px] text-ion bg-black/75 px-1.5 py-0.5 rounded-sm mt-1 border border-ion/40">
                      {fullTarget.name}
                    </span>
                  </div>
                )}

                {/* Top-left Info Badge */}
                <div className="absolute top-4 left-4 font-mono text-xs bg-[#090e1a]/95 border border-slate-700/80 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-2xl text-slate-300 space-y-1 max-w-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-white font-semibold">Pan-STARRS1 (PS1) DR1 Color</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Skycell: <strong className="text-sky-300">{panstarrsMeta.skycell || "PS1"}</strong> · Filters: <strong className="text-amber-300">y (red), r (green), g (blue)</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Scale: ~0.25″/px · Archive: NASA STScI MAST
                  </div>
                  {panstarrsMeta.directFitsUrl && (
                    <div className="pt-1">
                      <a
                        href={panstarrsMeta.directFitsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ember hover:underline text-[11px] flex items-center gap-1"
                      >
                        Download Raw PS1 FITS from STScI ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Loading cutout state */
              <div className="flex items-center justify-center p-6">
                <div className="rounded-xl border border-slate-700 bg-[#0d1424] px-6 py-4 font-mono text-sm text-amber-300 shadow-2xl flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <span>Loading Pan-STARRS1 DR1 Cutout from NASA STScI MAST...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State Overlay */}
        {initializing && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-xs z-20 pointer-events-none">
            <div className="rounded-xl border border-slate-700 bg-[#0d1424] px-6 py-4 font-mono text-sm text-amber-300 shadow-2xl">
              Loading Aladin Lite v3 WebGL2 HiPS Survey Imagery...
            </div>
          </div>
        )}

        {/* Survey Switching Loading Pill */}
        {surveyLoading && !initializing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-amber-500/40 bg-[#090e1a]/95 px-4 py-1.5 font-mono text-xs text-amber-300 shadow-xl backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>Loading {currentSurveyMeta.name} HiPS Tiles...</span>
          </div>
        )}

        {/* Survey Stream Notice Pill */}
        {surveyNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl border border-amber-500/50 bg-[#0d1424]/95 px-4 py-2 font-mono text-xs text-amber-200 shadow-2xl backdrop-blur-md max-w-md">
            <span className="text-amber-400 font-bold">INFO:</span>
            <span className="truncate">{surveyNotice}</span>
            <button onClick={() => setSurveyNotice(null)} className="ml-auto text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                  Retry Sky Map Initialization ↻
                </button>
                <button
                  onClick={() => {
                    handleRetryAladin();
                    switchSurvey("https://skies.esac.esa.int/DSSColor");
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Switch to DSS2 HiPS Mirror ↻
                </button>
                <a
                  href={`https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(
                    `${fullTarget.raDeg} ${fullTarget.decDeg}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 font-mono text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
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
