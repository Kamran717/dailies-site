import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('index.html', 'utf8');
const rep=[]; function must(c,m){ if(!c){ console.error('ABORT: '+m); process.exit(1); } }
if (s.includes('REAL_TAG_META')) { console.error('ABORT: already added'); process.exit(1); }
const meta = {};
function set(prefix, scenes){
  scenes.forEach(function(sc){ for(let n=sc[0]; n<=sc[1]; n++){ meta[prefix+n]={title:sc[2],shotType:sc[3],cameraMove:sc[4],prompt:sc[5]}; } });
}
set('tag-lighting-golden-hour-rim-', [
  [0,0,'Ridge Line','Wide Shot','Static Wide','A lone hiker on a mountain ridge at sunset, warm sunlight rimming their silhouette and the grass. Golden hour rim light, backlit, shallow depth of field.'],
  [1,3,'Mane & Meadow','Wide Shot','Static Wide','A wild horse gallops through tall grass at sunset, warm backlight glowing through its mane and the grass tips. Golden hour rim light, dust in the air.'],
  [4,7,'Morning Gold','Close-Up','Slow Dolly In','A steaming coffee cup on a wooden windowsill, low sun streaming through and rimming the rising steam in gold. Golden hour rim light, cozy, shallow focus.'],
  [8,11,'Last Light Sail','Wide Shot','Static Wide','A sailboat glides across calm water at sunset, the low sun rimming the sail and the ripples in warm gold. Golden hour rim light, serene, wide shot.'],
]);
const metaJS = 'var REAL_TAG_META = ' + JSON.stringify(meta, null, 2) + ';\n  ';
const anchor1 = 'function generateTagCollection(facetKey, tagValue){';
must(s.includes(anchor1),'generateTagCollection'); s=s.replace(anchor1, metaJS + anchor1); rep.push('1: REAL_TAG_META map inserted');
const anchor2 = '    var TAG_VISIBLE_LIMITS = {';
must(s.includes(anchor2),'TAG_VISIBLE_LIMITS anchor');
const applyJS = '    results.forEach(function(r){ var m = REAL_TAG_META[r.id]; if(m){ for(var k in m) r[k]=m[k]; } });\n' + anchor2;
s=s.replace(anchor2, applyJS); rep.push('2: override applied before slice');
writeFileSync('index.html', s);
console.log(rep.join('\n'));