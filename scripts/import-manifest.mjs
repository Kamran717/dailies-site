// scripts/import-manifest.mjs
//
// Manifest-driven R2 importer. Same R2 setup as import-clips.mjs, but reads a
// batch manifest ({ clips: [{ id, r2_key, cloudfront_url, prompt }, ...] })
// instead of clips.json, and accepts any id (clip-* or tag-*).
//
// Higgsfield CDN URLs expire same-day. Run this the day you generate.
//
// Usage (from repo root):
//   node --env-file=.env scripts/import-manifest.mjs scripts/aching-nostalgia.manifest.json --dry
//   node --env-file=.env scripts/import-manifest.mjs scripts/aching-nostalgia.manifest.json
//   (add --force to overwrite keys already in the bucket)
//
// Requires the same R2_* env vars Vercel uses.
import { readFileSync } from 'node:fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE = 'https://videos.aidirectorme.com',
} = process.env;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const manifestPath = args.find(a => !a.startsWith('--'));

if (!manifestPath) { console.error('Pass a manifest path, e.g. scripts/aching-nostalgia.manifest.json'); process.exit(1); }
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET })) {
  if (!v) { console.error(`Missing env var ${k}`); process.exit(1); }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const clips = manifest.clips;
if (!Array.isArray(clips) || !clips.length) { console.error('Manifest has no clips[].'); process.exit(1); }

// Validate before touching the network.
for (const c of clips) {
  if (!c.id) { console.error(`Clip ${c.index} missing id`); process.exit(1); }
  if (!/\.mp4$/.test(c.r2_key || '')) { console.error(`Bad r2_key for ${c.id} (must end .mp4)`); process.exit(1); }
  if (!/^https:\/\//.test(c.cloudfront_url || '')) { console.error(`Bad/missing cloudfront_url for ${c.id}`); process.exit(1); }
  if (!c.prompt) { console.error(`Missing prompt for ${c.id}`); process.exit(1); }
}
// Guard against two clips pointing at the same key or the same source URL.
const keys = clips.map(c => c.r2_key), urls = clips.map(c => c.cloudfront_url);
if (new Set(keys).size !== keys.length) { console.error('Duplicate r2_key in manifest'); process.exit(1); }
if (new Set(urls).size !== urls.length) { console.error('Duplicate cloudfront_url in manifest'); process.exit(1); }

async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

let ok = 0, skipped = 0, failed = 0;
const uploaded = [];
for (const c of clips) {
  const key = c.r2_key;
  if (!FORCE && (await exists(key))) {
    console.log(`SKIP  ${key} - already in bucket (pass --force to overwrite)`);
    skipped++;
    continue;
  }
  if (DRY) {
    console.log(`DRY   ${key}  <- ${c.cloudfront_url.slice(0, 64)}...`);
    uploaded.push(c);
    continue;
  }
  try {
    const res = await fetch(c.cloudfront_url);
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
    uploaded.push(c);
  } catch (err) {
    console.error(`FAIL  ${key}  ${err.message}`);
    failed++;
  }
}

console.log(`\n${ok} uploaded, ${skipped} skipped, ${failed} failed`);

if (uploaded.length) {
  console.log(`\n// --- REAL_VIDEOS entries ---`);
  for (const c of uploaded) {
    console.log(`    ${JSON.stringify(c.id)}: ${JSON.stringify(`${R2_PUBLIC_BASE}/${c.r2_key}`)},`);
  }
  console.log(`\n// --- REAL_PROMPTS entries (verbatim from manifest) ---`);
  for (const c of uploaded) {
    console.log(`    ${JSON.stringify(c.id)}: ${JSON.stringify(c.prompt)},`);
  }
}

if (failed) process.exit(1);
