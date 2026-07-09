// lib/r2.js — copy finished casts into your own R2 bucket.
//
// Why: fal.media URLs expire. Anything we hand a user (My Assets, a share
// page, an og:video tag) has to point at a file we own, or it rots.
//
// R2 is S3-compatible, so this is plain @aws-sdk/client-s3 pointed at
// https://<account_id>.r2.cloudflarestorage.com.

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE, // e.g. https://videos.aidirectorme.com  (no trailing slash)
} = process.env;

let _client = null;

function client() {
  if (_client) return _client;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2 is not configured (missing R2_* env vars)');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

export function r2Configured() {
  return Boolean(
    R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_BASE
  );
}

export function publicUrl(key) {
  const base = (R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  return `${base}/${key}`;
}

/**
 * Download a remote URL and put it in R2 under `key`. Returns the public URL.
 */
export async function copyToR2(sourceUrl, key, contentType) {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Fetch failed for ${sourceUrl}: ${res.status} ${res.statusText}`);
  }
  const body = Buffer.from(await res.arrayBuffer());

  await client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || res.headers.get('content-type') || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return publicUrl(key);
}

/**
 * Copy a finished cast (video + still) into R2 in parallel.
 * Keys are namespaced by share_id so one cast is one folder.
 */
export async function copyCastToR2({ shareId, videoUrl, stillUrl }) {
  const [video, still] = await Promise.all([
    copyToR2(videoUrl, `casts/${shareId}/video.mp4`, 'video/mp4'),
    copyToR2(stillUrl, `casts/${shareId}/still.jpg`, 'image/jpeg'),
  ]);
  return { videoUrl: video, stillUrl: still };
}
