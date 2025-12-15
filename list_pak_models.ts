import { PakArchive } from 'quake2ts/engine';
import fs from 'fs';

const buffer = fs.readFileSync('public/pak.pak');
const archive = new PakArchive('test', buffer.buffer);
console.log(archive.list().filter(f => f.endsWith('.md2') || f.endsWith('.md3')).slice(0, 10));
