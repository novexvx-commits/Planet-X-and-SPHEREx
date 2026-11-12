async function scanSkiesSurveys() {
  const candidates = [
    '2MASSColor',
    'DSSColor',
    'AllWISEColor',
    'PanSTARRS',
    'PanSTARRS/DR1/color',
    'Panstarrs/color',
    'SDSS9Color',
    'SDSSColor',
    'SDSS/color',
    'Gaia/EDR3/density',
    'Gaia/DR3/density',
    'Gaia/color',
    'Planck/color',
    'Fermi/color',
    'HST/color',
    'Spitzer/color'
  ];

  for (const c of candidates) {
    try {
      const u = `https://skies.esac.esa.int/${c}/properties`;
      const res = await fetch(u);
      if (res.status === 200) {
        const text = await res.text();
        const title = text.split('\n').find(l => l.startsWith('obs_title') || l.startsWith('creator_did'));
        console.log(`[FOUND 200] ${c} -> ${title}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

scanSkiesSurveys();
