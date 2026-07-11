import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
async function count(prefix){
  const keys = []; let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix, ContinuationToken: token }));
    for (const o of r.Contents || []) if (/\.mp4$/i.test(o.Key)) keys.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys.sort();
}
for (const p of ['Orbit left/', 'orbit-left/', 'Orbit Left/', 'orbit left/']) {
  const k = await count(p);
  console.log(`"${p}" -> ${k.length} mp4`);
  k.slice(0,5).forEach(x => console.log('   ' + x));
}
// also scan root for any stray orbit files
const root = await count('');
const orbitRoot = root.filter(k => /orbit/i.test(k));
console.log(`root-level keys containing "orbit": ${orbitRoot.length}`);
orbitRoot.slice(0,5).forEach(x => console.log('   ' + x));
