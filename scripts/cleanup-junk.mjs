// scripts/cleanup-junk.mjs
//
// Deletes the " - Copy" junk files from the R2 bucket.
// Two phases, so it can't nuke anything by accident:
//
//   node --env-file=.env scripts/cleanup-junk.mjs            <- DRY RUN: lists what WOULD go
//   node --env-file=.env scripts/cleanup-junk.mjs --confirm  <- actually deletes
//
// Match rule: any object key containing " - Copy". Nothing real matches this.
//   Kept:    clip-N, hero, tag-cameramove-slow-dolly-in-<n>   (no " - Copy")
//   Deleted: clip-2 - Copy, hero - Copy - Copy, tag-...-0 - Copy - Copy (7) - Copy ...

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const accountId       = process.env.R2_ACCOUNT_ID;
const accessKeyId     = process.env.R2_ACCESS_KEY_ID     || process.env.R2_ACCESS_KEY;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY;
const bucket          = process.env.R2_BUCKET || "aidirectorme-videos";

// --- fail loudly if creds are missing or malformed ---
const missing = [];
if (!accountId)       missing.push("R2_ACCOUNT_ID");
if (!accessKeyId)     missing.push("R2_ACCESS_KEY_ID");
if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  console.error("Run with: node --env-file=.env scripts/cleanup-junk.mjs");
  process.exit(1);
}
if (/^https?:\/\//i.test(accountId) || accountId.length !== 32) {
  console.error(`R2_ACCOUNT_ID looks wrong: "${accountId}"`);
  console.error("It must be the bare 32-character account id, not a URL.");
  process.exit(1);
}

const CONFIRM = process.argv.includes("--confirm");
const PATTERN = " - Copy";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

// 1) List every object (paginated, in case the bucket ever grows past 1000)
const allKeys = [];
let token;
do {
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    ContinuationToken: token,
  }));
  for (const o of res.Contents || []) allKeys.push(o.Key);
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

// 2) Split into junk vs keep
const junk = allKeys.filter((k) => k.includes(PATTERN)).sort();
const keep = allKeys.filter((k) => !k.includes(PATTERN));

console.log(`\nBucket: ${bucket}`);
console.log(`Total objects:      ${allKeys.length}`);
console.log(`Matching " - Copy": ${junk.length}`);
console.log(`Keeping:            ${keep.length}\n`);

console.log("--- WOULD DELETE ---");
for (const k of junk) console.log("  " + k);

// Safety: show a sample of the real files being kept, so you can eyeball
// that nothing legit is caught in the net before you run --confirm.
const sampleKeep = keep
  .filter(
    (k) =>
      k === "hero" ||
      k.startsWith("hero.") ||
      /^clip-\d+(\.|$)/.test(k) ||
      k.startsWith("tag-cameramove-slow-dolly-in")
  )
  .slice(0, 12);
console.log("\n--- SAMPLE OF KEPT (real files, untouched) ---");
for (const k of sampleKeep) console.log("  " + k);

if (!CONFIRM) {
  console.log(`\nDRY RUN — nothing deleted.`);
  console.log(`Re-run to delete the ${junk.length} file(s) listed above:`);
  console.log(`  node --env-file=.env scripts/cleanup-junk.mjs --confirm\n`);
  process.exit(0);
}

if (junk.length === 0) {
  console.log("\nNothing to delete. Done.");
  process.exit(0);
}

// 3) Delete in batches of 1000 (DeleteObjects hard limit)
let deleted = 0;
for (let i = 0; i < junk.length; i += 1000) {
  const batch = junk.slice(i, i + 1000).map((Key) => ({ Key }));
  const res = await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch, Quiet: true },
    })
  );
  deleted += batch.length - (res.Errors?.length || 0);
  for (const e of res.Errors || []) console.error("  FAILED:", e.Key, e.Message);
}
console.log(`\nDeleted ${deleted}/${junk.length} junk file(s). Done.`);
