import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
async function has(Key){ try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); return true; } catch { return false; } }
const missingGrid = [], missingPoster = [];
for (let i = 0; i < 124; i++){
  const base = `clip-${i}`;
  if (!(await has(`grid/${base}.mp4`))) missingGrid.push(i);
  if (!(await has(`posters/${base}.jpg`))) missingPoster.push(i);
}
console.log('missing grid   :', missingGrid.join(', ') || 'none');
console.log('missing poster :', missingPoster.join(', ') || 'none');
console.log(`\n${missingGrid.length} grids, ${missingPoster.length} posters missing`);