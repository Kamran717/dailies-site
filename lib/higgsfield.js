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

/**
 * castVideo({ faceBase64, scenePrompt }) -> { videoUrl, sceneUrl }
 *
 * videoUrl and sceneUrl are fal.media URLs. They EXPIRE. The caller is
 * responsible for copying them into R2 before storing them anywhere.
 */
export async function castVideo({ faceBase64, scenePrompt }) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set');
  if (!scenePrompt) throw new Error('No scene prompt provided');

  // 1. Face -> fal storage
  const faceUrl = await fal.storage.upload(blobFromBase64(faceBase64));

  // 2. Composite the face into the scene described by the clip's prompt.
  const edit = await fal.subscribe(EDIT_MODEL, {
    input: {
      prompt:
        `${scenePrompt}\n\n` +
        'Replace the primary subject with the person in the reference photo. ' +
        'Preserve their facial identity, skin tone, and hair exactly. ' +
        'Match the scene lighting, film grain, lens character, and color grade.',
      image_urls: [faceUrl],
      num_images: 1,
      output_format: 'jpeg',
    },
    logs: false,
  });

  const sceneUrl = edit?.data?.images?.[0]?.url;
  if (!sceneUrl) throw new Error('Scene composite failed: no image returned');

  // 3. Still -> 5s clip.
  const video = await fal.subscribe(VIDEO_MODEL, {
    input: {
      prompt: scenePrompt,
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
