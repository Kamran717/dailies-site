// scripts/wire-slow-dolly-in.mjs
// Adds REAL_TAG_META entries for tag-cameramove-slow-dolly-in-0..11 into index.html,
// driven by scripts/slow-dolly-in.manifest.json. REAL_VIDEOS already has these keys.
// Run from repo root: node scripts/wire-slow-dolly-in.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const man = JSON.parse(readFileSync('scripts/slow-dolly-in.manifest.json', 'utf8'));
let s = readFileSync('index.html', 'utf8');

if (!s.includes('function assetSrc') || !s.includes('var origin = raw.slice')) {
  console.error('ABORT: index.html is not current main (missing grid/modal fix).'); process.exit(1);
}
if (s.includes('"tag-cameramove-slow-dolly-in-0": {"title"')) {
  console.log('Already wired — nothing to do.'); process.exit(0);
}

const a = '  var REAL_TAG_META = {\n';
if ((s.split(a).length - 1) !== 1) { console.error('ABORT: REAL_TAG_META anchor not found exactly once.'); process.exit(1); }

const rows = man.clips.map(c =>
  '  ' + JSON.stringify(c.id) + ': ' +
  JSON.stringify({ title: c.title, shotType: c.shotType, cameraMove: c.cameraMove, prompt: c.prompt }) + ','
);
s = s.replace(a, a + rows.join('\n') + '\n');
writeFileSync('index.html', s);
console.log(`Added ${rows.length} REAL_TAG_META entries for Slow Dolly In.`);