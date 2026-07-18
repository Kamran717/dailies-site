import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('tag-lighting-golden-hour-rim-0')) { console.error('ABORT: already wired'); process.exit(1); }
const limOld = 'var TAG_VISIBLE_LIMITS = { "Slow Dolly In": 100, "Handheld Push": 46, "Crane Rise": 33, "Whip Pan": 10 };';
const limNew = 'var TAG_VISIBLE_LIMITS = { "Slow Dolly In": 100, "Handheld Push": 46, "Crane Rise": 33, "Whip Pan": 10, "Golden Hour Rim": 12 };';
must(s.includes(limOld),'TAG_VISIBLE_LIMITS'); s=s.replace(limOld,limNew); rep.push('1: visible limit 12 for Golden Hour Rim');
const rvOpen='var REAL_VIDEOS = {';
must(s.includes(rvOpen),'REAL_VIDEOS');
let lines=rvOpen;
for(let n=0;n<12;n++){ lines += `\n    "tag-lighting-golden-hour-rim-${n}": "https://videos.aidirectorme.com/tag-lighting-golden-hour-rim-${n}.mp4",`; }
s=s.replace(rvOpen, lines); rep.push('2: 12 golden-hour-rim REAL_VIDEOS entries');
writeFileSync('index.html', s);
console.log(rep.join('\n'));