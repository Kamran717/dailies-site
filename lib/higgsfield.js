// lib/higgsfield.js  —  generation adapter (official Higgsfield Node SDK)
// ─────────────────────────────────────────────────────────────
// Install:  npm i @higgsfield/client
// Credentials: a Key ID + Key Secret from cloud.higgsfield.ai.
// Server-side only.
//
// NOTE ON IMPORTS: the published package does not currently expose the
// "@higgsfield/client/helpers" subpath (importing it throws
// ERR_PACKAGE_PATH_NOT_EXPORTED). The helpers are just thin wrappers over
// plain values, so this file uses those raw values directly and imports
// ONLY from the main package entry, which loads cleanly.
//
// Two-step chain (proven in testing):
//   1. createIdentity() — lock the uploaded face as a reusable SoulId
//   2. castVideo()      — scene still with the face, then animate to ~5s
// ─────────────────────────────────────────────────────────────

import { HiggsfieldClient } from "@higgsfield/client";

const client = new HiggsfieldClient({
  apiKey: process.env.HF_API_KEY,       // Key ID
  apiSecret: process.env.HF_API_SECRET, // Key Secret
});

// Raw values that the /helpers subpath would otherwise provide:
const IMAGE_URL = "image_url";                 // InputImageType.IMAGE_URL
const DOP_TURBO = "dop-turbo";                 // DoPModel.TURBO
const SOUL_SIZE_SQUARE = "1536x1536";          // SoulSize.SQUARE_1536x1536
const SOUL_QUALITY_HD = "1080p";               // SoulQuality.HD
const BATCH_SINGLE = 1;                        // BatchSize.SINGLE
const inputImageFromUrl = (url) => ({ type: IMAGE_URL, image_url: url });
const inputMotion = (id, s = 0.8) => ({ id, strength: s });

// Lock an uploaded face into a reusable identity. Do this ONCE per user and
// store the returned id — every future cast reuses it, skipping this step.
export async function createIdentity({ faceBase64, name }) {
  const buffer = Buffer.from(
    faceBase64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const faceUrl = await client.uploadImage(buffer, "jpeg");

  const soul = await client.createSoulId(
    {
      name: name || "cast-user",
      input_images: [inputImageFromUrl(faceUrl)],
    },
    true // withPolling
  );
  if (!soul.isCompleted) throw new Error("Identity creation failed");
  return soul.id;
}

// Place the identity into the scene, then animate to a ~5-second clip.
export async function castVideo({ soulId, scenePrompt, motionPrompt, motionId }) {
  // A — scene still with the face preserved
  const imageSet = await client.generate(
    "/v1/text2image/soul",
    {
      prompt: scenePrompt,
      custom_reference_id: soulId,
      custom_reference_strength: 1,
      width_and_height: SOUL_SIZE_SQUARE,
      quality: SOUL_QUALITY_HD,
      batch_size: BATCH_SINGLE,
    },
    { withPolling: true }
  );
  const sceneUrl = imageSet.jobs?.[0]?.results?.raw?.url;
  if (!sceneUrl) throw new Error("Scene image failed");

  // B — animate the still into a native ~5s clip
  const videoArgs = {
    model: DOP_TURBO,
    prompt: motionPrompt,
    input_images: [inputImageFromUrl(sceneUrl)],
  };
  if (motionId) videoArgs.motions = [inputMotion(motionId, 0.8)];

  const videoSet = await client.generate("/v1/image2video/dop", videoArgs, {
    withPolling: true,
  });
  const videoUrl = videoSet.jobs?.[0]?.results?.raw?.url;
  if (!videoUrl) throw new Error("Video generation failed");

  return { videoUrl, sceneUrl };
}

// Camera-move presets, for mapping your library's move tags to motion ids.
export async function listMotions() {
  return client.getMotions();
}
