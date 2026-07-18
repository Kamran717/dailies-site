// fix-handheld-legacy.mjs — remove the 12 stale legacy video-map entries
// (tag-cameramove-handheld-push-0..11 -> plain -N.mp4) so the REAL_VIDEOS -v4
// entries are the only source for those ids. Leaves -v4 lines and -12..-45 alone.
//   node fix-handheld-legacy.mjs
import { readFileSync, writeFileSync } from 'node:fs';
let s = readFileSync('index.html', 'utf8');
let removed = 0, keep12plus = 0, miss = [];

for (let i = 0; i <= 11; i++) {
  const id = `tag-cameramove-handheld-push-${i}`;
  // Match ONLY the legacy line: "id": ".../tag-cameramove-handheld-push-i.mp4",
  // The negative lookahead (?!-v4) guarantees we never touch the -v4 REAL_VIDEOS line.
  const re = new RegExp(
    '\\s*' + JSON.stringify(id) +
    ':\\s*"https://videos\\.aidirectorme\\.com/tag-cameramove-handheld-push-' + i + '\\.mp4",',
    'g'
  );
  const before = s.length;
  const matches = s.match(re) || [];
  if (matches.length === 0) { miss.push(id); continue; }
  if (matches.length > 1) { console.error(`ABORT: ${id} legacy line matched ${matches.length}x (expected 1).`); process.exit(1); }
  s = s.replace(re, '');
  removed++;
}

// sanity: -v4 entries must still be present (12), and -0.mp4 legacy gone (0)
const v4 = (s.match(/tag-cameramove-handheld-push-\d+-v4\.mp4/g) || []).length;
const legacyLeft = (s.match(/"tag-cameramove-handheld-push-([0-9]|1[01])":\s*"https:\/\/videos\.aidirectorme\.com\/tag-cameramove-handheld-push-\d+\.mp4"/g) || []).length;

if (miss.length) console.warn('Not found (already gone?): ' + miss.join(', '));
if (v4 < 12) { console.error(`ABORT: only ${v4} -v4 entries present, expected >=12. Not writing.`); process.exit(1); }

writeFileSync('index.html', s);
console.log(`Removed ${removed} legacy handheld-push entries (-0..-11).`);
console.log(`-v4 entries intact: ${v4}. Legacy -0..-11 still present: ${legacyLeft} (want 0).`);
