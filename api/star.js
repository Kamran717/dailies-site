// api/star.js  —  Vercel serverless function
// The Generate button POSTs here. It gates the request, reuses (or builds)
// the user's identity, casts them into the scene, and returns the finished
// ~5-second clip in one response.
//
// Body: { userId, scenePrompt, faceImageBase64, motionPrompt?, motionId? }

import { Redis } from "@upstash/redis";
import { checkAndConsumeQuota } from "../lib/gate.js";
import { createIdentity, castVideo } from "../lib/higgsfield.js";

const redis = Redis.fromEnv();

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
  maxDuration: 300, // room for identity + image + video (needs a Vercel plan that allows it)
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { userId, scenePrompt, faceImageBase64, motionPrompt, motionId } =
    req.body || {};
  if (!userId || !scenePrompt || !faceImageBase64) {
    return res
      .status(400)
      .json({ error: "Missing userId, scenePrompt, or faceImageBase64" });
  }

  try {
    // 1 — Gate. Free users get a set number of casts, then must subscribe.
    const gate = await checkAndConsumeQuota(userId);
    if (!gate.allowed) {
      return res.status(402).json({
        error: "limit_reached",
        message: "You've used your free casts. Subscribe for unlimited 5-second casts.",
        remaining: 0,
      });
    }

    // 2 — Identity. Reuse the user's SoulId if we've built it before; this is
    //     what makes repeat casts fast and cheap (first cast pays for it once).
    let soulId = await redis.get(`soul:${userId}`);
    if (!soulId) {
      soulId = await createIdentity({
        faceBase64: faceImageBase64,
        name: `user-${userId}`,
      });
      await redis.set(`soul:${userId}`, soulId);
    }

    // 3 — Cast into the scene and animate.
    const { videoUrl, sceneUrl } = await castVideo({
      soulId,
      scenePrompt,
      motionPrompt: motionPrompt || "Slow cinematic dolly-in, subtle ambient motion.",
      motionId, // optional camera-move preset from your library's tags
    });

    return res.status(200).json({ videoUrl, sceneUrl, remaining: gate.remaining });
  } catch (err) {
    console.error("[star] failed:", err);
    return res
      .status(500)
      .json({ error: "generation_failed", message: err.message });
  }
}
