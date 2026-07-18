import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const before = (s.match(/"tag-lighting-neon-wash-\d+": \{[^}]*\},/g)||[]).length;
must(before>0,'no neon entries found');
s = s.replace(/\n\s*"tag-lighting-neon-wash-\d+": \{[^}]*\},/g, '');
rep.push('1: removed '+before+' old neon entries');
const N='Neon wash lighting, moody, saturated color.';
const rows=[
  ['Rain & Neon','Wide Shot','Static Wide','A rain-slicked city street at night glowing with pink and blue neon signs, reflections shimmering on the wet pavement. '+N],
  ['Sign Alley','Wide Shot','Slow Dolly In','A narrow alley at night lined with glowing hanging neon signs in pink, blue and green, steam rising from vents. '+N],
  ['Last Call','Close-Up','Slow Dolly In','A glowing neon bar sign buzzing above a doorway at night, moths circling, brick wall washed in pink and blue light. '+N],
  ['Chrome & Cyan','Wide Shot','Slow Dolly In','An empty retro diner at night, pink and cyan neon tubes reflecting off chrome counters and vinyl booths. '+N],
  ['Hood Glow','Close-Up','Slow Dolly In','Glowing pink and cyan neon reflections rippling across the wet hood of a parked car at night. '+N],
  ['Midnight Ramen','Wide Shot','Static Wide','A small ramen shop glowing at night with red and blue neon signage, steam drifting from the counter. '+N],
  ['Arcade Glow','Wide Shot','Tracking Side','A retro arcade at night, rows of glowing neon game cabinets casting pink and blue light across the floor. '+N],
  ['Level P3','Wide Shot','Tracking Side','An underground parking garage at night lit by rows of pink and blue neon tubes, reflections on the concrete floor. '+N],
  ['Vacancy','Wide Shot','Static Wide','A roadside motel VACANCY sign glowing in pink and blue neon against the night sky, palm trees silhouetted. '+N],
  ['Puddle Sign','Close-Up','Slow Dolly In','A neon storefront sign glowing pink and blue reflected in a rain puddle on the sidewalk, ripples distorting the light. '+N],
  ["The Bender's Shop",'Wide Shot','Static Wide','A sign-makers workshop at night filled with glowing bent neon tubes in many colors hanging on the wall. '+N],
  ['Night Market','Wide Shot','Tracking Side','A night market stall glowing with pink and blue neon, hanging lanterns and signs, misty air. '+N],
];
let entries='';
rows.forEach((r,n)=>{ entries += `\n  "tag-lighting-neon-wash-${n}": ${JSON.stringify({title:r[0],shotType:r[1],cameraMove:r[2],prompt:r[3]})},`; });
const anchor='var REAL_TAG_META = {';
must(s.includes(anchor),'REAL_TAG_META'); s=s.replace(anchor, anchor+entries);
rep.push('2: inserted 12 unique neon entries');
writeFileSync('index.html', s);
console.log(rep.join('\n'));