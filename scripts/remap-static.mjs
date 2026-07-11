// scripts/remap-static.mjs
//
// The 10 static-wide clips are already correctly named
// (tag-cameramove-static-wide-N.mp4) but sit inside a "static-wide/" subfolder, which
// make-web-assets skips. Copy each to the bucket ROOT under the same filename so
// they match the working slow-dolly-in pattern.
//
//   node --env-file=.env scripts/remap-static.mjs            <- DRY RUN
//   node --env-file=.env scripts/remap-static.mjs --confirm  <- copy to root
//
// Copies (does not move); originals in "static-wide/" are left untouched.

import {
  S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }
}

const CONFIRM = process.argv.includes('--confirm');
const PREFIX = 'static-wide/';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
async function has(Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); return true; } catch { return false; }
}

const sources = [];
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: PREFIX, ContinuationToken: token }));
  for (const o of r.Contents || []) if (/\.mp4$/i.test(o.Key)) sources.push(o.Key);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
sources.sort();

// Dest = the filename with the folder stripped (names are already clean).
const plan = sources.map(src => ({ src, dest: src.replace(PREFIX, '') }));

console.log(`Found ${plan.length} source .mp4 files in "${PREFIX}"\n`);
for (const { src, dest } of plan) console.log(`  ${dest}  <-  ${src}`);

if (!CONFIRM) {
  console.log(`\nDRY RUN — nothing copied.`);
  console.log(`Re-run to copy: node --env-file=.env scripts/remap-static.mjs --confirm\n`);
  process.exit(0);
}

let copied = 0, skipped = 0, failed = 0;
for (const { src, dest } of plan) {
  if (await has(dest)) { console.log(`SKIP  ${dest} — already at root`); skipped++; continue; }
  try {
    const copySource = `${R2_BUCKET}/${src}`.split('/').map(encodeURIComponent).join('/');
    await s3.send(new CopyObjectCommand({
      Bucket: R2_BUCKET, Key: dest, CopySource: copySource,
      ContentType: 'video/mp4', MetadataDirective: 'REPLACE',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    console.log(`OK    ${dest}`); copied++;
  } catch (err) { console.error(`FAIL  ${dest}  ${err.message}`); failed++; }
}
console.log(`\n${copied} copied, ${skipped} skipped, ${failed} failed`);
if (!failed) console.log(`\nNext: node --env-file=.env scripts/make-web-assets.mjs`);
if (failed) process.exit(1);
