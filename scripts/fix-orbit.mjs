import { readFileSync, writeFileSync } from 'fs';
let lines = readFileSync('index.html', 'utf8').split('\n');
const re = /"tag-cameramove-orbit-left-\d+":/;
let first = -1, last = -1;
for (let i = 0; i < lines.length; i++){ if (re.test(lines[i])){ if(first===-1)first=i; last=i; } }
if (first === -1){ console.error('orbit-left block not found'); process.exit(1); }
// carry the original line ending (CRLF vs LF)
const eol = /\r$/.test(lines[first]) ? '\r' : '';
const indent = (lines[first].match(/^\s*/)||[''])[0].replace(/\r$/,'');
const clean = [];
for (let i = 0; i < 9; i++){
  clean.push(`${indent}"tag-cameramove-orbit-left-${i}": "https://videos.aidirectorme.com/tag-cameramove-orbit-left-${i}.mp4",${eol}`);
}
const before = lines.slice(0, first);
const after = lines.slice(last + 1);
let out = before.concat(clean).concat(after).join('\n');
// add visible limit 9 (only 9 real clips)
out = out.replace(/(var TAG_VISIBLE_LIMITS = \{[^}]*?)(\s*\};)/, (m,a,b) => /"Orbit Left"/.test(a) ? m : a + ', "Orbit Left": 9' + b);
writeFileSync('index.html', out);
console.log(`orbit-left: replaced ${last-first+1} lines -> 9 clean entries, limit 9`);
