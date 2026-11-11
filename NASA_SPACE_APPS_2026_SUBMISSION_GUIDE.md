# NASA Space Apps Challenge 2026
## Official Project Submission Dossier

**Project Name:** MARSAD — The SPHEREx Time-Domain Exploration Platform  
**Challenge:** NASA SPHEREx 2026: Exploring Time-Dependent Astronomical Observations  
**GitHub Repository:** [https://github.com/novexvx-commits/nasa_2](https://github.com/novexvx-commits/nasa_2)  
**Full Scientific Report:** [Download PDF Report](https://github.com/novexvx-commits/nasa_2/blob/main/NASA_SPHEREx_2026_Full_Scientific_Report.pdf)  

---

### 1. Elevator Pitch & Tagline
> **"Unveiling the Infrared Universe in Motion: Transforming NASA SPHEREx's all-sky multi-epoch spectroscopy into an interactive, scientifically rigorous exploration station for moving stars, pulsating giants, cold brown dwarfs, and cosmic biogenic ices."**

---

### 2. High-Level Project Summary (For Submission Form)

Since its launch, NASA's **SPHEREx** (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) mission has been mapping the entire celestial sphere every six months in 102 near-infrared spectral bands ($0.75 - 5.00\,\mu\text{m}$). This staggering volume of spectrophotometric data holds the key to uncovering astronomical phenomena that change over time: high proper motion stars, accretion-disk eclipses, variable stellar pulsations, cold sub-stellar brown dwarfs, and wandering asteroids.

**MARSAD** solves the core challenge of making this complex multi-epoch dataset accessible and intuitive without sacrificing mathematical and astronomical fidelity. Built with **React 19**, **Three.js**, **Express 5**, and **CDS Strasbourg's Aladin Lite v3 WebGL**, MARSAD provides an integrated scientific station where users can:
1. Revisit identical sky coordinates across six-month survey passes.
2. Execute astrometrically registered **difference imaging** ($D = (I_2 - B_2) - \alpha(I_1 - B_1)$) to isolate $>3\sigma$ transient flux variations.
3. Track **astrometric proper motion trajectories** cross-validated against ESA **Gaia DR3** microarcsecond vectors.
4. Analyze multi-band **variable star light curves** with forced aperture photometry and AB magnitude inversion.
5. Explore the entire **102-band spectral energy distribution (SED)**, identifying biogenic solid ices ($\mathrm{H_2O}$ at $3.05\,\mu\text{m}$, $\mathrm{CO_2}$ at $4.27\,\mu\text{m}$, and $\mathrm{CO}$ at $4.67\,\mu\text{m}$).
6. Query Solar System minor bodies using the **NASA/IPAC IRSA Moving Object Search Tool (MOST)**.

---

### 3. Alignment with Judging Criteria

#### A. Scientific Depth & Accuracy
- **Authentic Data Archives:** Integrates NASA/IPAC IRSA Simple Image Access (SIAv2) and Table Access Protocol (TAP) interfaces, supplemented with AWS Open Data S3 byte-range access (`s3://nasa-irsa-spherex`).
- **Standard World Coordinate System (WCS):** Employs standard Gnomonic Tangent projections (`RA---TAN`, `DEC--TAN`, $6.2''/\text{pixel}$) and 2880-byte FITS card parsing.
- **Physical Calibration:** Flux density in $\mu\mathrm{Jy}$ / $\mathrm{mJy}$, surface brightness in $\mathrm{MJy/sr}$, and standard AB magnitude zero-points ($3631\text{ Jy} \equiv 0.0\text{ mag}$).

#### B. Technical Execution & Engineering
- **Unified Lifecycle Engine:** Running `npm run dev` boots the Express 5 scientific server on port 5000 and the Vite 7 frontend on port 5173 with automatic IPv4 loopback binding, eliminating ECONNREFUSED issues.
- **Robust Test Coverage:** 100% pass rate across 69 automated unit, integration, and live proxy tests (`npm test`, `npm run test:e2e`, `npm run test:live`).
- **True WebGL Sky Atlas:** Embeds CDS Aladin Lite v3 with live HiPS survey tiles from **2MASS (Near-IR)**, **NASA AllWISE**, and **DSS2**.

#### C. User Experience & Design Excellence
- **Cinematic Narrative:** Combines interactive scrollytelling, WebGL shaders, Three.js 3D space walk, and fluid physics with a professional scientific workstation.
- **Interactive Tooling:** Synchronous blink comparator (1–4 Hz), crossfade opacity slider, interactive timeline scrubber, live pixel value HUD, and instant CSV/JSON dossier downloads.

---

### 4. Official NASA & Partner Resources Used

1. **NASA / Caltech SPHEREx Mission:** Mission instrument specifications, focal plane array parameters, and survey cadence.
2. **NASA/IPAC Infrared Science Archive (IRSA):** SPHEREx Quick Release (QR2) archives, SIAv2/TAP endpoints, and the Moving Object Search Tool (MOST).
3. **NASA Open Data on AWS:** Byte-range access on `s3://nasa-irsa-spherex`.
4. **European Space Agency (ESA) Gaia Mission:** Gaia DR3 astrometric baseline proper motion vectors.
5. **CDS Strasbourg (Centre de Données astronomiques de Strasbourg):** Aladin Lite v3 WebGL engine, HiPS 2MASS and AllWISE surveys, and the SIMBAD Sesame celestial coordinate resolver.

---

### 5. Step-by-Step Demo Script for Judges

1. **Launch the Station:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.
2. **Explore the Scrollytelling Experience:**
   Scroll through the cinematic prologue, Three.js 3D black hole horizon, and astronaut spacewalk.
3. **Open the SPHEREx Hub:**
   Click **"Explore SPHEREx Hub"** in the navigation bar to enter the scientific workstation.
4. **Inspect Target 1: Barnard's Star (High Proper Motion):**
   - Click **"Timeline & Comparator"**: Inspect the $32\times 32$ difference image matrix and click **"View FITS Cards"** to see raw header cards.
   - Click **"blink"**: Watch Barnard's Star shift positions at 2 Hz.
   - Click **"Sky Explorer (Aladin)"**: Inspect the real 2MASS Near-IR sky with the SPHEREx detector footprint.
   - Click **"Motion Detection"**: Observe the astrometric trajectory and Gaia DR3 comparison.
5. **Inspect Target 4: RW Aurigae (Variable Young Star):**
   - Click **"Variable Star Analysis"**: Examine the multi-epoch light curve, toggle **"AB Magnitude"**, and click **"Export CSV"**.
6. **Inspect Target 3: WISE 0855 (Coldest Y-Dwarf):**
   - Click **"102 Spectral Bands"**: Drag the wavelength scrubber from $0.75$ to $5.00\,\mu\text{m}$ and view the $\mathrm{H_2O}$ and $\mathrm{CO_2}$ ice absorption features.
7. **Inspect Solar System Minor Bodies:**
   - Click **"Solar System (MOST)"**: Query asteroid **Ceres** or **Vesta** to view orbital ephemerides intersecting SPHEREx passes.

