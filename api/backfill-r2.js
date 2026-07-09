// api/backfill-r2.js
//
// One-off maintenance endpoint. Finds assets still pointing at fal.media,
// copies the video and still into R2, and rewrites the row.
//
// fal guarantees generated files for ~7 days. Every row below is a broken
// video in My Assets on a timer. This is the fix, and it can only be run
// while the files still exist.
//
//   POST /api/backfill-r2
//   Authorization: Bearer <ADMIN_SECRET>
//   { "limit": 10, "dryRun": true }
//
// Idempotent: rows already on R2 are never selected. Safe to run repeatedly
// until `remaining` reaches 0. Batched so it can't blow the 300s ceiling.
//
// DELETE THIS FILE once the backfill is done. A long-lived admin endpoint is
// a long-lived liability.

import { createClient } from '@supabase/supabase-js';
import { copyToR2, r2Configured } from '../lib/r2.js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const FAL_PATTERN = '%fal.media%';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'ADMIN_SECRET is not set.' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Not authorised.' });
  }

  if (!r2Configured()) {
    return res.status(500).json({ error: 'R2 is not configured.' });
  }

  const limit = Math.min(Number(req.body?.limit) || 10, 25);
  const dryRun = req.body?.dryRun === true;

  // Count what's left, so the caller knows when to stop.
  const { count: remainingBefore } = await admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('deleted', false)
    .like('video_url', FAL_PATTERN);

  const { data: rows, error } = await admin
    .from('assets')
    .select('id, share_id, video_url, image_url, source_video_url, source_image_url')
    .eq('deleted', false)
    .like('video_url', FAL_PATTERN)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[backfill] select failed', error);
    return res.status(500).json({ error: 'Could not read assets.' });
  }

  if (!rows?.length) {
    return res.status(200).json({ done: true, remaining: 0, migrated: [], failed: [] });
  }

  if (dryRun) {
    return res.status(200).json({
      dryRun: true,
      remaining: remainingBefore ?? rows.length,
      wouldMigrate: rows.map((r) => ({ id: r.id, share_id: r.share_id })),
    });
  }

  const migrated = [];
  const failed = [];

  for (const row of rows) {
    try {
      const patch = {
        // Preserve the originals if star.js never recorded them.
        source_video_url: row.source_video_url || row.video_url,
        source_image_url: row.source_image_url || row.image_url,
      };

      patch.video_url = await copyToR2(
        row.video_url,
        `casts/${row.share_id}/video.mp4`,
        'video/mp4'
      );

      if (row.image_url) {
        patch.image_url = await copyToR2(
          row.image_url,
          `casts/${row.share_id}/still.jpg`,
          'image/jpeg'
        );
      }

      const { error: updErr } = await admin.from('assets').update(patch).eq('id', row.id);
      if (updErr) throw updErr;

      migrated.push({ id: row.id, share_id: row.share_id });
    } catch (err) {
      // Most likely cause: the fal URL already expired. Nothing to recover.
      const message = String(err?.message || err);
      console.error(`[backfill] asset ${row.id} failed`, message);
      failed.push({ id: row.id, share_id: row.share_id, error: message.slice(0, 200) });
    }
  }

  const { count: remainingAfter } = await admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('deleted', false)
    .like('video_url', FAL_PATTERN);

  return res.status(200).json({
    done: (remainingAfter ?? 0) === 0,
    remaining: remainingAfter ?? 0,
    migratedCount: migrated.length,
    failedCount: failed.length,
    migrated,
    failed,
  });
}
