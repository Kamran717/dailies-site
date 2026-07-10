// scripts/list-real-videos.mjs
//
// Prints the keys that actually exist in the bucket root — the real clip-N.mp4
// and tag-*.mp4 files. REAL_VIDEOS in index.html currently lists ~570 tag
// entries; only a fraction were ever generated. This tells you which are real.
//
//   node --env-file=.env scripts/list-real-videos.mjs           # summary
//   node --env-file=.env scripts/list-real-videos.mjs --keys     # bare key list
//
// Only looks at the root. Ignores grid/ and posters/ derivatives.

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }))
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }

const KEYS_ONLY = process.argv.includes('--keys');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const keys = [];
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
  for (const o of r.Contents || []) {
    if (o.Key.includes('/')) continue;            // skip grid/ posters/
    if (!/\.mp4$/i.test(o.Key)) continue;
    keys.push(o.Key.replace(/\.mp4$/i, ''));       // store id without extension
  }
  token = r.NextContinuationToken;
} while (token);

keys.sort();

if (KEYS_ONLY) {
  console.log(keys.join('\n'));
  process.exit(0);
}

const clip = keys.filter(k => /^clip-\d+$/.test(k));
const tag = keys.filter(k => k.startsWith('tag-'));
const other = keys.filter(k => !/^clip-\d+$/.test(k) && !k.startsWith('tag-'));

console.log(`${keys.length} video files in bucket root\n`);
console.log(`  clip-N : ${clip.length}`);
console.log(`  tag-*  : ${tag.length}`);
console.log(`  other  : ${other.length}  ${other.length ? '-> ' + other.join(', ') : ''}`);

// Group tag keys by their collection prefix so you can see coverage per chip.
const byPrefix = {};
for (const t of tag) {
  const prefix = t.replace(/-\d+$/, '');
  byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
}
console.log(`\ntag collections with real video:`);
for (const [prefix, n] of Object.entries(byPrefix).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(3)}  ${prefix}`);
}

// Write the full real-key list to a file the trim step can read.
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('./real-keys.json', import.meta.url), JSON.stringify(keys, null, 0));
console.log(`\nWrote scripts/real-keys.json (${keys.length} keys).`);
