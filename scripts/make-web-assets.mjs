// scripts/make-web-assets.mjs
//
// For every clip-N.mp4 in the bucket root, produce two derived assets and
// upload them alongside. The originals are never touched, never overwritten,
// never re-encoded.
//
//   clip-N.mp4          19 Mbps  ~9 MB    <- untouched. modal, download, share.
//   grid/clip-N.mp4     640px    ~400 KB  <- contact sheet only
//   posters/clip-N.jpg  640px    ~40 KB   <- first paint, hero, poster attr
//
// Why: a 300px card in the contact sheet cannot display 19 Mbps. Those bytes
// never reach the viewer's eye, only their bandwidth. The grid encode is not a
// compromise on quality — nobody ever watches it at size.
//
// Requires ffmpeg on PATH:  winget install Gyan.FFmpeg   (then reopen the terminal)
//
// Usage:
//   node --env-file=.env scripts/make-web-assets.mjs --dry
//   node --env-file=.env scripts/make-web-assets.mjs
//   node --env-file=.env scripts/make-web-assets.mjs --only clip-1,hero
//   node --env-file=.env scripts/make-web-assets.mjs --force     (redo existing)

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
      // Root-level mp4s only. Never recurse into grid/ or posters/, and never
      // pick up the stray names this bucket has collected (spaces, "(1)").
      if (!/^[a-z0-9-]+\.mp4$/i.test(o.Key)) continue;
      if (o.Key.includes('/')) continue;
      keys.push(o.Key);
    }
    token = r.NextContinuationToken;
  } while (token);
  return keys.sort((a, b) => {
    const na = a.match(/\d+/), nb = b.match(/\d+/);
    if (na && nb) return +na[0] - +nb[0];
    return a.localeCompare(b);
  });
}

async function download(Key, dest) {
  const r = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key }));
  writeFileSync(dest, Buffer.from(await r.Body.transformToByteArray()));
}

async function upload(Key, file, ContentType) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key, Body: readFileSync(file), ContentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

const mb = (f) => (statSync(f).size / 1e6).toFixed(2);

const keys = (await listSourceKeys()).filter(k => !ONLY || ONLY.has(k.replace('.mp4', '')));
if (!keys.length) { console.error('No source mp4s found at the bucket root.'); process.exit(1); }

console.log(`${keys.length} source clips\n`);

const tmp = mkdtempSync(join(tmpdir(), 'aidm-'));
let built = 0, skipped = 0, failed = 0;

for (const key of keys) {
  const base = key.replace(/\.mp4$/, '');
  const gridKey = `grid/${base}.mp4`;
  const posterKey = `posters/${base}.jpg`;

  if (!FORCE && (await exists(gridKey)) && (await exists(posterKey))) {
    console.log(`SKIP  ${base} — derived assets exist`);
    skipped++;
    continue;
  }
  if (DRY) { console.log(`DRY   ${base} -> ${gridKey}, ${posterKey}`); continue; }

  const src = join(tmp, key);
  const grid = join(tmp, `g-${key}`);
  const poster = join(tmp, `p-${base}.jpg`);

  try {
    await download(key, src);

    // Grid encode. 640px wide, no audio, faststart so playback begins before
    // the file finishes arriving. crf 30 is invisible at thumbnail size.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src,
      '-vf', 'scale=640:-2', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow',
      '-an', '-movflags', '+faststart', grid]);

    // Poster at 40% through. Frame zero of a slow push-in is the dullest
    // moment in the shot; the middle is where the expression lands.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src,
      '-vf', "scale=640:-2", '-frames:v', '1', '-q:v', '6',
      '-ss', String(Math.max(0.1, 5 * 0.4)), poster]);

    await upload(gridKey, grid, 'video/mp4');
    await upload(posterKey, poster, 'image/jpeg');

    console.log(`OK    ${base}  ${mb(src)} MB -> grid ${mb(grid)} MB, poster ${mb(poster)} MB`);
    built++;
  } catch (err) {
    console.error(`FAIL  ${base}  ${String(err.message).slice(0, 140)}`);
    failed++;
  } finally {
    for (const f of [src, grid, poster]) { try { rmSync(f); } catch {} }
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`\n${built} built, ${skipped} skipped, ${failed} failed`);
if (failed) process.exit(1);
