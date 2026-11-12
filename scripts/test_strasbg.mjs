async function testStrasbg() {
  const urls = [
    'https://alasky.u-strasbg.fr/2MASS/Color/properties',
    'https://alasky.u-strasbg.fr/DSS/DSSColor/properties',
    'https://alasky.u-strasbg.fr/AllWISE/color/properties',
    'https://alasky.u-strasbg.fr/Pan-STARRS/DR1/color-z-zg-g/properties',
    'https://alasky.u-strasbg.fr/Pan-STARRS/DR1/color-i-r-g/properties',
    'https://skies.esac.esa.int/2MASSColor/properties',
    'https://skies.esac.esa.int/DSSColor/properties',
    'https://skies.esac.esa.int/AllWISEColor/properties'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      console.log(`[STATUS ${res.status}] ${u}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('   Properties:', text.split('\n').slice(0, 2).join(' | '));
      }
    } catch (e) {
      console.log(`[ERROR] ${u} -> ${e.message}`);
    }
  }
}

testStrasbg();
