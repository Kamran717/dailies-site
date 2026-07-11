// Full inventory of every camera-move folder + root, so we can batch the rest.
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// List EVERY object once, then analyze locally.
const all = [];
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
  for (const o of r.Contents || []) if (/\.mp4$/i.test(o.Key)) all.push(o.Key);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);

// Group by "folder" (prefix before first slash, or "(root)")
const byFolder = {};
for (const k of all) {
  const slash = k.indexOf('/');
  const folder = slash === -1 ? '(root)' : k.slice(0, slash);
  (byFolder[folder] ||= []).push(k);
}

console.log(`TOTAL mp4 objects: ${all.length}\n`);
console.log('=== SUBFOLDERS (these hold un-rewired footage) ===');
for (const folder of Object.keys(byFolder).sort()) {
  if (folder === '(root)') continue;
  const files = byFolder[folder].sort();
  // what camera-move slug(s) do the FILENAMES actually claim?
  const slugs = new Set(files.map(f => {
    const m = f.split('/').pop().match(/tag-cameramove-(.+?)-\d+\.mp4$/);
    return m ? m[1] : '(other:' + f.split('/').pop() + ')';
  }));
  console.log(`\n  ${folder}/  — ${files.length} files`);
  console.log(`    filename slug(s): ${[...slugs].join(', ')}`);
  const nums = files.map(f => { const m = f.match(/-(\d+)\.mp4$/); return m ? +m[1] : null; }).filter(n=>n!==null).sort((a,b)=>a-b);
  console.log(`    numbers present : ${nums.join(', ')}`);
}

console.log('\n=== ROOT camera-move collections already live ===');
const rootSlugs = {};
for (const k of byFolder['(root)'] || []) {
  const m = k.match(/^tag-cameramove-(.+?)-\d+\.mp4$/);
  if (m) rootSlugs[m[1]] = (rootSlugs[m[1]] || 0) + 1;
}
for (const [slug, n] of Object.entries(rootSlugs).sort()) console.log(`  ${slug}: ${n}`);
