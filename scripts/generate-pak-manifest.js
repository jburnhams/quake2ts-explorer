import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const MANIFEST_FILE = path.join(PUBLIC_DIR, 'pak-manifest.json');

function scanPaks(dir, rootDir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(scanPaks(filePath, rootDir));
    } else {
      if (file.toLowerCase().endsWith('.pak')) {
        // Get relative path from public root, e.g. "baseq2/pak0.pak"
        const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        results.push(relativePath);
      }
    }
  });

  return results;
}

console.log('Scanning for PAK files in public/...');
if (!fs.existsSync(PUBLIC_DIR)) {
  console.error('public directory not found!');
  process.exit(1);
}

const paks = scanPaks(PUBLIC_DIR, PUBLIC_DIR);

const manifest = {
  paks: paks
};

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
console.log(`Generated ${MANIFEST_FILE} with ${paks.length} PAKs.`);
