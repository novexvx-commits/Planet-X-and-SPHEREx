# MARSAD: NASA SPHEREx 2026 Space Apps Challenge Exploration Platform

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA%20Space%20Apps-2026%20Challenge-orange.svg)](https://www.spaceappschallenge.org/)
[![SPHEREx Mission](https://img.shields.io/badge/Mission-NASA%20SPHEREx-blue.svg)](https://spherex.caltech.edu/)
[![IRSA Archive](https://img.shields.io/badge/Archive-NASA%2FIPAC%20IRSA-red.svg)](https://irsa.ipac.caltech.edu/Missions/spherex.html)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**MARSAD** is a complete, science-driven, production-quality web platform built for the **2026 NASA Space Apps Challenge** to explore time-dependent astronomical observations from NASA's **SPHEREx** (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) mission.

SPHEREx maps the entire celestial sphere every six months in **102 near-infrared spectral bands** (0.75 µm to 5.00 µm). This platform enables researchers, educators, and the public to navigate the infrared sky, track moving objects, detect proper motion, monitor variable stars, analyze spectral features, and conduct registered difference imaging across observation epochs.

---

## 🌌 Platform Highlights

- **Authentic NASA SPHEREx QR2 Data**: Direct programmatic integration with NASA/IPAC IRSA SIAv2 and TAP interfaces, plus byte-range access on the public AWS Open Data S3 repository (`s3://nasa-irsa-spherex`).
- **5 Required Astronomical Targets**:
  1. **Barnard's Star**: High proper motion M-dwarf star (~10.39"/yr), astrometric centroid tracking across multi-epoch sky scans, and vector displacement validation against Gaia DR3.
  2. **Epsilon Indi B**: Cold brown dwarf binary system (T1 + T6), methane ($CH_4$) and water vapor ($H_2O$) absorption features across 1.4 – 3.3 µm.
  3. **WISE 0855**: Coldest known brown dwarf ($T_{\text{eff}} \approx 250\text{ K}$), water ice cloud detection in the SPHEREx Array 6 window (4.42 – 5.00 µm).
  4. **RW Aurigae**: Classical T Tauri young variable star system, multi-epoch light curves revealing protoplanetary dust occultation events and circumstellar extinction.
  5. **R Draconis**: Mira-type long-period pulsating variable star ($P = 245.6$ days), near-infrared amplitude variation across opposing pulsation phases.
- **Interactive Sky Explorer**: CDS Strasbourg **Aladin Lite v3** WebGL celestial viewport with live all-sky surveys (**2MASS Near-IR**, **AllWISE**, **DSS2 Optical Color**), SPHEREx focal plane array footprints (2048×2048, 6.2"/pixel), J2000 coordinate grid, and Gaia DR3 reference stars.
- **Time-Based Timeline & Comparator**:
  - Chronological observation scrubber with play/pause, step controls, and adjustable playback speed (0.5× to 4×).
  - Four comparison modes: **Side-by-Side**, **Blink Comparator** (1–4 Hz), **Opacity Crossfade Overlay**, and **Astrometrically Registered Difference Imaging** ($D = (I_2 - B_2) - \alpha(I_1 - B_1)$ with $>3\sigma$ change detection).
- **Astrometric Motion Detection Engine**: Automated centroid determination, angular displacement ($\Delta \theta$), apparent velocity ($\mu$ in arcsec/yr), position angle, and statistical confidence scoring ($>5\sigma$).
- **Variable Star Spectrophotometry**: Multi-band time-series light curves across all 6 detector arrays, flux density ($\mathrm{mJy}$) vs AB magnitude toggles, photometric error bars ($\pm 1\sigma$), and instant **CSV data export**.
- **102-Band Spectral Explorer**: Complete mapping of the 6 Linear Variable Filter (LVF) detector arrays, interactive wavelength scrubber from 0.75 to 5.00 µm, and target Spectral Energy Distributions (SEDs) highlighting interstellar water ice, $CO_2$ ice, $CO$ ice, and methane.
- **Moving Object Search Tool (MOST)**: Programmatic integration with IRSA MOST for solar system asteroids (Ceres, Vesta, Victoria) and predicted survey scan intersections.
- **Scientific Provenance & Data Lineage**: Complete transparency distinguishing direct SPHEREx observations, calibrated photometry, Gaia/SIMBAD catalog data, and orbital models, with **JSON dossier export**.

---

## 🏗️ System Architecture

```
cinematic-scrollytelling-web-experience/
├── server/                                # Production Node.js / Express Backend
│   ├── server.js                          # Express server with CORS & SPA fallback
│   ├── routes/
│   │   └── api.js                         # REST API endpoints (/api/*)
│   ├── services/
│   │   ├── irsaTapService.js              # NASA/IPAC IRSA SIAv2 & TAP query client
│   │   ├── spherexService.js              # SPHEREx multi-extension FITS & metadata
│   │   ├── fitsProcessor.js               # FITS header parser & TAN WCS projection
│   │   ├── imageComparisonService.js      # Blink comparator & difference imaging
│   │   ├── motionService.js               # Centroid tracking & proper motion vectors
│   │   ├── photometryService.js           # Forced photometry & CSV export
│   │   ├── spectralService.js             # 102-band spectral channels & SED
│   │   ├── mostMovingObjectService.js     # IRSA MOST asteroid search integration
│   │   └── simbadService.js               # SIMBAD Sesame celestial name resolver
│   ├── data/
│   │   ├── authoritativeTargets.js        # Verified target astrophysics metadata
│   │   ├── spectralBands102.js            # 102 LVF bandpass specifications
│   │   └── cachedObservations.js          # Authoritative multi-epoch SPHEREx records
│   ├── utils/
│   │   └── astronomy.js                   # Coordinates, MJD, flux/mag conversions
│   └── test/
│       ├── api.test.js                    # Scientific calculation unit tests
│       └── e2e.test.js                    # End-to-end HTTP integration tests
├── src/                                   # Modern React 19 Frontend
│   ├── App.tsx                            # Root application & scrollytelling page flow
│   ├── components/
│   │   ├── Nav.tsx                        # Cinematic navigation header
│   │   └── spherex/
│   │       ├── SpherexHub.tsx             # Master scientific exploration command station
│   │       ├── AladinSkyExplorer.tsx      # Interactive celestial viewport & FOV footprint
│   │       ├── ObservationTimelineComparator.tsx # Timeline, Blink, & Difference Imaging
│   │       ├── MotionDetectionViewer.tsx  # Astrometric centroid vector plot & Gaia stats
│   │       ├── VariableStarLightCurve.tsx # Multi-band light curves & CSV download
│   │       ├── SpectralBandExplorer.tsx   # 102-band wavelength explorer & SED
│   │       ├── MostSolarSystemExplorer.tsx# IRSA MOST moving object orbit matcher
│   │       └── ProvenanceInspector.tsx    # Scientific data lineage & JSON export
│   └── sections/                          # Cinematic scrollytelling narrative
│       ├── Hero.tsx                       # WebGL 3D black hole & starfield
│       ├── Prologue.tsx                   # Narrative mission prologue
│       ├── Spacewalk.tsx                  # Three.js 3D space walk & hyperspace warp
│       ├── Telemetry.tsx                  # Cosmic Dawn lookback depth & redshift mapping
│       ├── Systems.tsx                    # SPHEREx telescope & cryogenic subsystems
│       ├── Vision.tsx                     # 3 Grand questions of cosmic science
│       ├── MissionLog.tsx                 # SPHEREx survey cadence & mission chronology
│       └── Finale.tsx                     # Open science & community research platform
├── dist/                                  # Production single-file bundle
├── package.json                           # Scripts and dependencies
└── vite.config.ts                         # Vite configuration with /api proxy
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: v18.0.0 or later (v22.x recommended)
- **npm**: v9.0.0 or later

### 1. Installation

```bash
# Clone the repository and install dependencies
git clone https://github.com/novexvx-commits/nasa_2.git
cd nasa_2
npm install
```

### 2. Run in Development Mode (Single Command)

```bash
# Starts both Express scientific backend (port 5000) and Vite frontend (port 5173) automatically
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your web browser. (Vite automatically initializes and proxies `/api` calls to `http://127.0.0.1:5000`).

### 3. Run Standalone Production Server

```bash
# Start the standalone Express server on port 5000 (serves both API and production single-file bundle)
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your web browser.

### 4. Build for Production

```bash
npm run build
```
Generates an optimized, single-file bundle in `dist/index.html`.

---

## 🧪 Scientific Validation & Testing

Run the automated scientific unit tests and end-to-end integration tests:

```bash
# 1. Scientific algorithms & 5-target calculations test (34 tests)
npm test

# 2. End-to-end server integration test suite (35 tests)
npm run test:e2e

# 3. Live dual-channel endpoint verification suite (14 direct + 14 proxied tests)
npm run test:live
```

### Test Coverage Highlights
- **Coordinate Conversion**: Exact sexagesimal $\leftrightarrow$ decimal degree transformations (RA $\pm 0.0001^{\circ}$, Dec $\pm 0.0001^{\circ}$).
- **Great-Circle Separation**: Precision angular distances via Vincenty formula.
- **Photometry Calibration**: Surface brightness ($\mathrm{MJy/sr}$) to flux density ($\mu\mathrm{Jy}$) and AB zero-point check ($3631\text{ Jy} \equiv 0.0\text{ mag}$).
- **Target Verification**: Multi-epoch centroiding, proper motion $>5\sigma$ confirmation for Barnard's Star, multi-band light curves, and 102-band SED profiles for all five targets.
- **MOST Integration**: Keplerian orbital ephemerides calculated for asteroid Ceres across SPHEREx survey epochs.

---

## 📡 Scientific API Documentation

The backend exposes clean, fully documented REST endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | System operational status and active archive release |
| `/api/targets` | `GET` | List of 5 authoritative targets + solar system benchmarks |
| `/api/target/:id` | `GET` | Full scientific dossier, coordinates, and observation count |
| `/api/search` | `GET` | Query by target name (`?q=...`) or coordinates (`?ra=...&dec=...`) |
| `/api/observations` | `GET` | Retrieve chronological observations for target or sky cone |
| `/api/timeline/:targetId` | `GET` | Chronological timeline entries across survey passes |
| `/api/image-compare` | `GET` | Side-by-side, blink frames, and difference image matrix |
| `/api/motion/:targetId` | `GET` | Centroid displacement vectors, velocity, and Gaia comparison |
| `/api/lightcurve/:targetId` | `GET` | Photometric time-series measurements across spectral bands |
| `/api/lightcurve/:targetId/csv` | `GET` | Download light curve measurements table as CSV |
| `/api/spectra/catalog` | `GET` | Full 102 spectral channels and 6 detector array parameters |
| `/api/spectra/:targetId` | `GET` | 102-point Spectral Energy Distribution (SED) for target |
| `/api/most` | `GET` | IRSA MOST query for moving asteroid/comet footprints |

---

## 🔬 Scientific Methodology

### 1. Multi-Epoch Astrometry & Proper Motion
Source centroids are determined through flux-weighted moments:
$$x_c = \frac{\sum x \cdot I(x, y)}{\sum I(x, y)}, \quad y_c = \frac{\sum y \cdot I(x, y)}{\sum I(x, y)}$$
Between survey epochs $t_1$ and $t_2$, angular displacement is computed on the celestial sphere:
$$\Delta \theta = \sqrt{(\Delta \alpha \cos \bar{\delta})^2 + (\Delta \delta)^2}$$
Apparent proper motion velocity is derived as $\mu = \Delta \theta / \Delta t$ and cross-matched against Gaia DR3 astrometric predictions.

### 2. Registered Difference Imaging
To detect true astronomical changes without instrumental artifacts:
1. Two multi-extension FITS frames are astrometrically registered to a common WCS grid.
2. Background levels $B_1, B_2$ are estimated via iterative sigma-clipping.
3. Flux scaling factor $\alpha$ is calibrated to account for varying detector throughput.
4. The difference image is computed: $D(x, y) = (I_2(x, y) - B_2) - \alpha(I_1(x, y) - B_1)$.
5. Statistically significant changes ($|D(x, y)| > 3\sigma_{\text{diff}}$) are isolated into positive (brightened/arrived) and negative (dimmed/departed) classifications.

### 3. SPHEREx 102 Spectral Channels
The 102 spectral bands are distributed across six Linear Variable Filter (LVF) detector arrays:
- **Array 1 (D1)**: 0.75 – 1.11 µm ($R \approx 41$) — Stellar classifications, Paschen lines
- **Array 2 (D2)**: 1.11 – 1.64 µm ($R \approx 41$) — J-band water vapor & brown dwarf methane
- **Array 3 (D3)**: 1.64 – 2.42 µm ($R \approx 41$) — H and K bands, interstellar water ice at 2.0 µm
- **Array 4 (D4)**: 2.42 – 3.82 µm ($R \approx 35$) — Solid water ice (3.05 µm) & aliphatic C-H (3.4 µm)
- **Array 5 (D5)**: 3.82 – 4.42 µm ($R \approx 110$) — High-resolution $CO_2$ ice fundamental band (4.27 µm)
- **Array 6 (D6)**: 4.42 – 5.00 µm ($R \approx 130$) — Carbon monoxide ice (4.67 µm) & cold Y-dwarf thermal peak

---

## 📄 License & Attribution

Developed for the **2026 NASA Space Apps Challenge**.
- SPHEREx mission data courtesy of **NASA / JPL-Caltech / IPAC Infrared Science Archive (IRSA)**.
- Astrometric reference data courtesy of the **European Space Agency (ESA) Gaia Mission**.
- Name resolution courtesy of **CDS SIMBAD / Sesame**, Strasbourg, France.
