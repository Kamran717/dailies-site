// scripts/make-hd-posters.mjs
//
// For every clip mp4 at the bucket root, extract the FIRST FRAME at full
// native resolution and upload it as posters-hd/<base>.jpg. These are the
// frames the cast pipeline composites faces into (lib/higgsfield.js) — they
// must be full quality, unlike the 640px web posters in posters/.
//
// Requires ffmpeg on PATH:  winget install Gyan.FFmpeg   (then reopen the terminal)
//
// Usage:
//   node --env-file=.env scripts/make-hd-posters.mjs --dry
//   node --env-file=.env scripts/make-hd-posters.mjs
//   node --env-file=.env scripts/make-hd-posters.mjs --only tag-impossible-time-freeze-orbit-0-v1
//   node --env-file=.env scripts/make-hd-posters.mjs --force     (redo existing)

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  S3Client, ListObjectsV2Command, GetObjectCommand,
  PutObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
} = process.env;

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }
}

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch { console.error('ffmpeg not found on PATH.\n  winget install Gyan.FFmpeg\nThen reopen the terminal.'); process.exit(1); }

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function exists(Key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); return true; }
  catch { return false; }
}

async function listSourceKeys() {
  const keys = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    for (const o of r.Contents || []) {
      if (!/^[a-z0-9-]+\.mp4$/i.test(o.Key)) continue;
      if (o.Key.includes('/')) continue;
      keys.push(o.Key);
    }
    token = r.NextContinuationToken;
  } while (token);
  return keys.sort();
}

async function download(Key, dest) {
  const r = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key }));
  writeFileSync(dest, Buffer.from(await r.Body.transformToByteArray()));
}

async function upload(Key, file) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key, Body: readFileSync(file), ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

const mb = (f) => (statSync(f).size / 1e6).toFixed(2);

const keys = (await listSourceKeys()).filter(k => !ONLY || ONLY.has(k.replace('.mp4', '')));
if (!keys.length) { console.error('No source mp4s found at the bucket root.'); process.exit(1); }

console.log(`${keys.length} source clips\n`);

const tmp = mkdtempSync(join(tmpdir(), 'aidm-hd-'));
let built = 0, skipped = 0, failed = 0;

for (const key of keys) {
  const base = key.replace(/\.mp4$/, '');
  const hdKey = `posters-hd/${base}.jpg`;

  if (!FORCE && (await exists(hdKey))) {
    console.log(`SKIP  ${base} — HD poster exists`);
    skipped++;
    continue;
  }
  if (DRY) { console.log(`WOULD ${base} -> ${hdKey}`); built++; continue; }

  try {
    const src = join(tmp, key);
    const jpg = join(tmp, `${base}.jpg`);
    await download(key, src);
    // First frame, native resolution, minimal jpeg compression (q=2).
    execFileSync('ffmpeg', ['-y', '-i', src, '-frames:v', '1', '-q:v', '2', jpg], { stdio: 'ignore' });
    await upload(hdKey, jpg);
    console.log(`OK    ${base} -> ${hdKey} (${mb(jpg)} MB)`);
    built++;
    rmSync(src, { force: true }); rmSync(jpg, { force: true });
  } catch (err) {
    console.error(`FAIL  ${base}: ${err?.message || err}`);
    failed++;
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\nDone. built=${built} skipped=${skipped} failed=${failed}`);
