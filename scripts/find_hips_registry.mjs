async function findRealHipsUrls() {
  // Query CDS HiPS registry API (aladin.cds.unistra.fr/hips/list)
  const registryUrls = [
    'https://aladin.cds.unistra.fr/hips/list',
    'https://alasky.cds.unistra.fr/hips-list',
    'http://alasky.cds.unistra.fr/MOCserver/query?expr=ID=*2MASS*&fmt=json',
    'http://alasky.cds.unistra.fr/MOCserver/query?expr=ID=*DSS*&fmt=json'
  ];

  for (const reg of registryUrls) {
    try {
      console.log('Querying:', reg);
      const res = await fetch(reg, { headers: { 'Accept': 'application/json, text/plain' } });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Snippet:', text.slice(0, 300));
    } catch (e) {
      console.log('Failed:', reg, e.message);
    }
  }
}

findRealHipsUrls();

