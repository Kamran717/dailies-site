import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('GENRE_CLIPS')) { console.error('ABORT: already added'); process.exit(1); }
must(s.includes('var TOTAL = 124;'),'TOTAL'); s=s.replace('var TOTAL = 124;','var TOTAL = 136;'); rep.push('1: counter -> 136');
const rvOpen='var REAL_VIDEOS = {';
must(s.includes(rvOpen),'REAL_VIDEOS');
let rvLines='var REAL_VIDEOS = {';
for(let n=136;n<=147;n++){ rvLines += `\n    "clip-${n}": "https://videos.aidirectorme.com/clip-${n}.mp4",`; }
s=s.replace(rvOpen, rvLines); rep.push('2: 12 REAL_VIDEOS entries');
const clipsLine='var CLIPS = buildClips(84).concat(buildExpressionClips(84, 40));';
must(s.includes(clipsLine),'CLIPS line');
const g=[
  ['clip-136',"Dragon's Edge",'Crane Rise','Wide Shot','Defiant Joy','Harsh Noon Sun','#6b2d0e','#d4820a','Epic fantasy. A lone armored warrior on a windswept cliff as an enormous dragon soars across a stormy sky.'],
  ['clip-137','Rooftop Wind','Static Wide','Wide Shot','Aching Nostalgia','Moonlit Blue','#ff9e7d','#b5477d','Japanese cel-shaded anime. A girl with flowing hair on a rooftop at sunset, city sprawling below.'],
  ['clip-138','Meadow Bot','Slow Dolly In','Medium Shot','Manic Elation','Harsh Noon Sun','#7ec850','#2a9d5c','Stylized 3D animation. A small round friendly robot rolls through a bright wildflower meadow.'],
  ['clip-139','The Portal','Slow Dolly In','Wide Shot','Quiet Dread','Neon Wash','#2a4dff','#7d3dff','Real-world fantasy. A glowing arcane portal tears open on a rain-slicked city street at night.'],
  ['clip-140','Savanna King','Static Wide','Wide Shot','Cold Fury','Harsh Noon Sun','#d99a2b','#7a4a15','Wildlife. A majestic male lion on a rocky outcrop on the savanna at golden hour, mane in the wind.'],
  ['clip-141','Two Moons','Static Wide','Wide Shot','Quiet Dread','Moonlit Blue','#3d2d6b','#7d5dff','Sci-fi. A lone astronaut crossing a vast alien desert of red dunes under two moons in a violet sky.'],
  ['clip-142','Blade & Blossom','Whip Pan','Medium Shot','Cold Fury','Candlelight Flicker','#b52d2d','#2a1a1a','Anime action. A samurai in a dramatic mid-slash, katana trailing light, cherry blossoms swirling.'],
  ['clip-143','Fae Wood','Slow Dolly In','Wide Shot','Tender Relief','Moonlit Blue','#2d6b4d','#5dff9d','Enchanted forest. Deep woods glowing with bioluminescent mushrooms and drifting fireflies at twilight.'],
  ['clip-144','Snow Pack','Static Wide','Wide Shot','Cold Fury','Overcast Soft','#a0b8d0','#4a6580','Wildlife. A pack of grey wolves bounds through deep fresh snow in a pine forest, breath fogging.'],
  ['clip-145','Neon Alley','Slow Dolly In','Medium Shot','Quiet Dread','Neon Wash','#ff2d9d','#2dd4ff','Cyberpunk. A hooded figure walks a neon-lit rainy alley, holographic signs glowing pink and cyan.'],
  ['clip-146','Skyward','Crane Rise','Wide Shot','Manic Elation','Harsh Noon Sun','#7dc8ff','#ffb85d','Whimsical 3D animation. A colorful hot-air balloon drifts over rolling pastel mountains at sunrise.'],
  ['clip-147','Reef Drift','Slow Dolly In','Wide Shot','Tender Relief','Overcast Soft','#2db8d4','#1a6b7a','Underwater fantasy. A giant sea turtle glides through a vibrant coral reef as sunlight pierces the water.'],
];
let arr='var GENRE_CLIPS = [\n';
for(const [id,title,cam,shot,emo,light,c1,c2,prompt] of g){
  arr += `    { id: "${id}", frameId: ${JSON.stringify(title)}, title: ${JSON.stringify(title)}, cameraMove: "${cam}", shotType: "${shot}", emotion: "${emo}", action: "moves", lighting: "${light}", setting: "scene", c1: "${c1}", c2: "${c2}", prompt: ${JSON.stringify(prompt)} },\n`;
}
arr += '  ];\n  ';
s=s.replace(clipsLine, arr + 'var CLIPS = buildClips(84).concat(buildExpressionClips(84, 40)).concat(GENRE_CLIPS);');
rep.push('3: 12 GENRE_CLIPS defined + concatenated');
writeFileSync('index.html', s);
console.log(rep.join('\n'));