import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');

// 1) Drop the two phantom entries (8, 9) — no real files after renumber.
//    Line-ending agnostic (\r?\n) for Windows CRLF files.
const removed = (s.match(/[ \t]*"tag-cameramove-static-wide-(8|9)":[^\n]*\r?\n/g) || []).length;
s = s.replace(/[ \t]*"tag-cameramove-static-wide-(8|9)":[^\n]*\r?\n/g, '');

// 2) Strip the static-wide/ subfolder from the remaining URLs (0-7 now at root).
const stripped = (s.match(/videos\.aidirectorme\.com\/static-wide\//g) || []).length;
s = s.split('videos.aidirectorme.com/static-wide/').join('videos.aidirectorme.com/');

// 3) Add a visible limit of 8 (only 8 real clips -> no blank cards).
s = s.replace(/(var TAG_VISIBLE_LIMITS = \{[^}]*?)(\s*\};)/, (m, a, b) => {
  if (/"Static Wide"/.test(a)) return m;
  return a + ', "Static Wide": 8' + b;
});

writeFileSync('index.html', s);
console.log(`removed ${removed} phantom entries, stripped ${stripped} folder refs, limit set to 8`);
