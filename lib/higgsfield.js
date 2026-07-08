// lib/higgsfield.js  —  generation adapter (official Higgsfield Node SDK)
// ─────────────────────────────────────────────────────────────
// Install:  npm i @higgsfield/client
// Credentials: a Key ID + Key Secret from cloud.higgsfield.ai, billed
// against your existing Higgsfield credits. Server-side only.
//
// This mirrors the exact chain proven in testing:
//   1. createIdentity() — lock the uploaded face as a reusable SoulId
//   2. castVideo() step A — place that identity into the scene as a still
//      (Soul text-to-image with the face preserved)
//   3. castVideo() step B — animate that still into a ~5-second clip
//      (DoP image-to-video)
//
// Every call is from Higgsfield's official SDK README. It uses the v1
// client, which is marked deprecated but fully supported and is where the
// identity (SoulId) flow lives today — migrating to v2 is a later cleanup.
// The only line worth confirming against the installed helpers is the
// landscape frame size (ⓘ) — the README documents SQUARE and PORTRAIT by
// name; a 16:9 size exists but verify its exact export.
// ─────────────────────────────────────────────────────────────

import { HiggsfieldClient, InputImageType } from "@higgsfield/client";
import {
  InputImage,
  DoPModel,
  SoulQuality,
  SoulSize,
  BatchSize,
  strength,
  inputMotion,
} from "@higgsfield/client/helpers";

const client = new HiggsfieldClient({
  apiKey: process.env.HF_API_KEY,       // Key ID
  apiSecret: process.env.HF_API_SECRET, // Key Secret
});

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
      input_images: [{ type: InputImageType.IMAGE_URL, image_url: faceUrl }],
    },
    true // withPolling — wait until the identity is ready
  );
  if (!soul.isCompleted) throw new Error("Identity creation failed");
  return soul.id;
}

// Place the identity into the scene, then animate to a ~5-second clip.
// Returns both the finished video and the scene still (handy for the
// "judge the likeness" checkpoint in the UI).
export async function castVideo({ soulId, scenePrompt, motionPrompt, motionId }) {
  // A — scene still with the face preserved
  const imageSet = await client.generate(
    "/v1/text2image/soul",
    {
      prompt: scenePrompt,
      custom_reference_id: soulId,
      custom_reference_strength: strength(1),
      width_and_height: SoulSize.SQUARE_1536x1536, // ⓘ swap for a 16:9 size for widescreen
      quality: SoulQuality.HD,
      batch_size: BatchSize.SINGLE,
    },
    { withPolling: true }
  );
  const sceneUrl = imageSet.jobs?.[0]?.results?.raw?.url;
  if (!sceneUrl) throw new Error("Scene image failed");

  // B — animate the still into a native ~5s clip
  const videoArgs = {
    model: DoPModel.TURBO, // DoPModel.STANDARD for best quality
    prompt: motionPrompt,
    input_images: [InputImage.fromUrl(sceneUrl)],
  };
  if (motionId) videoArgs.motions = [inputMotion(motionId, 0.8)];

  const videoSet = await client.generate("/v1/image2video/dop", videoArgs, {
    withPolling: true,
  });
  const videoUrl = videoSet.jobs?.[0]?.results?.raw?.url;
  if (!videoUrl) throw new Error("Video generation failed");

  return { videoUrl, sceneUrl };
}

// Fetch camera-move presets once so you can map your library's move tags
// (e.g. "Slow Dolly In") to a motion id and pass it into castVideo.
export async function listMotions() {
  return client.getMotions(); // [{ id, name, ... }]
}
