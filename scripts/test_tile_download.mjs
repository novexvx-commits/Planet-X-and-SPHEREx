async function testTileDownload() {
  const tileUrls = [
    'https://skies.esac.esa.int/DSSColor/Norder3/Dir0/Npix10.jpg',
    'https://skies.esac.esa.int/2MASSColor/Norder3/Dir0/Npix10.jpg',
    'https://skies.esac.esa.int/AllWISEColor/Norder3/Dir0/Npix10.jpg',
    'https://skies.esac.esa.int/SDSS9Color/Norder3/Dir0/Npix10.jpg'
  ];

  for (const u of tileUrls) {
    try {
      const res = await fetch(u);
      console.log(`[STATUS ${res.status}] ${u} -> Content-Type: ${res.headers.get('content-type')}, length: ${res.headers.get('content-length')}`);
    } catch (e) {
      console.log('Error:', u, e.message);
    }
  }
}

testTileDownload();

