import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function processLogo() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const imgData = fs.readFileSync('public/marsad-logo.jpg').toString('base64');
  
  await page.setContent(`
    <html>
      <body style="margin:0;background:#000;">
        <img id="src" src="data:image/jpeg;base64,${imgData}" />
        <canvas id="c"></canvas>
      </body>
    </html>
  `);

  const bounds = await page.evaluate(() => {
    const img = document.getElementById('src');
    const c = document.getElementById('c');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    
    let minY = c.height, maxY = 0, minX = c.width, maxX = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        if (brightness > 35) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    return { width: c.width, height: c.height, minX, maxX, minY, maxY };
  });

  console.log('Detected active content bounds:', bounds);

  const crops = await page.evaluate(() => {
    const img = document.getElementById('src');

    // 1. Emblem icon: the stylized 'M' with intersecting elliptical orbit and tracking reticles
    // From y=260 to y=560, centered horizontally (width 450, height 330)
    const emblemCanvas = document.createElement('canvas');
    emblemCanvas.width = 512;
    emblemCanvas.height = 512;
    const eCtx = emblemCanvas.getContext('2d');
    eCtx.fillStyle = '#05060a';
    eCtx.fillRect(0, 0, 512, 512);
    // Draw emblem centered in square
    const srcX = 140;
    const srcY = 260;
    const srcW = 444;
    const srcH = 310;
    const destW = 480;
    const destH = (srcH / srcW) * destW;
    const destX = (512 - destW) / 2;
    const destY = (512 - destH) / 2;
    eCtx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);

    // 2. Full brand badge: Emblem + 'MARSAD' + 'Detecting Moving Objects in Space'
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 640;
    badgeCanvas.height = 480;
    const bCtx = badgeCanvas.getContext('2d');
    bCtx.fillStyle = '#05060a';
    bCtx.fillRect(0, 0, 640, 480);
    // src from y=260 to y=670
    bCtx.drawImage(img, 42, 260, 640, 420, 0, 30, 640, 420);

    // 3. Favicon (64x64)
    const favCanvas = document.createElement('canvas');
    favCanvas.width = 64;
    favCanvas.height = 64;
    const favCtx = favCanvas.getContext('2d');
    favCtx.drawImage(emblemCanvas, 0, 0, 64, 64);

    return {
      emblem: emblemCanvas.toDataURL('image/png'),
      badge: badgeCanvas.toDataURL('image/png'),
      favicon: favCanvas.toDataURL('image/png')
    };
  });

  fs.writeFileSync('public/marsad-emblem.png', Buffer.from(crops.emblem.split(',')[1], 'base64'));
  fs.writeFileSync('public/marsad-badge.png', Buffer.from(crops.badge.split(',')[1], 'base64'));
  fs.writeFileSync('public/favicon.png', Buffer.from(crops.favicon.split(',')[1], 'base64'));
  fs.writeFileSync('src/assets/marsad-emblem.png', Buffer.from(crops.emblem.split(',')[1], 'base64'));
  fs.writeFileSync('src/assets/marsad-badge.png', Buffer.from(crops.badge.split(',')[1], 'base64'));

  console.log('✓ Successfully processed and generated:');
  console.log('  - public/marsad-emblem.png (emblem icon)');
  console.log('  - public/marsad-badge.png (emblem + MARSAD + subtitle)');
  console.log('  - public/favicon.png');
  await browser.close();
}

processLogo().catch(console.error);
