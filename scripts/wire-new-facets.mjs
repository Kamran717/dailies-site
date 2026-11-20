// scripts/wire-new-facets.mjs
// Wires the multi-chip manifest from the Nov 2026 scene categories into
// index.html: REAL_VIDEOS + REAL_TAG_META for every clip, and a visible
// Same anchors as wire-collection.mjs, but one manifest can span many chips
// (each clip carries its own facet and limit_key = chip name).
//   node scripts/wire-new-facets.mjs scripts/new-facets-nov26.manifest.json
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = process.argv[2];
if (!manifestPath) { console.error('Pass a manifest path.'); process.exit(1); }
const man = JSON.parse(readFileSync(manifestPath, 'utf8'));
const BASE = 'https://videos.aidirectorme.com';

let s = readFileSync('index.html', 'utf8');
if (!s.includes('var USECASE_CHIPS')) { console.error('ABORT: run scripts/add-new-facets.mjs first.'); process.exit(1); }

const todo = man.clips.filter(c => !s.includes(JSON.stringify(c.id) + ': {"title"'));
if (!todo.length) { console.log('Already wired — nothing to do.'); process.exit(0); }

const rv = todo.map(c => '  ' + JSON.stringify(c.id) + ': ' + JSON.stringify(`${BASE}/${c.r2_key}`) + ',').join('\n') + '\n';
const rtm = todo.map(c => '  ' + JSON.stringify(c.id) + ': ' +
  JSON.stringify({ title: c.title, shotType: c.shotType, cameraMove: c.cameraMove, prompt: c.prompt }) + ',').join('\n') + '\n';

const aRV = '  var REAL_VIDEOS = {\n';
const aRTM = '  var REAL_TAG_META = {\n';
for (const [name, a] of [['REAL_VIDEOS', aRV], ['REAL_TAG_META', aRTM]]) {
  if ((s.split(a).length - 1) !== 1) { console.error(`ABORT: ${name} anchor not found once.`); process.exit(1); }
}
s = s.replace(aRV, aRV + rv).replace(aRTM, aRTM + rtm);

// No TAG_VISIBLE_LIMITS entry: a collection only ever shows clips that have
// REAL_TAG_META (the __meta filter), and the default cap is 10. So adding the
// next clip of a chip later needs no limit change.

writeFileSync('index.html', s);
console.log(`Wired ${todo.length} clips across ${new Set(todo.map(c => c.limit_key)).size} chips.`);
