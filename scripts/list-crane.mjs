import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const keys = [];
let token;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: 'crane-rise/', ContinuationToken: token }));
  for (const o of r.Contents || []) keys.push(o.Key);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
const mp4 = keys.filter(k => /\.mp4$/i.test(k));
console.log(`Total .mp4 in "crane-rise/": ${mp4.length}`);
mp4.sort().forEach(k => console.log('  ' + k));