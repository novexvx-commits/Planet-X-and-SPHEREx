async function testEsaSkies() {
  const urls = [
    'https://skies.esac.esa.int/2MASS/Color/properties',
    'https://skies.esac.esa.int/DSSColor/properties',
    'https://skies.esac.esa.int/AllWISE/color/properties',
    'https://skies.esac.esa.int/Pan-STARRS/DR1/color-z-zg-g/properties'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(`[STATUS ${res.status}] ${u}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('Sample properties:', text.split('\n').slice(0, 5).join(' | '));
      }
    } catch (e) {
      console.log('Failed:', u, e.message);
    }
  }
}

testEsaSkies();
