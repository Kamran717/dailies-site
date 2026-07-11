// scripts/import-any.mjs — like import-clips.mjs but accepts ANY clean key name
// (e.g. tag-format-35mm-anamorphic-film-0), not just clip-N. Reads scripts/clips.json
// as [{ id, url }]. Copies each CloudFront URL to R2 as <id>.mp4 at the bucket root.
//   node --env-file=.env scripts/import-any.mjs --dry
//   node --env-file=.env scripts/import-any.mjs
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
for (const [k,v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }))
  if(!v){ console.error('Missing env var '+k); process.exit(1); }
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const s3 = new S3Client({ region:'auto', endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{ accessKeyId:R2_ACCESS_KEY_ID, secretAccessKey:R2_SECRET_ACCESS_KEY } });
const clips = JSON.parse(readFileSync(new URL('./clips.json', import.meta.url),'utf8'));
if(!Array.isArray(clips)||!clips.length){ console.error('clips.json empty'); process.exit(1); }
for(const c of clips){
  if(!/^[a-z0-9-]+$/.test(c.id||'')){ console.error('Bad id (letters/digits/hyphens only): '+JSON.stringify(c.id)); process.exit(1); }
  if(!/^https:\/\//.test(c.url||'')){ console.error('Bad url for '+c.id); process.exit(1); }
}
async function exists(Key){ try{ await s3.send(new HeadObjectCommand({Bucket:R2_BUCKET,Key})); return true; }catch{ return false; } }
let ok=0,skipped=0,failed=0;
for(const {id,url} of clips){
  const key=`${id}.mp4`;
  if(!FORCE && await exists(key)){ console.log(`SKIP  ${key} (exists; --force to overwrite)`); skipped++; continue; }
  if(DRY){ console.log(`DRY   ${key}  <- ${url.slice(0,60)}...`); continue; }
  try{
    const res=await fetch(url); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body=Buffer.from(await res.arrayBuffer());
    await s3.send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, Body:body,
      ContentType:'video/mp4', CacheControl:'public, max-age=31536000, immutable' }));
    console.log(`OK    ${key}  ${(body.length/1e6).toFixed(1)} MB`); ok++;
  }catch(err){ console.error(`FAIL  ${key}  ${err.message}`); failed++; }
}
console.log(`\n${ok} uploaded, ${skipped} skipped, ${failed} failed`);
if(failed) process.exit(1);
