// repoint-handheld-v4.mjs — one-time: re-point tag-cameramove-handheld-push-0..11
// REAL_VIDEOS + REAL_TAG_META entries to the new -v4 files. In-place update.
//   node repoint-handheld-v4.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const man = JSON.parse(readFileSync('scripts/cam-handheld-push.manifest.json', 'utf8'));
const BASE = 'https://videos.aidirectorme.com';
let s = readFileSync('index.html', 'utf8');
let vids = 0, meta = 0, miss = [];

for (const c of man.clips) {
  const id = c.id;
  const newUrl = `${BASE}/${c.r2_key}`;
  const newMeta = JSON.stringify({ title: c.title, shotType: c.shotType, cameraMove: c.cameraMove, prompt: c.prompt });

  // Replace the REAL_VIDEOS line:  "id": "....mp4",
  const vRe = new RegExp('(' + JSON.stringify(id) + '\\s*:\\s*)"[^"]*"');
  if (vRe.test(s)) { s = s.replace(vRe, `$1${JSON.stringify(newUrl)}`); vids++; } else miss.push('video:' + id);

  // Replace the REAL_TAG_META line:  "id": {....},
  const mRe = new RegExp('(' + JSON.stringify(id) + '\\s*:\\s*)\\{"title"[\\s\\S]*?\\}(?=,?\\s*\\n)');
  if (mRe.test(s)) { s = s.replace(mRe, `$1${newMeta}`); meta++; } else miss.push('meta:' + id);
}

if (miss.length) { console.error('MISSING (aborting, no write):\n  ' + miss.join('\n  ')); process.exit(1); }
writeFileSync('index.html', s);
console.log(`Re-pointed ${vids} videos and ${meta} meta entries to -v4.`);
console.log('Spot-check: every handheld-push URL should now end in -v4.mp4');
