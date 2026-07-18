// lib/higgsfield.js
//
// MISLEADING NAME, KEPT ON PURPOSE: this is the fal.ai adapter. Higgsfield's
// Node SDK was abandoned (the /helpers subpath isn't published, and
// createSoulId identity training exceeds Vercel Pro's 300s ceiling).
// Do not go back to it. Renaming the file is a separate, later commit.
//
// Pipeline, ~75s and ~$0.32 per cast:
//   1. upload the face to fal storage
//   2. fal-ai/nano-banana/edit          composites the face into the scene (~10s, ~$0.04)
//   3. fal-ai/kling-video/v2.1/standard/image-to-video   5s clip (~60s, ~$0.28)

import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

const EDIT_MODEL = 'fal-ai/nano-banana/edit';
const VIDEO_MODEL = 'fal-ai/kling-video/v2.1/standard/image-to-video';

// Kling 2.1 Standard accepts "5" or "10" only. 10s roughly doubles cost.
const DURATION = '5';

/**
 * Turn a base64 data URL (or bare base64) into a Blob fal can upload.
 */
function blobFromBase64(input) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(input || '');
  const mime = match ? match[1] : 'image/jpeg';
  const raw = match ? match[2] : input;
  if (!raw) throw new Error('No face image provided');
  return new Blob([Buffer.from(raw, 'base64')], { type: mime });
}

// ---------------------------------------------------------------------------
// Cast fidelity helpers
// ---------------------------------------------------------------------------

const MEDIA_BASE = 'https://videos.aidirectorme.com';

/**
 * Every library clip has a first-frame poster in R2 (made by
 * scripts/make-web-assets.mjs). Compositing the face into the REAL frame —
 * instead of letting the edit model re-imagine the scene from text — keeps
 * the cast's composition, setting and framing identical to the original.
 * Returns null when no poster exists; the caller falls back to text-only.
 */
async function resolvePosterUrl(clipId) {
  if (!clipId || !/^[a-z0-9-]{1,120}$/i.test(clipId)) return null;
  // posters-hd/ ONLY: full-resolution first frames (scripts/make-hd-posters.mjs).
  // The 640px web posters in posters/ are too soft to composite into — a cast
  // built on one comes out mushy. Until an HD frame exists for a clip, casts
  // fall back to the legacy text-only scene generation.
  for (const name of [`${clipId}-v1.jpg`, `${clipId}.jpg`]) {
    const url = `${MEDIA_BASE}/posters-hd/${name}`;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) return url;
    } catch { /* network hiccup -> try next / fall back */ }
  }
  return null;
}

/**
 * Precise, repeatable camera choreography per move. Text-to-video models
 * improvise anything a prompt leaves open, so every micro-decision (speed,
 * direction, radius, easing, cuts) is pinned down explicitly. Keys are
 * normalized lowercase.
 */
const MOTION_SPECS = {
  'orbit right': 'one single unbroken orbit CLOCKWISE around the subject: constant radius, constant height at chest level, constant slow speed, subject locked dead-center and perfectly stationary, full 360 degrees, no cuts, no zoom, no framing drift',
  'orbit left': 'one single unbroken orbit COUNTER-CLOCKWISE around the subject: constant radius, constant height at chest level, constant slow speed, subject locked dead-center and perfectly stationary, full 360 degrees, no cuts, no zoom, no framing drift',
  'dolly zoom': 'classic dolly zoom (vertigo effect): camera physically dollies backward while lens zooms in at matched rate, subject stays exactly the same size in frame while the background stretches and warps, camera height fixed, subject centered, one continuous take, no cuts',
  'push in': 'slow steady straight push-in toward the subject on a fixed axis: constant speed, no lateral drift, no height change, subject centered throughout, one continuous take, no cuts',
  'slow dolly in': 'very slow smooth dolly forward toward the subject on a straight line: constant creeping speed, level camera, no shake, subject centered, one continuous take, no cuts',
  'dolly out': 'slow steady straight pull-back away from the subject on a fixed axis: constant speed, level camera, subject stays centered and stationary as the frame widens, one continuous take, no cuts',
  'zoom in': 'optical zoom in only: camera position completely fixed, lens zooms slowly and smoothly toward the subject, no camera movement or shake, subject centered, one continuous take, no cuts',
  'zoom out': 'optical zoom out only: camera position completely fixed, lens widens slowly and smoothly away from the subject, no camera movement, subject centered, one continuous take, no cuts',
  'crane rise': 'smooth crane/jib rise: camera ascends vertically at constant speed while tilting down slightly to keep the subject framed, no lateral movement, one continuous take, no cuts',
  'crane down': 'smooth crane/jib descent: camera lowers vertically at constant speed while tilting up slightly to keep the subject framed, no lateral movement, one continuous take, no cuts',
  'whip pan': 'a single fast whip pan: camera stays on its axis and whips horizontally with strong motion blur, landing precisely on the subject and holding steady, exactly one whip, no cuts',
  'tracking side': 'lateral tracking shot: camera trucks sideways parallel to the subject at exactly the subject’s speed, constant distance and height, subject stays locked at frame center, level horizon, one continuous take, no cuts',
  'handheld push': 'handheld push toward the subject: gentle organic sway and micro-shake, advancing steadily, subject kept near center, no cuts, no zoom',
  'handheld': 'handheld camera: subtle organic sway and micro-shake, camera roughly stationary, subject centered, no cuts, no zoom',
  'static locked-off': 'camera absolutely locked off on a tripod: zero movement, zero shake, zero zoom, fixed framing for the entire duration, all motion comes from the scene itself, no cuts',
  'static': 'camera absolutely locked off on a tripod: zero movement, zero shake, zero zoom, fixed framing for the entire duration, all motion comes from the scene itself, no cuts',
  'static wide': 'camera absolutely locked off on a wide tripod framing: zero movement, zero shake, zero zoom, all motion comes from the scene itself, no cuts',
  'slow pan': 'slow horizontal pan on a fixed tripod position: constant gentle speed in one direction only, level horizon, no height change, no zoom, one continuous take, no cuts',
  'tilt up': 'smooth tilt up on a fixed tripod position: camera rotates upward at constant speed, no lateral movement, no zoom, one continuous take, no cuts',
  'tilt down': 'smooth tilt down on a fixed tripod position: camera rotates downward at constant speed, no lateral movement, no zoom, one continuous take, no cuts',
  'overhead drop': 'top-down overhead shot descending: camera points straight down and lowers vertically at constant speed toward the subject, no rotation, subject centered, one continuous take, no cuts',
  'pedestal up': 'pedestal move: entire camera rises vertically at constant speed with NO tilt, framing slides upward evenly, one continuous take, no cuts',
  'drone fly-through': 'smooth drone fly-through: camera flies forward along a single continuous path through the scene at constant speed, gentle banking only, no cuts, no hovering',
  'drone ascend': 'drone ascent: camera rises vertically and smoothly, gaining altitude at constant speed while keeping the scene below in frame, slight downward tilt increase, one continuous take, no cuts',
  'steadicam follow': 'steadicam follow shot: camera glides smoothly behind/with the subject at their exact pace, floating stabilized motion, constant following distance, subject centered, one continuous take, no cuts',
  'dutch roll': 'dutch angle roll: camera holds position while rolling smoothly on its long axis, horizon tilting progressively, no lateral movement, no zoom, one continuous take, no cuts',
  'snorricam': 'snorricam: camera rigidly fixed to the subject facing them, so the subject stays perfectly locked in frame while the entire background moves and sways around them, one continuous take, no cuts',
};

