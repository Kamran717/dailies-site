// scripts/wire-aching-nostalgia.mjs
// Injects the Aching Nostalgia collection wiring into index.html, driven by
// scripts/aching-nostalgia.manifest.json. Run from repo root: node scripts/wire-aching-nostalgia.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://videos.aidirectorme.com';
const cardMeta = {
  0:['Slow Dolly In','Medium Shot'], 1:['Handheld Push','Close-Up'],
  2:['Static Wide','Wide Shot'],     3:['Slow Dolly In','Medium Shot'],
  4:['Slow Dolly In','Medium Shot'], 5:['Slow Dolly In','Wide Shot'],
  6:['Slow Dolly In','Medium Shot'], 7:['Static Wide','Wide Shot'],
  8:['Slow Dolly In','Medium Shot'], 9:['Slow Dolly In','Wide Shot'],
  10:['Slow Dolly In','Wide Shot'],  11:['Tracking Side','Wide Shot'],
};

const man = JSON.parse(readFileSync('scripts/aching-nostalgia.manifest.json', 'utf8'));
let s = readFileSync('index.html', 'utf8');

if (s.includes('"tag-emotion-aching-nostalgia-0"')) { console.log('Already wired — nothing to do.'); process.exit(0); }
if (!s.includes('function assetSrc')) { console.error('ABORT: index.html is missing the grid fix (assetSrc) — not current main.'); process.exit(1); }
if (!s.includes('var origin = raw.slice')) { console.error('ABORT: index.html is missing the modal fix — not current main.'); process.exit(1); }

const rv = [], rtm = [];
for (const c of man.clips) {
  const [cam, shot] = cardMeta[c.index];
  rv.push('  ' + JSON.stringify(c.id) + ': ' + JSON.stringify(`${BASE}/${c.r2_key}`) + ',');
  rtm.push('  ' + JSON.stringify(c.id) + ': ' + JSON.stringify({ title: c.title, shotType: shot, cameraMove: cam, prompt: c.prompt }) + ',');
}

const a1 = '  var REAL_VIDEOS = {\n';
const a2 = '  var REAL_TAG_META = {\n';
const a3 = '    var TAG_VISIBLE_LIMITS = { "Slow Dolly In": 100,';
for (const [name, a, n] of [['REAL_VIDEOS', a1], ['REAL_TAG_META', a2], ['TAG_VISIBLE_LIMITS', a3]]) {
  if ((s.split(a).length - 1) !== 1) { console.error(`ABORT: anchor for ${name} not found exactly once.`); process.exit(1); }
}
s = s.replace(a1, a1 + rv.join('\n') + '\n');
s = s.replace(a2, a2 + rtm.join('\n') + '\n');
s = s.replace(a3, '    var TAG_VISIBLE_LIMITS = { "Aching Nostalgia": 12, "Slow Dolly In": 100,');

writeFileSync('index.html', s);
console.log('Wired 12 REAL_VIDEOS + 12 REAL_TAG_META + TAG_VISIBLE_LIMITS["Aching Nostalgia"]=12.');