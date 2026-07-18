// fix-handheld-b2.mjs — run AFTER wiring batch 2.
// 1) removes legacy REAL_VIDEOS dupes for tag-cameramove-handheld-push-12..26
//    (so the -v5 entries win under JS last-key-wins)
// 2) sets TAG_VISIBLE_LIMITS "Handheld Push" to 27
//   node fix-handheld-b2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');
let removed = 0, miss = [];

for (let i = 12; i <= 26; i++) {
  const id = `tag-cameramove-handheld-push-${i}`;
  const re = new RegExp(
    '\\s*' + JSON.stringify(id) +
    ':\\s*"https://videos\\.aidirectorme\\.com/tag-cameramove-handheld-push-' + i + '\\.mp4",',
    'g'
  );
  const matches = s.match(re) || [];
  if (matches.length === 0) { miss.push(id); continue; }
  if (matches.length > 1) { console.error(`ABORT: ${id} legacy matched ${matches.length}x.`); process.exit(1); }
  s = s.replace(re, '');
  removed++;
}

// set the visible limit to 27
const limRe = /("Handheld Push":\s*)\d+/;
if (!limRe.test(s)) { console.error('ABORT: "Handheld Push" limit not found.'); process.exit(1); }
s = s.replace(limRe, '$127');

// sanity: v5 entries present (15), legacy 12..26 gone (0)
const v5 = (s.match(/tag-cameramove-handheld-push-(?:1[2-9]|2[0-6])-v5\.mp4/g) || []).length;
const legacyLeft = (s.match(/"tag-cameramove-handheld-push-(?:1[2-9]|2[0-6])":\s*"https:\/\/videos\.aidirectorme\.com\/tag-cameramove-handheld-push-\d+\.mp4"/g) || []).length;
if (v5 < 15) { console.error(`ABORT: only ${v5} -v5 entries, expected >=15. Not writing.`); process.exit(1); }

writeFileSync('index.html', s);
if (miss.length) console.warn('Not found (already gone?): ' + miss.join(', '));
console.log(`Removed ${removed} legacy entries (12..26). Limit set to 27.`);
console.log(`-v5 entries: ${v5}. Legacy 12..26 left: ${legacyLeft} (want 0).`);
