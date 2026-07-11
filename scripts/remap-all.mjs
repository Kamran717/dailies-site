// scripts/remap-all.mjs — batch rewire EVERY taxonomy subfolder to clean root names.
//
//   node --env-file=.env scripts/remap-all.mjs            <- DRY RUN
//   node --env-file=.env scripts/remap-all.mjs --confirm  <- copy + write manifest
//
// Rules:
//  - Only files named tag-<cameramove|format|shottype|lighting|emotion>-<slug>-<n>.mp4
//  - Only when the containing FOLDER name equals that slug. This kills the
//    tracking-side/ tangle: the stray low-angle-tilt-up copies in tracking-side/
//    are ignored (folder != slug), while real tracking-side files are kept.
//  - Skip grid/, posters/, casts/. Never touch root files.
//  - Each tag group is sorted by original number and RENUMBERED 0..N-1 to close gaps.
//  - Copies only (originals untouched). Idempotent: skips a dest already at root.
//  - Writes scripts/remap-manifest.json = { fullTag: realCount } for the index fix.

import { S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'fs';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k,v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }))
  if (!v){ console.error('Missing env var '+k); process.exit(1); }

const CONFIRM = process.argv.includes('--confirm');
const SKIP_FOLDERS = new Set(['grid','posters','casts']);
const s3 = new S3Client({ region:'auto', endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{ accessKeyId:R2_ACCESS_KEY_ID, secretAccessKey:R2_SECRET_ACCESS_KEY } });

async function has(Key){ try{ await s3.send(new HeadObjectCommand({Bucket:R2_BUCKET,Key})); return true; }catch{ return false; } }

// list everything
const all=[]; let token;
do { const r=await s3.send(new ListObjectsV2Command({Bucket:R2_BUCKET,ContinuationToken:token}));
  for(const o of r.Contents||[]) if(/\.mp4$/i.test(o.Key)) all.push(o.Key);
  token=r.IsTruncated?r.NextContinuationToken:undefined;
} while(token);

// group by fullTag, honoring folder==slug
const groups={}; // fullTag -> [{key, num}]
const TAG_RE=/^tag-(cameramove|format|shottype|lighting|emotion)-(.+)-(\d+)\.mp4$/;
for(const key of all){
  const slash=key.indexOf('/'); if(slash===-1) continue;
  const folder=key.slice(0,slash); if(SKIP_FOLDERS.has(folder)) continue;
  const name=key.slice(slash+1);
  const m=name.match(TAG_RE); if(!m) continue;
  const [,tax,slug,num]=m;
  if(folder!==slug) continue;              // the tracking-side rule
  const fullTag=`tag-${tax}-${slug}`;
  (groups[fullTag]||=[]).push({key, num:+num});
}

const manifest={};
const plan=[]; // {src, dest}
for(const fullTag of Object.keys(groups).sort()){
  const files=groups[fullTag].sort((a,b)=>a.num-b.num);
  manifest[fullTag]=files.length;
  files.forEach((f,i)=>plan.push({ src:f.key, dest:`${fullTag}-${i}.mp4`, tag:fullTag }));
}

// print summary
console.log(`Collections found: ${Object.keys(manifest).length}\n`);
for(const [tag,n] of Object.entries(manifest)) console.log(`  ${tag.padEnd(42)} ${n}`);
console.log('');

if(!CONFIRM){
  console.log('DRY RUN — nothing copied, no manifest written.');
  console.log('Re-run with --confirm to copy and write scripts/remap-manifest.json\n');
  process.exit(0);
}

let copied=0,skipped=0,failed=0;
for(const {src,dest} of plan){
  if(await has(dest)){ skipped++; continue; }
  try{
    const CopySource=`${R2_BUCKET}/${src}`.split('/').map(encodeURIComponent).join('/');
    await s3.send(new CopyObjectCommand({ Bucket:R2_BUCKET, Key:dest, CopySource,
      ContentType:'video/mp4', MetadataDirective:'REPLACE', CacheControl:'public, max-age=31536000, immutable' }));
    copied++;
  }catch(err){ console.error(`FAIL ${dest}  ${err.message}`); failed++; }
}
writeFileSync(new URL('./remap-manifest.json', import.meta.url), JSON.stringify(manifest,null,2));
console.log(`\n${copied} copied, ${skipped} already at root, ${failed} failed`);
console.log('Wrote scripts/remap-manifest.json');
if(failed) process.exit(1);
