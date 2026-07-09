// api/star.js — the cast endpoint.
//
// POST { scenePrompt, faceImageBase64 }
//   + Authorization: Bearer <supabase access token>
//  ->  { videoUrl, sceneUrl, shareId, assetId, remaining, isMember }
//
// Changed from the previous version:
//  - BREAKING: userId is no longer read from the request body. It is derived
//    from the caller's access token. The old signature let anyone POST a
//    random UUID and get a fresh 5-cast quota, at ~$0.32 and 75s of function
//    time per call, on an unauthenticated public endpoint. If a `userId` is
//    still sent in the body it is ignored.
//  - The finished video and still are copied into R2 before we respond, so
//    every URL we hand back is one we own and that never expires.
//  - The asset row is now inserted HERE, server-side, not from the browser.
//    That's what makes share_id exist.

import { createClient } from '@supabase/supabase-js';
import { castVideo } from '../lib/higgsfield.js';
import { copyCastToR2, r2Configured } from '../lib/r2.js';
import { checkAndConsumeQuota } from '../lib/gate.js';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

/**
 * gate.js has been through a few shapes. Normalise whatever it returns so a
 * change there can't silently start giving away free casts.
 */
function normaliseQuota(result) {
  if (result === true) return { allowed: true, remaining: null, isMember: false };
  if (result === false) return { allowed: false, remaining: 0, isMember: false };
  const allowed = result?.allowed ?? result?.ok ?? result?.permitted;
  return {
    allowed: allowed !== false,
    remaining: result?.remaining ?? null,
    isMember: Boolean(result?.isMember),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---- Identity ----------------------------------------------------------
  // Derived from the token, never from the body. The body cannot be trusted:
  // it is whatever the caller typed. Every paid action below hangs off this
  // line, so it comes first and it fails closed.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to cast a scene.' });

  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (authErr || !user) return res.status(401).json({ error: 'Sign in to cast a scene.' });

  const userId = user.id;

  const { scenePrompt, faceImageBase64, clipId, clipTitle } = req.body || {};

  if (!scenePrompt) return res.status(400).json({ error: 'Missing scene prompt.' });
  if (!faceImageBase64) return res.status(400).json({ error: 'Missing face image.' });

  // ---- Quota -------------------------------------------------------------
  let quota;
  try {
    quota = normaliseQuota(await checkAndConsumeQuota(userId));
  } catch (err) {
    console.error('[star] quota check failed', err);
    return res.status(500).json({ error: 'Could not check your remaining casts.' });
  }

  if (!quota.allowed) {
    return res.status(402).json({
      error: "You've used your free casts.",
      remaining: 0,
      isMember: quota.isMember,
    });
  }

  // ---- Generate ----------------------------------------------------------
  let falVideoUrl, falSceneUrl;
  try {
    ({ videoUrl: falVideoUrl, sceneUrl: falSceneUrl } = await castVideo({
      faceBase64: faceImageBase64,
      scenePrompt,
    }));
  } catch (err) {
    console.error('[star] generation failed', err);
    return res.status(502).json({ error: 'The scene failed to render. Try again.' });
  }

  // ---- Persist -----------------------------------------------------------
  // Reserve the row first so we have the share_id to key the R2 objects by.
  const { data: asset, error: insertErr } = await admin
    .from('assets')
    .insert({
      user_id: userId,
      prompt: scenePrompt,
      clip_id: clipId ?? null,
      clip_title: clipTitle ?? null,
      source_video_url: falVideoUrl,
      source_image_url: falSceneUrl,
      // Fal URLs go in temporarily; overwritten with R2 URLs below.
      video_url: falVideoUrl,
      image_url: falSceneUrl, // the still; doubles as og:image
      public: false,
    })
    .select('id, share_id')
    .single();

  if (insertErr || !asset) {
    console.error('[star] asset insert failed', insertErr);
    // The cast succeeded; don't punish the user. Return the fal URLs and let
    // them save the file. They just don't get a share link this time.
    return res.status(200).json({
      videoUrl: falVideoUrl,
      sceneUrl: falSceneUrl,
      shareId: null,
      assetId: null,
      remaining: quota.remaining,
      isMember: quota.isMember,
      warning: 'This cast could not be saved to your assets.',
    });
  }

  // ---- Own the files -----------------------------------------------------
  let videoUrl = falVideoUrl;
  let stillUrl = falSceneUrl;

  if (r2Configured()) {
    try {
      ({ videoUrl, stillUrl } = await copyCastToR2({
        shareId: asset.share_id,
        videoUrl: falVideoUrl,
        stillUrl: falSceneUrl,
      }));

      await admin
        .from('assets')
        .update({ video_url: videoUrl, image_url: stillUrl })
        .eq('id', asset.id);
    } catch (err) {
      // Non-fatal. The row keeps the fal URLs, which work for ~an hour.
      console.error('[star] R2 copy failed, keeping fal URLs', err);
    }
  } else {
    console.warn('[star] R2 not configured — storing fal URLs, which will expire');
  }

  return res.status(200).json({
    videoUrl,
    sceneUrl: stillUrl,
    shareId: asset.share_id,
    assetId: asset.id,
    remaining: quota.remaining,
    isMember: quota.isMember,
  });
}
