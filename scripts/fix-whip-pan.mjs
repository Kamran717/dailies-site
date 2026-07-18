// fix-whip-pan.mjs — run AFTER wiring the 30 whip-pan clips.
// 1) removes legacy REAL_VIDEOS dupes for tag-cameramove-whip-pan-0..9
//    (so the -v2 curated entries win under JS last-key-wins)
// 2) sets TAG_VISIBLE_LIMITS "Whip Pan" to 30
//   node fix-whip-pan.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');
let removed = 0, miss = [];

for (let i = 0; i <= 9; i++) {
  const id = `tag-cameramove-whip-pan-${i}`;
  const re = new RegExp(
    '\\s*' + JSON.stringify(id) +
    ':\\s*"https://videos\\.aidirectorme\\.com/tag-cameramove-whip-pan-' + i + '\\.mp4",',
    'g'
  );
  const matches = s.match(re) || [];
  if (matches.length === 0) { miss.push(id); continue; }
  if (matches.length > 1) { console.error(`ABORT: ${id} legacy matched ${matches.length}x.`); process.exit(1); }
  s = s.replace(re, '');
  removed++;
}

// set the visible limit — anchor on the exact "Whip Pan": <num> inside TAG_VISIBLE_LIMITS.
// (There is only one "Whip Pan": N in the file; STYLE_OFFSET_PINS does not contain it.)
const limRe = /("Whip Pan":\s*)\d+/g;
const limMatches = s.match(limRe) || [];
if (limMatches.length !== 1) { console.error(`ABORT: "Whip Pan": N found ${limMatches.length}x (need exactly 1).`); process.exit(1); }
s = s.replace(limRe, '$130');

const v2 = (s.match(/tag-cameramove-whip-pan-\d+-v2\.mp4/g) || []).length;
const legacyLeft = (s.match(/"tag-cameramove-whip-pan-\d+":\s*"https:\/\/videos\.aidirectorme\.com\/tag-cameramove-whip-pan-\d+\.mp4"/g) || []).length;
if (v2 < 30) { console.error(`ABORT: only ${v2} -v2 entries, expected >=30. Not writing.`); process.exit(1); }

writeFileSync('index.html', s);
if (miss.length) console.warn(`Not found (already gone?): ${miss.length} ids`);
console.log(`Removed ${removed} legacy whip-pan entries (0..9). Limit "Whip Pan" set to 30.`);
console.log(`-v2 entries: ${v2}. Legacy left: ${legacyLeft} (want 0).`);
