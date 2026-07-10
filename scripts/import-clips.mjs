// scripts/import-clips.mjs
//
// Takes Higgsfield result URLs and pushes them into R2 as clip-<N>.mp4,
// which is the filename the library expects at
// https://videos.aidirectorme.com/clip-<N>.mp4
//
// Higgsfield CDN URLs are not permanent. Run this the same day you generate.
//
// Usage:
//   1. Fill in clips.json  (see shape below)
//   2. node scripts/import-clips.mjs --dry
//   3. node scripts/import-clips.mjs
//
// clips.json:
//   [ { "id": "clip-84", "url": "https://.../abc.mp4" }, ... ]
//
// Requires the same R2_* env vars Vercel uses. Locally, put them in a .env
// file and run with `node --env-file=.env scripts/import-clips.mjs`.
// Do NOT commit .env.

import { readFileSync } from 'node:fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE = 'https://videos.aidirectorme.com',
} = process.env;

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const clips = JSON.parse(readFileSync(new URL('./clips.json', import.meta.url), 'utf8'));

if (!Array.isArray(clips) || !clips.length) {
  console.error('clips.json is empty.');
  process.exit(1);
}

for (const c of clips) {
  if (!/^clip-\d+$/.test(c.id || '')) {
    console.error(`Bad id: ${JSON.stringify(c.id)} — expected clip-<N>`);
    process.exit(1);
  }
  if (!/^https:\/\//.test(c.url || '')) {
    console.error(`Bad url for ${c.id}`);
    process.exit(1);
  }
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

let ok = 0, skipped = 0, failed = 0;

for (const { id, url } of clips) {
  const key = `${id}.mp4`;

  // The library's existing clips live at this exact key. Overwriting one by
  // accident replaces a video that is already live on the site.
  if (!FORCE && (await exists(key))) {
    console.log(`SKIP  ${key} — already in bucket (pass --force to overwrite)`);
    skipped++;
    continue;
  }

  if (DRY) {
    console.log(`DRY   ${key}  <- ${url.slice(0, 60)}...`);
    continue;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = Buffer.from(await res.arrayBuffer());

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    console.log(`OK    ${key}  ${(body.length / 1e6).toFixed(1)} MB`);
    ok++;
  } catch (err) {
    console.error(`FAIL  ${key}  ${err.message}`);
    failed++;
  }
}

console.log(`\n${ok} uploaded, ${skipped} skipped, ${failed} failed`);
if (ok) {
  console.log(`\nAdd to REAL_VIDEOS in index.html:\n`);
  for (const { id } of clips) {
    console.log(`    "${id}": "${R2_PUBLIC_BASE}/${id}.mp4",`);
  }
}
if (failed) process.exit(1);
