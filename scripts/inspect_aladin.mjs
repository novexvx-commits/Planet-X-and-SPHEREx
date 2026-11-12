import fs from 'fs';

const content = fs.readFileSync('public/vendor/aladin.js', 'utf8');
console.log('File length:', content.length);

const wasm = content.match(/[\w\-\.\/]+\.wasm/g);
console.log('Wasm occurrences:', wasm);

const urls = content.match(/https?:\/\/[a-zA-Z0-9\.\_\-\/]+/g);
console.log('Unique domain count:', new Set(urls ? urls.map(u => new URL(u).hostname) : []));

// Check how it fetches HiPS or wasm
const wasmMatches = content.match(/.{0,50}\.wasm.{0,50}/g);
if (wasmMatches) {
  console.log('WASM contexts:');
  wasmMatches.slice(0, 5).forEach(m => console.log(' -', m));
}

// Check how HiPS URLs are constructed
const hipsMatches = content.match(/.{0,40}alasky.{0,60}/g);
if (hipsMatches) {
  console.log('Alasky references:');
  hipsMatches.slice(0, 5).forEach(m => console.log(' -', m));
}

