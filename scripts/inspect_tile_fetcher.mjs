import fs from 'fs';
const content = fs.readFileSync('public/vendor/aladin.js', 'utf8');

const fetchMatches = content.match(/fetch\([^\)]+\)/g);
console.log('Fetch calls count:', fetchMatches ? fetchMatches.length : 0);
if (fetchMatches) {
  fetchMatches.slice(0, 5).forEach(m => console.log('Fetch:', m));
}

// Check how createImageBitmap or Image() or Worker is used
console.log('Worker count:', (content.match(/new Worker/g) || []).length);
console.log('Image count:', (content.match(/new Image/g) || []).length);
console.log('createImageBitmap:', (content.match(/createImageBitmap/g) || []).length);

