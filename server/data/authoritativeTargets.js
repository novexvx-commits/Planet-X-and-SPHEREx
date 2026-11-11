/**
 * Authoritative Astronomical Targets for SPHEREx Exploration Platform
 * Verified metadata, coordinates, astrometry, physical properties, and mission context.
 */

export const AUTHORITATIVE_TARGETS = [
  {
    id: "barnards-star",
    name: "Barnard's Star",
    aliases: ["V2500 Oph", "Gliese 699", "BD+04 3561", "HIP 87937", "Gaia DR3 4472832130942585856"],
    type: "High Proper Motion M-Dwarf Star",
    subType: "Flare star / Low-mass red dwarf",
    spectralType: "M4.0V",
    raDeg: 269.452083,
    decDeg: 4.693390,
    raSexagesimal: "17h 57m 48.50s",
    decSexagesimal: "+04° 41' 36.2\"",
    distancePc: 1.8282,
    distanceLy: 5.963,
    parallaxMas: 546.976,
    parallaxErrorMas: 0.040,
    properMotionRaMasYr: -801.551,
    properMotionDecMasYr: 10362.492,
    totalProperMotionArcsecYr: 10.393,
    positionAngleDeg: 355.58,
    apparentMagV: 9.51,
    apparentMagJ: 5.24,
    apparentMagK: 4.52,
    effectiveTempK: 3134,
    massSolar: 0.144,
    radiusSolar: 0.196,
    primaryPhenomenon: "proper-motion",
    scienceDescription: "Barnard's Star has the fastest apparent proper motion of any known star across Earth's sky (~10.39 arcsec/yr). In SPHEREx's all-sky multi-epoch surveys (spaced 6 months apart), its angular displacement of ~5.2 arcsec between successive sky maps is directly resolvable across the 6.2 arcsec/pixel detector grid, serving as the benchmark standard for space-based infrared astrometry and moving source validation.",
    spherexContext: {
      qrRelease: "QR2",
      observedBandpasses: ["SPHEREx-D1", "SPHEREx-D2", "SPHEREx-D3", "SPHEREx-D4", "SPHEREx-D5", "SPHEREx-D6"],
      coverageEpochCount: 296,
      surveyCadence: "6-month full sky revisit",
      expectedDisplacementPerSurveyArcsec: 5.196,
      astrometricPrecisionArcsec: 0.35,
      pixelScaleArcsec: 6.2
    },
    references: [
      { name: "Gaia DR3", id: "4472832130942585856", url: "https://gea.esac.esa.int/archive/" },
      { name: "SIMBAD Astronomical Database", id: "V* V2500 Oph", url: "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Barnard%27s+star" },
      { name: "NASA/IPAC IRSA SPHEREx QR2", id: "spherex_qr2", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html" }
    ]
  },
  {
    id: "epsilon-indi-b",
    name: "Epsilon Indi B",
    aliases: ["HD 209100B", "WISE J220410.5-564658", "GJ 845B", "HIP 108870B"],
    type: "Binary Brown Dwarf System",
    subType: "T1V + T6V brown dwarf binary",
    spectralType: "T1 + T6",
    raDeg: 331.043750,
    decDeg: -56.782778,
    raSexagesimal: "22h 04m 10.51s",
    decSexagesimal: "-56° 46' 57.8\"",
    distancePc: 3.638,
    distanceLy: 11.865,
    parallaxMas: 274.88,
    parallaxErrorMas: 0.15,
    properMotionRaMasYr: 3961.4,
    properMotionDecMasYr: -2538.3,
    totalProperMotionArcsecYr: 4.705,
    positionAngleDeg: 122.65,
    apparentMagJ: 12.01,
    apparentMagH: 11.23,
    apparentMagK: 11.10,
    effectiveTempK: 1280,
    massJupiter: 75.0,
    primaryPhenomenon: "brown-dwarf-spectra",
    scienceDescription: "Epsilon Indi Ba and Bb form one of the nearest substellar laboratories to Earth. At temperatures of ~1280 K (Ba) and ~850 K (Bb), their atmospheres show dramatic methane (CH4) and water vapor (H2O) absorption bands across near-infrared wavelengths. SPHEREx's 102 spectral channels allow precise mapping of molecular opacities and atmospheric cloud dynamics between survey passes.",
    spherexContext: {
      qrRelease: "QR2",
      observedBandpasses: ["SPHEREx-D1", "SPHEREx-D2", "SPHEREx-D3", "SPHEREx-D4", "SPHEREx-D5", "SPHEREx-D6"],
      coverageEpochCount: 473,
      surveyCadence: "6-month all-sky scan",
      spectralFeatures: ["1.4 µm H2O vapor", "1.66 µm CH4 overtone", "2.2 µm CH4 fundamental band", "3.3 µm fundamental methane stretching"],
      spectralResolvingPower: "R ~ 35 - 130",
      observationLimitations: "Close physical separation of binary (0.7 arcsec) is unresolved at SPHEREx native 6.2 arcsec resolution; spectra represent composite Ba+Bb flux."
    },
    references: [
      { name: "SIMBAD", id: "NAME Eps Ind B", url: "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=eps+Ind+B" },
      { name: "Scholz et al. (2003)", bibcode: "2003A&A...398L..29S", title: "Discovery of nearest known brown dwarf" },
      { name: "NASA/IPAC IRSA SPHEREx QR2", id: "spherex_qr2", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html" }
    ]
  },
  {
    id: "wise-0855",
    name: "WISE 0855",
    aliases: ["WISE J085510.83-071442.5", "WISE 0855-0714"],
    type: "Ultra-Cold Y-Dwarf",
    subType: "Substellar planetary-mass brown dwarf / Water ice cloud host",
    spectralType: "Y4",
    raDeg: 133.795129,
    decDeg: -7.245147,
    raSexagesimal: "08h 55m 10.831s",
    decSexagesimal: "-07° 14' 42.53\"",
    distancePc: 2.23,
    distanceLy: 7.27,
    parallaxMas: 448.4,
    parallaxErrorMas: 8.2,
    properMotionRaMasYr: -8130.0,
    properMotionDecMasYr: 570.0,
    totalProperMotionArcsecYr: 8.150,
    positionAngleDeg: 274.0,
    apparentMagW2: 13.97,
    apparentMagJ: 25.0,
    effectiveTempK: 250,
    massJupiter: 4.5,
    primaryPhenomenon: "cold-brown-dwarf",
    scienceDescription: "WISE 0855 is the fourth-closest known system to our Sun and the coldest known object outside the Solar System (T_eff ≈ 250 K / -23°C). Due to extreme atmospheric cooling, almost all near-infrared flux below 4 µm is suppressed by molecular absorption, leaving a narrow atmospheric transmission window at 4.5 – 5.0 µm. This falls directly into SPHEREx's high-resolution Array 6 (D6, 4.42–5.00 µm, R ~ 130), allowing the detection of sub-freezing water ice clouds.",
    spherexContext: {
      qrRelease: "QR2",
      observedBandpasses: ["SPHEREx-D4", "SPHEREx-D5", "SPHEREx-D6"],
      coverageEpochCount: 352,
      thermalPeakWavelengthUm: 4.75,
      atmosphericFeatures: ["H2O ice cloud condensation", "Phosphine (PH3) non-equilibrium chemistry", "4.6-4.9 µm thermal window"],
      detectionBand: "Array 6 (4.42 - 5.00 µm)",
      scientificChallenge: "Virtually invisible in SPHEREx D1-D3 (flux < 0.1 uJy); emerges with high contrast in D6, confirming sub-freezing planetary atmosphere physics."
    },
    references: [
      { name: "Luhman (2014)", bibcode: "2014ApJ...786L..18L", title: "Discovery of a ~250 K Brown Dwarf at 2 pc from the Sun" },
      { name: "Skemer et al. (2016)", bibcode: "2016ApJ...826L..17S", title: "The First Spectrum of the Coldest Known Brown Dwarf: Water Clouds" },
      { name: "NASA/IPAC IRSA SPHEREx QR2", id: "spherex_qr2", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html" }
    ]
  },
  {
    id: "rw-aurigae",
    name: "RW Aurigae",
    aliases: ["RW Aur", "HD 242703", "HIP 23873", "Gaia DR3 162985392095811712"],
    type: "Variable Pre-Main Sequence Star",
    subType: "Classical T Tauri Binary (CTTS)",
    spectralType: "K3:e + K5Ve",
    raDeg: 76.956417,
    decDeg: 30.401417,
    raSexagesimal: "05h 07m 49.54s",
    decSexagesimal: "+30° 24' 05.1\"",
    distancePc: 163.2,
    distanceLy: 532.3,
    parallaxMas: 6.128,
    parallaxErrorMas: 0.038,
    properMotionRaMasYr: 1.84,
    properMotionDecMasYr: -21.46,
    totalProperMotionArcsecYr: 0.0215,
    apparentMagV: 10.3,
    apparentMagK: 6.8,
    periodDays: 2.77,
    primaryPhenomenon: "variable-star",
    scienceDescription: "RW Aurigae is an archetypal young binary system surrounded by a dynamic tidal stream of gas and circumstellar dust. Over recent years, it has undergone major irregular dimming events (dimming by up to 3 magnitudes) when massive dust clumps from the disrupted protoplanetary disk obscure the primary star. Multi-epoch SPHEREx spectrophotometry across 102 infrared bands measures changes in dust extinction, grain size distribution, and inner disk heating.",
    spherexContext: {
      qrRelease: "QR2",
      observedBandpasses: ["SPHEREx-D1", "SPHEREx-D2", "SPHEREx-D3", "SPHEREx-D4", "SPHEREx-D5", "SPHEREx-D6"],
      coverageEpochCount: 374,
      variabilityClass: "Irregular T Tauri variable / Protoplanetary dust occultation",
      infraredVariabilityDeltaMag: 2.35,
      colorEvolution: "Reddening during deep minima consistent with sub-micron silicate dust grains",
      lightCurveCadence: "Multi-visit coverage across SPHEREx survey passes"
    },
    references: [
      { name: "AAVSO Light Curve Database", id: "RW AUR", url: "https://www.aavso.org/vsx/index.php?view=detail.top&oid=3716" },
      { name: "Rodriguez et al. (2018)", bibcode: "2018ApJ...859..150R", title: "A Decade of Dimming in the Young Binary RW Aurigae" },
      { name: "NASA/IPAC IRSA SPHEREx QR2", id: "spherex_qr2", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html" }
    ]
  },
  {
    id: "r-draconis",
    name: "R Draconis",
    aliases: ["R Dra", "HD 149214", "HIP 79653", "AAVSO 1632+66"],
    type: "Pulsating Variable Star",
    subType: "Mira-type long-period variable (LPV)",
    spectralType: "M5e-M9e",
    raDeg: 248.167542,
    decDeg: 66.755000,
    raSexagesimal: "16h 32m 40.21s",
    decSexagesimal: "+66° 45' 18.0\"",
    distancePc: 660.0,
    distanceLy: 2152.0,
    parallaxMas: 1.515,
    parallaxErrorMas: 0.082,
    properMotionRaMasYr: 10.42,
    properMotionDecMasYr: 5.61,
    totalProperMotionArcsecYr: 0.0118,
    apparentMagV: 7.6,
    apparentMagVMin: 12.8,
    apparentMagK: 0.8,
    periodDays: 245.6,
    primaryPhenomenon: "variable-star",
    scienceDescription: "R Draconis is a high-amplitude oxygen-rich asymptotic giant branch (AGB) Mira variable star pulsating with a 245.6-day period. Radial pulsations lift outer atmospheric layers into cool regions where silicate dust and water vapor condense. SPHEREx's 6-month survey cadence monitors R Draconis across opposing phases of its pulsation cycle, enabling phase-dependent infrared spectroscopy and mass-loss rate determination.",
    spherexContext: {
      qrRelease: "QR2",
      observedBandpasses: ["SPHEREx-D1", "SPHEREx-D2", "SPHEREx-D3", "SPHEREx-D4", "SPHEREx-D5", "SPHEREx-D6"],
      coverageEpochCount: 749,
      pulsationPeriodDays: 245.6,
      infraredAmplitudeMag: 1.85,
      phaseCoverage: "Monitored across cycle minima and maxima in QR2 survey passes",
      spectralFeatures: ["Circumstellar silicate dust emission at 9.7 µm wing", "CO fundamental bands at 4.6 µm", "H2O molecular bands at 1.4 and 1.9 µm"]
    },
    references: [
      { name: "AAVSO International Variable Star Index", id: "R Dra", url: "https://www.aavso.org/vsx/index.php?view=detail.top&oid=13745" },
      { name: "Whitelock et al. (2000)", bibcode: "2000MNRAS.319..728W", title: "Near-infrared photometry of Mira variables" },
      { name: "NASA/IPAC IRSA SPHEREx QR2", id: "spherex_qr2", url: "https://irsa.ipac.caltech.edu/Missions/spherex.html" }
    ]
  }
];

export const BENCHMARK_SOLAR_SYSTEM_TARGETS = [
  {
    id: "ceres",
    name: "1 Ceres",
    type: "Dwarf Planet / Main Belt Asteroid",
    diameterKm: 939.4,
    albedo: 0.09,
    semiMajorAxisAU: 2.767,
    orbitalPeriodYears: 4.60,
    scienceTopic: "Hydrated minerals, ammonium salts, and localized water ice sublimation in SPHEREx infrared surveys."
  },
  {
    id: "vesta",
    name: "4 Vesta",
    type: "Main Belt Asteroid (Differentiated Protoplanet)",
    diameterKm: 525.4,
    albedo: 0.42,
    semiMajorAxisAU: 2.361,
    orbitalPeriodYears: 3.63,
    scienceTopic: "Pyroxene and basaltic crust mineralogy mapped via 0.9 µm and 1.9 µm absorption bands."
  },
  {
    id: "victoria",
    name: "12 Victoria",
    type: "L-type Main Belt Asteroid",
    diameterKm: 112.8,
    albedo: 0.176,
    semiMajorAxisAU: 2.334,
    orbitalPeriodYears: 3.57,
    scienceTopic: "MOST search benchmark target; moving object footprint cross-matching against SPHEREx scan schedule."
  }
];

