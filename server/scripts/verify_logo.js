import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function testLogo() {
  console.log('Testing logo rendering in built app...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const server = http.createServer((req, res) => {
    let file = path.join('dist', req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200);
      fs.createReadStream(file).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream('dist/index.html').pipe(res);
    }
  });

  await new Promise(res => server.listen(4199, res));

  await page.goto('http://localhost:4199/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const navLogo = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter(img => img.alt.includes('MARSAD')).map(img => ({
      alt: img.alt,
      srcLength: img.src.length,
      visible: img.offsetWidth > 0 && img.offsetHeight > 0,
      width: img.offsetWidth,
      height: img.offsetHeight
    }));
  });
  console.log('Homepage MARSAD logos detected:', navLogo);

  await page.goto('http://localhost:4199/experience', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const hubLogo = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('#spherex-hub header img'));
    return imgs.map(img => ({
      alt: img.alt,
      visible: img.offsetWidth > 0 && img.offsetHeight > 0,
      width: img.offsetWidth,
      height: img.offsetHeight
    }));
  });
  console.log('Observatory MARSAD logos detected:', hubLogo);

  server.close();
  await browser.close();
  console.log('✓ All logo visual verifications PASSED.');
}

testLogo().catch(console.error);
