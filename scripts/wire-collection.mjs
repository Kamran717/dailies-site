// scripts/wire-collection.mjs
// Generic collection wirer. Reads a manifest and injects REAL_VIDEOS +
// REAL_TAG_META and sets that collection's TAG_VISIBLE_LIMITS.
//   node scripts/wire-collection.mjs scripts/<name>.manifest.json
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = process.argv[2];
if (!manifestPath) { console.error('Pass a manifest path.'); process.exit(1); }
const man = JSON.parse(readFileSync(manifestPath, 'utf8'));
const BASE = 'https://videos.aidirectorme.com';
const limitKey = man.limit_key;
const limit = man.visible_limit || 12;
if (!limitKey) { console.error('Manifest missing "limit_key".'); process.exit(1); }

let s = readFileSync('index.html', 'utf8');
if (!s.includes('function assetSrc') || !s.includes('var origin = raw.slice')) { console.error('ABORT: not current main.'); process.exit(1); }
const firstId = man.clips[0].id;
if (s.includes(JSON.stringify(firstId) + ': {"title"')) { console.log('Already wired — nothing to do.'); process.exit(0); }

const rv = man.clips.map(c => '  ' + JSON.stringify(c.id) + ': ' + JSON.stringify(`${BASE}/${c.r2_key}`) + ',').join('\n') + '\n';
const rtm = man.clips.map(c => '  ' + JSON.stringify(c.id) + ': ' +
  JSON.stringify({ title: c.title, shotType: c.shotType, cameraMove: c.cameraMove, prompt: c.prompt }) + ',').join('\n') + '\n';

const aRV = '  var REAL_VIDEOS = {\n';
const aRTM = '  var REAL_TAG_META = {\n';
for (const [name, a] of [['REAL_VIDEOS', aRV], ['REAL_TAG_META', aRTM]]) {
  if ((s.split(a).length - 1) !== 1) { console.error(`ABORT: ${name} anchor not found once.`); process.exit(1); }
}
s = s.replace(aRV, aRV + rv).replace(aRTM, aRTM + rtm);

const limitOpen = 'var TAG_VISIBLE_LIMITS = { ';
if ((s.split(limitOpen).length - 1) !== 1) { console.error('ABORT: TAG_VISIBLE_LIMITS anchor not found once.'); process.exit(1); }
if (!s.includes(JSON.stringify(limitKey) + ':')) {
  s = s.replace(limitOpen, limitOpen + JSON.stringify(limitKey) + ': ' + limit + ', ');
}
writeFileSync('index.html', s);
console.log(`Wired ${man.clips.length} clips for "${limitKey}" (REAL_VIDEOS + REAL_TAG_META + limit ${limit}).`);