function motionSpecFor(cameraMove) {
  if (!cameraMove) return null;
  return MOTION_SPECS[String(cameraMove).trim().toLowerCase()] || null;
}

/**
 * castVideo({ faceBase64, scenePrompt, clipId, cameraMove }) -> { videoUrl, sceneUrl }
 *
 * videoUrl and sceneUrl are fal.media URLs. They EXPIRE. The caller is
 * responsible for copying them into R2 before storing them anywhere.
 */
export async function castVideo({ faceBase64, scenePrompt, clipId, cameraMove }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set');
  if (!scenePrompt) throw new Error('No scene prompt provided');

  // 1. Face -> fal storage (poster lookup runs concurrently)
  const [faceUrl, posterUrl] = await Promise.all([
    fal.storage.upload(blobFromBase64(faceBase64)),
    resolvePosterUrl(clipId),
  ]);

  // 2. Composite the face into the scene.
  //    With a poster: edit the REAL first frame of the clip -> identical scene.
  //    Without: legacy behavior, re-imagine the scene from the text prompt.
  const editInput = posterUrl
    ? {
        prompt:
          'FACE AND IDENTITY SWAP. Image 1 is a film frame; image 2 is a photo of a person. ' +
          'Replace the main subject in image 1 (the central person the shot focuses on) with the person from image 2. ' +
          'The result MUST clearly show the face, skin tone, and hairstyle of the person from image 2, ' +
          'blended naturally into the scene — matching image 1’s pose, wardrobe, scale, lighting, film grain, and color grade. ' +
          'Keep everything else in image 1 unchanged: composition, framing, background, and any other people.',
        image_urls: [posterUrl, faceUrl],
        num_images: 1,
        output_format: 'jpeg',
      }
    : {
        prompt:
          `${scenePrompt}\n\n` +
          'Replace the primary subject with the person in the reference photo. ' +
          'Preserve their facial identity, skin tone, and hair exactly. ' +
          'Match the scene lighting, film grain, lens character, and color grade.',
        image_urls: [faceUrl],
        num_images: 1,
        output_format: 'jpeg',
      };

  const edit = await fal.subscribe(EDIT_MODEL, { input: editInput, logs: false });

  const sceneUrl = edit?.data?.images?.[0]?.url;
  if (!sceneUrl) throw new Error('Scene composite failed: no image returned');

  // 3. Still -> 5s clip, with the camera choreography pinned down explicitly.
  const spec = motionSpecFor(cameraMove);
  const videoPrompt = spec
    ? `${scenePrompt}\n\nCAMERA (follow exactly): ${spec}.`
    : `${scenePrompt}\n\nCAMERA: execute the camera movement described above precisely, as one continuous take, no cuts, subject centered.`;

  const video = await fal.subscribe(VIDEO_MODEL, {
    input: {
      prompt: videoPrompt,
      image_url: sceneUrl,
      duration: DURATION,
    },
    logs: false,
  });

  const videoUrl = video?.data?.video?.url;
  if (!videoUrl) throw new Error('Video generation failed: no video returned');

  return { videoUrl, sceneUrl };
}

export default { castVideo };
