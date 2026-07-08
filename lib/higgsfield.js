// lib/higgsfield.js  —  generation adapter (fal.ai)
// ─────────────────────────────────────────────────────────────
// Switched off the Higgsfield Node SDK (which forced slow Soul training
// and kept hitting the 300s limit) onto fal.ai's clean REST API.
//
// Install:  npm i @fal-ai/client
// Credentials: a single FAL_KEY env var from fal.ai/dashboard/keys.
//
// One fast cast, two documented calls:
//   1. nano-banana/edit  — drop the face into the scene (~5-10s)
//   2. kling image2video — animate that frame into a 5s clip (~30-60s)
// Both under one request, so no async plumbing needed.
// ─────────────────────────────────────────────────────────────

import { fal } from "@fal-ai/client";
// fal reads FAL_KEY from the environment automatically.

export async function castVideo({ faceBase64, scenePrompt }) {
  // Upload the face so the models can read it by URL.
  const buffer = Buffer.from(
    faceBase64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const faceUrl = await fal.storage.upload(
    new Blob([buffer], { type: "image/jpeg" })
  );

  // 1 — composite the person into the scene (fast).
  const editPrompt =
    "Place the person from the reference photo as the main subject of this scene, " +
    "preserving their exact face, beard, hairstyle, and skin tone. Scene: " +
    scenePrompt;

  const img = await fal.subscribe("fal-ai/nano-banana/edit", {
    input: { prompt: editPrompt, image_urls: [faceUrl], aspect_ratio: "16:9" },
  });
  const sceneUrl = img?.data?.images?.[0]?.url;
  if (!sceneUrl) throw new Error("Scene image failed");

  // 2 — animate the frame into a 5-second clip.
  const vid = await fal.subscribe(
    "fal-ai/kling-video/v2.1/standard/image-to-video",
    { input: { prompt: scenePrompt, image_url: sceneUrl, duration: "5" } }
  );
  const videoUrl = vid?.data?.video?.url;
  if (!videoUrl) throw new Error("Video generation failed");

  return { videoUrl, sceneUrl };
}
