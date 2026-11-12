async function testHipsHosts() {
  const urls = [
    'https://alaskybis.cds.unistra.fr/2MASS/Color/properties',
    'https://alasky.cds.unistra.fr/2MASS/Color/properties',
    'https://alasky.unistra.fr/2MASS/Color/properties',
    'https://hips.cds.unistra.fr/2MASS/Color/properties',
    'https://alasky.cds.unistra.fr/DSS/DSSColor/properties',
    'https://alasky.cds.unistra.fr/AllWISE/color/properties',
    'https://alasky.cds.unistra.fr/Pan-STARRS/DR1/color-z-zg-g/properties'
  ];

  for (const u of urls) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(u, { signal: controller.signal });
      clearTimeout(id);
      const text = await res.text();
      console.log(`[SUCCESS] (${Date.now() - t0}ms) ${u} -> status: ${res.status}, length: ${text.length}`);
      console.log('Sample properties:', text.split('\n').slice(0, 3).join(' | '));
    } catch (err) {
      console.log(`[FAILED] (${Date.now() - t0}ms) ${u} -> ${err.message}`);
    }
  }
}

testHipsHosts();
