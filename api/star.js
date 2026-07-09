// api/star.js  —  the cast. One request: gate, then generate.
// Body: { userId, scenePrompt, faceImageBase64 }
// userId must be a real (signed-in) Supabase user id.

import { checkAndConsumeQuota } from "../lib/gate.js";
import { castVideo } from "../lib/higgsfield.js";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { userId, scenePrompt, faceImageBase64 } = req.body || {};
  if (!userId || !scenePrompt || !faceImageBase64) {
    return res.status(400).json({ error: "Missing userId, scenePrompt, or faceImageBase64" });
  }

  try {
    const gate = await checkAndConsumeQuota(userId);

    if (!gate.allowed) {
      if (gate.reason === "signin_required" || gate.reason === "no_profile") {
        return res.status(401).json({
          error: "signin_required",
          message: "Sign in to cast yourself into a scene.",
        });
      }
      return res.status(402).json({
        error: "limit_reached",
        message: "You've used your 5 free casts. Subscribe for more.",
        remaining: 0,
      });
    }

    const { videoUrl, sceneUrl } = await castVideo({
      faceBase64: faceImageBase64,
      scenePrompt,
    });

    return res.status(200).json({
      videoUrl,
      sceneUrl,
      remaining: gate.remaining,
      isMember: gate.isMember,
    });
  } catch (err) {
    console.error("[star] failed:", err);
    return res.status(500).json({ error: "generation_failed", message: err.message });
  }
}
