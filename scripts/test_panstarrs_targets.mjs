async function testMastPs1() {
  const targets = [
    { name: "Barnards Star", ra: 269.452083, dec: 4.693389 },
    { name: "RW Aurigae", ra: 76.95875, dec: 30.401389 },
    { name: "R Draconis", ra: 248.1675, dec: 66.755 },
    { name: "WISE 0855", ra: 133.795, dec: -7.245 },
    { name: "Epsilon Indi B", ra: 331.04375, dec: -56.782778 }
  ];
  for (const t of targets) {
    const url = `https://ps1images.stsci.edu/cgi-bin/ps1cutouts?pos=${t.ra}+${t.dec}&filter=color`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      const hasJpeg = text.includes('.jpg');
      console.log(`[MAST PS1] ${t.name}: status=${res.status}, hasJpeg=${hasJpeg}`);
      const match = text.match(/href="([^"]+\.jpg)"/i) || text.match(/src="([^"]+\.jpg)"/i);
      if (match) {
        console.log(`  -> URL: ${match[1]}`);
      }
    } catch (e) {
      console.log(`[MAST PS1] ${t.name}: Error ${e.message}`);
    }
  }
}
testMastPs1();
