async function queryEsaList() {
  const urls = [
    'https://skies.esac.esa.int/hips-list',
    'https://skies.esac.esa.int/MocServer/query?fmt=json',
    'https://skies.esac.esa.int/2MASS/properties',
    'https://skies.esac.esa.int/TwoMASS/Color/properties',
    'https://skies.esac.esa.int/WISE/color/properties',
    'https://skies.esac.esa.int/AllWISE/properties'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(`[STATUS ${res.status}] ${u}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('Sample:', text.slice(0, 150));
      }
    } catch (e) {
      console.log('Error:', u, e.message);
    }
  }
}

queryEsaList();

