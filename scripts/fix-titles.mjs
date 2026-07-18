import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
const M = {};
function set(prefix, rows){ rows.forEach(function(r){ for(let n=r[0]; n<=r[1]; n++){ M[prefix+n]={title:r[2],setting:r[3],shotType:r[4],cameraMove:r[5],prompt:r[6]}; } }); }
set('tag-lighting-golden-hour-rim-', [
  [0,0,'Ridge Line','a hiker on a mountain ridge at sunset','Wide Shot','Static Wide','A lone hiker on a mountain ridge at sunset, warm sunlight rimming their silhouette and the grass. Golden hour rim light, backlit, shallow depth of field.'],
  [1,3,'Mane & Meadow','a wild horse in tall grass at sunset','Wide Shot','Static Wide','A wild horse gallops through tall grass at sunset, warm backlight glowing through its mane and the grass tips. Golden hour rim light, dust in the air.'],
  [4,7,'Morning Gold','a coffee cup on a sunlit windowsill','Close-Up','Slow Dolly In','A steaming coffee cup on a wooden windowsill, low sun streaming through and rimming the rising steam in gold. Golden hour rim light, cozy, shallow focus.'],
  [8,11,'Last Light Sail','a sailboat on calm water at sunset','Wide Shot','Static Wide','A sailboat glides across calm water at sunset, the low sun rimming the sail and the ripples in warm gold. Golden hour rim light, serene, wide shot.'],
]);
set('tag-lighting-neon-wash-', [
  [0,2,'Rain & Neon','a rain-slicked neon city street','Wide Shot','Static Wide','A rain-slicked city street at night glowing with pink and blue neon signs, reflections shimmering on the wet pavement. Neon wash lighting, moody, saturated color.'],
  [3,5,'Chrome & Cyan','an empty neon-lit diner','Wide Shot','Slow Dolly In','An empty retro diner at night, pink and cyan neon tubes reflecting off chrome counters and vinyl booths. Neon wash lighting, moody, saturated color.'],
  [6,8,'Arcade Glow','a neon-lit retro arcade','Wide Shot','Tracking Side','A retro arcade at night, rows of glowing neon game cabinets casting pink and blue light across the floor. Neon wash lighting, moody, saturated color.'],