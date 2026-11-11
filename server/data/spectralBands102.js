/**
 * SPHEREx 102 Near-Infrared Spectral Bands Reference Data
 * Derived from NASA/JPL/Caltech SPHEREx Instrument Science specifications.
 * 6 Linear Variable Filter (LVF) Focal Plane Arrays (D1 to D6) covering 0.75 to 5.00 microns.
 */

export const DETECTOR_ARRAYS = [
  {
    id: "D1",
    name: "Array 1 (LVF 1)",
    wavelengthMinUm: 0.75,
    wavelengthMaxUm: 1.11,
    resolvingPower: 41,
    spectralBandsCount: 17,
    primaryScience: "Galaxy redshift survey (z ~ 0.5-1.5), H-alpha emission, stellar classifications",
    keyFeatures: ["Paschen lines", "0.94 µm H2O vapor", "TiO stellar bands"]
  },
  {
    id: "D2",
    name: "Array 2 (LVF 2)",
    wavelengthMinUm: 1.11,
    wavelengthMaxUm: 1.64,
    resolvingPower: 41,
    spectralBandsCount: 17,
    primaryScience: "J-band continuum, Brown dwarf methane & water absorption, Cosmic Near-IR Background",
    keyFeatures: ["1.15 µm H2O", "1.4 µm CH4/H2O window", "Paschen-beta", "1.6 µm H- opacity minimum"]
  },
  {
    id: "D3",
    name: "Array 3 (LVF 3)",
    wavelengthMinUm: 1.64,
    wavelengthMaxUm: 2.42,
    resolvingPower: 41,
    spectralBandsCount: 17,
    primaryScience: "H and K bands, Interstellar water ice, H2 vibrational lines, Brown dwarf ammonia",
    keyFeatures: ["2.0 µm H2O ice absorption", "2.12 µm H2 1-0 S(1)", "2.3 µm CO first overtone"]
  },
  {
    id: "D4",
    name: "Array 4 (LVF 4)",
    wavelengthMinUm: 2.42,
    wavelengthMaxUm: 3.82,
    resolvingPower: 35,
    spectralBandsCount: 17,
    primaryScience: "Interstellar water ice feature, aliphatic hydrocarbon (C-H) stretching at 3.4 µm",
    keyFeatures: ["3.05 µm H2O solid ice absorption", "3.3 µm PAH aromatic", "3.4 µm aliphatic C-H"]
  },
  {
    id: "D5",
    name: "Array 5 (LVF 5)",
    wavelengthMinUm: 3.82,
    wavelengthMaxUm: 4.42,
    resolvingPower: 110,
    spectralBandsCount: 17,
    primaryScience: "High-resolution Carbon Dioxide (CO2) ice band profiling, Cold brown dwarf continuum",
    keyFeatures: ["4.27 µm CO2 ice fundamental absorption", "4.05 µm Brackett-alpha"]
  },
  {
    id: "D6",
    name: "Array 6 (LVF 6)",
    wavelengthMinUm: 4.42,
    wavelengthMaxUm: 5.00,
    resolvingPower: 130,
    spectralBandsCount: 17,
    primaryScience: "High-resolution Carbon Monoxide (CO) and XCN ice bands, Coldest Y-dwarf thermal flux",
    keyFeatures: ["4.67 µm CO solid ice", "4.62 µm XCN ice feature", "WISE 0855 4.7 µm thermal peak"]
  }
];

// Generate the 102 individual spectral bands with center wavelengths and bandwidths
export const SPHEREX_102_BANDS = [];

let bandIndex = 1;
DETECTOR_ARRAYS.forEach((array) => {
  const { id, wavelengthMinUm, wavelengthMaxUm, resolvingPower, spectralBandsCount } = array;
  const ratio = Math.pow(wavelengthMaxUm / wavelengthMinUm, 1 / spectralBandsCount);
  
  let currentLambda = wavelengthMinUm * Math.sqrt(ratio);
  for (let i = 0; i < spectralBandsCount; i++) {
    const centerUm = currentLambda;
    const deltaLambda = centerUm / resolvingPower;
    const bandName = `SPHEREx-${id}-B${String(i + 1).padStart(2, '0')}`;
    
    SPHEREX_102_BANDS.push({
      index: bandIndex,
      detector: id,
      detectorName: array.name,
      bandName,
      centerWavelengthUm: parseFloat(centerUm.toFixed(4)),
      minWavelengthUm: parseFloat((centerUm - deltaLambda / 2).toFixed(4)),
      maxWavelengthUm: parseFloat((centerUm + deltaLambda / 2).toFixed(4)),
      bandwidthUm: parseFloat(deltaLambda.toFixed(4)),
      resolvingPower,
      primaryFeatures: array.keyFeatures[i % array.keyFeatures.length]
    });
    
    bandIndex++;
    currentLambda *= ratio;
  }
});

