async function testPanstarrs() {
  const urls = [
    'https://alasky.cds.unistra.fr/PanSTARRS/DR1/color/properties',
    'https://alasky.cds.unistra.fr/PanSTARRS/DR1/color-z-zg-g/properties',
    'https://alasky.cds.unistra.fr/PanSTARRS/DR1/color-i-r-g/properties',
    'https://skies.esac.esa.int/PanSTARRS/DR1/color/properties'
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(`[STATUS ${res.status}] ${u}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('Sample:', text.slice(0, 100));
      }
    } catch (e) {
      console.log('Error:', u, e.message);
    }
  }
}
testPanstarrs();
