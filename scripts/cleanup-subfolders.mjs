// scripts/cleanup-subfolders.mjs — delete the old category source subfolders now
// that every clip lives at the bucket root. Two-phase, and it PROTECTS the three
// folders the live site depends on.
//
//   node --env-file=.env scripts/cleanup-subfolders.mjs            <- DRY RUN
//   node --env-file=.env scripts/cleanup-subfolders.mjs --confirm  <- delete
//
// Deletes: any object inside a subfolder (key contains "/") ...
// EXCEPT anything under grid/ (thumbnails), posters/ (stills), casts/ (user casts).
// Root files (clip-N, tag-*, hero) have no "/" and are never touched.

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k,v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }))
  if(!v){ console.error('Missing env var '+k); process.exit(1); }

const CONFIRM = process.argv.includes('--confirm');
const PROTECT = new Set(['grid','posters','casts']);   // never delete these folders

const s3 = new S3Client({ region:'auto', endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{ accessKeyId:R2_ACCESS_KEY_ID, secretAccessKey:R2_SECRET_ACCESS_KEY } });

const all=[]; let token;
do { const r=await s3.send(new ListObjectsV2Command({Bucket:R2_BUCKET,ContinuationToken:token}));
  for(const o of r.Contents||[]) all.push(o.Key);
  token=r.IsTruncated?r.NextContinuationToken:undefined;
} while(token);

const toDelete=[], protectedKeys=[], rootKeys=[];
for(const k of all){
  const slash=k.indexOf('/');
  if(slash===-1){ rootKeys.push(k); continue; }         // root file: keep
  const folder=k.slice(0,slash);
  if(PROTECT.has(folder)) protectedKeys.push(k);         // protected: keep
  else toDelete.push(k);                                 // old source subfolder: delete
}

// summarize deletions by folder
const byFolder={};
for(const k of toDelete){ const f=k.slice(0,k.indexOf('/')); byFolder[f]=(byFolder[f]||0)+1; }
console.log(`Total objects: ${all.length}`);
console.log(`Root files kept: ${rootKeys.length}   Protected (grid/posters/casts) kept: ${protectedKeys.length}\n`);
console.log(`--- WOULD DELETE: ${toDelete.length} objects across ${Object.keys(byFolder).length} old subfolders ---`);
for(const f of Object.keys(byFolder).sort()) console.log(`  ${f}/`.padEnd(42)+byFolder[f]);
console.log('\n--- KEPT (protected) ---');
const protCounts={}; for(const k of protectedKeys){ const f=k.slice(0,k.indexOf('/')); protCounts[f]=(protCounts[f]||0)+1; }
for(const f of Object.keys(protCounts).sort()) console.log(`  ${f}/`.padEnd(42)+protCounts[f]);

if(!CONFIRM){
  console.log(`\nDRY RUN — nothing deleted. Re-run with --confirm to delete the ${toDelete.length} objects above.\n`);
  process.exit(0);
}
if(!toDelete.length){ console.log('\nNothing to delete.'); process.exit(0); }

let deleted=0;
for(let i=0;i<toDelete.length;i+=1000){
  const batch=toDelete.slice(i,i+1000).map(Key=>({Key}));
  const res=await s3.send(new DeleteObjectsCommand({Bucket:R2_BUCKET,Delete:{Objects:batch,Quiet:true}}));
  deleted+=batch.length-(res.Errors?.length||0);
  for(const e of res.Errors||[]) console.error('  FAILED',e.Key,e.Message);
}
console.log(`\nDeleted ${deleted}/${toDelete.length} objects. Root and protected folders untouched.`);
