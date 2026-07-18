// fix-crane-rise.mjs — run AFTER wiring the 30 crane-rise clips.
// 1) removes legacy REAL_VIDEOS dupes for tag-cameramove-crane-rise-0..32
//    (so the -v2 curated entries win, and old slots 30..32 disappear)
// 2) sets TAG_VISIBLE_LIMITS "Crane Rise" to 30
//   node fix-crane-rise.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');
let removed = 0, miss = [];

for (let i = 0; i <= 32; i++) {
  const id = `tag-cameramove-crane-rise-${i}`;
  const re = new RegExp(
    '\\s*' + JSON.stringify(id) +
    ':\\s*"https://videos\\.aidirectorme\\.com/tag-cameramove-crane-rise-' + i + '\\.mp4",',
    'g'
  );
  const matches = s.match(re) || [];
  if (matches.length === 0) { miss.push(id); continue; }
  if (matches.length > 1) { console.error(`ABORT: ${id} legacy matched ${matches.length}x.`); process.exit(1); }
  s = s.replace(re, '');
  removed++;
}

const limRe = /("Crane Rise":\s*)\d+/;
if (!limRe.test(s)) { console.error('ABORT: "Crane Rise" limit not found.'); process.exit(1); }
s = s.replace(limRe, '$130');

const v2 = (s.match(/tag-cameramove-crane-rise-\d+-v2\.mp4/g) || []).length;
const legacyLeft = (s.match(/"tag-cameramove-crane-rise-\d+":\s*"https:\/\/videos\.aidirectorme\.com\/tag-cameramove-crane-rise-\d+\.mp4"/g) || []).length;
if (v2 < 30) { console.error(`ABORT: only ${v2} -v2 entries, expected >=30. Not writing.`); process.exit(1); }

writeFileSync('index.html', s);
if (miss.length) console.warn(`Not found (already gone?): ${miss.length} ids`);
console.log(`Removed ${removed} legacy crane-rise entries (0..32). Limit set to 30.`);
console.log(`-v2 entries: ${v2}. Legacy left: ${legacyLeft} (want 0).`);
