// scripts/remap-static-b.mjs
//
// The "orbit-left/" subfolder holds 8 real files (numbered with gaps at 3 and 5); this renumbers them to a clean 0-7 at root raw hf_*.mp4 files that were never
// renamed to the clean root pattern the site expects. The working slow-dolly-in
// category lives at the bucket ROOT as tag-cameramove-slow-dolly-in-N.mp4, which
// is why make-web-assets builds its thumbnails and it displays. This copies the
// 46 handheld files to that same root pattern so they behave identically.
//
//   node --env-file=.env scripts/remap-static-b.mjs            <- DRY RUN
//   node --env-file=.env scripts/remap-static-b.mjs --confirm  <- actually copy
//
// Copies (does not move) — the originals in "orbit-left/" are left untouched
// so nothing is destroyed. Once the site is confirmed working you can delete the
// old folder separately.

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }
}

const CONFIRM = process.argv.includes('--confirm');
const PREFIX = 'orbit-left/';
const DEST_BASE = 'tag-cameramove-orbit-left-';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function has(Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); return true; }
  catch { return false; }
}

// List every real .mp4 in the subfolder (skip the folder marker key), sorted so
// the chronological hf_ timestamps map to 0..45 in a stable order.
const sources = [];
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: PREFIX, ContinuationToken: token }));
  for (const o of r.Contents || []) {
    if (/\.mp4$/i.test(o.Key)) sources.push(o.Key);
  }
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
sources.sort();

console.log(`Found ${sources.length} source .mp4 files in "${PREFIX}"\n`);

const plan = sources.map((src, i) => ({ src, dest: `${DEST_BASE}${i}.mp4` }));

for (const { src, dest } of plan) {
  console.log(`  ${dest}  <-  ${src.replace(PREFIX, '')}`);
}

if (!CONFIRM) {
  console.log(`\nDRY RUN — nothing copied.`);
  console.log(`Re-run to copy these ${plan.length} files to root:`);
  console.log(`  node --env-file=.env scripts/remap-static-b.mjs --confirm\n`);
  process.exit(0);
}

let copied = 0, skipped = 0, failed = 0;
for (const { src, dest } of plan) {
  // Don't clobber a clean file that somehow already exists.
  if (await has(dest)) { console.log(`SKIP  ${dest} — already at root`); skipped++; continue; }
  try {
    // CopySource must be encoded per path segment so the space in "orbit-left/"
    // becomes %20 while the slash stays a slash.
    const copySource = `${R2_BUCKET}/${src}`.split('/').map(encodeURIComponent).join('/');
    await s3.send(new CopyObjectCommand({
      Bucket: R2_BUCKET,
      Key: dest,
      CopySource: copySource,
      ContentType: 'video/mp4',
      MetadataDirective: 'REPLACE',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log(`OK    ${dest}`);
    copied++;
  } catch (err) {
    console.error(`FAIL  ${dest}  ${err.message}`);
    failed++;
  }
}
console.log(`\n${copied} copied, ${skipped} skipped, ${failed} failed`);
if (!failed) {
  console.log(`\nNext: build thumbnails for the new root files:`);
  console.log(`  node --env-file=.env scripts/make-web-assets.mjs`);
}
if (failed) process.exit(1);
