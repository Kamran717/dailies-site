import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('tag-lighting-neon-wash-0')) { console.error('ABORT: already wired'); process.exit(1); }
const limOld = '"Whip Pan": 10, "Golden Hour Rim": 12 };';
const limNew = '"Whip Pan": 10, "Golden Hour Rim": 12, "Neon Wash": 12 };';
must(s.includes(limOld),'limits obj'); s=s.replace(limOld,limNew); rep.push('1: visible limit 12 for Neon Wash');
const rvOpen='var REAL_VIDEOS = {';
must(s.includes(rvOpen),'REAL_VIDEOS');
let lines=rvOpen;
for(let n=0;n<12;n++){ lines += `\n    "tag-lighting-neon-wash-${n}": "https://videos.aidirectorme.com/tag-lighting-neon-wash-${n}.mp4",`; }
s=s.replace(rvOpen, lines); rep.push('2: 12 neon-wash REAL_VIDEOS entries');
const metaOpen='var REAL_TAG_META = {';
must(s.includes(metaOpen),'REAL_TAG_META');
const nw=[
  [0,2,'Rain & Neon','Wide Shot','Static Wide','A rain-slicked city street at night glowing with pink and blue neon signs, reflections shimmering on the wet pavement. Neon wash lighting, moody, saturated color.'],
  [3,5,'Chrome & Cyan','Wide Shot','Slow Dolly In','An empty retro diner at night, pink and cyan neon tubes reflecting off chrome counters and vinyl booths. Neon wash lighting, moody, saturated color.'],
  [6,8,'Arcade Glow','Wide Shot','Tracking Side','A retro arcade at night, rows of glowing neon game cabinets casting pink and blue light across the floor. Neon wash lighting, moody, saturated color.'],
  [9,11,'Puddle Sign','Close-Up','Slow Dolly In','A neon storefront sign glowing pink and blue reflected in a rain puddle on the sidewalk, ripples distorting the light. Neon wash lighting, moody, saturated color.'],
];
let entries='';
for(const [a,b,title,shot,cam,prompt] of nw){ for(let n=a;n<=b;n++){ entries += `\n  "tag-lighting-neon-wash-${n}": ${JSON.stringify({title,shotType:shot,cameraMove:cam,prompt})},`; } }
s=s.replace(metaOpen, metaOpen + entries); rep.push('3: neon-wash real prompts in REAL_TAG_META');
writeFileSync('index.html', s);
console.log(rep.join('\n'));