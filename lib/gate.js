// lib/gate.js  —  the free-cast gate
// ─────────────────────────────────────────────────────────────
// This is what protects your credits. It counts how many casts each
// user has spent and lets subscribers through unlimited. Shown with
// Upstash Redis because it runs on Vercel with zero servers to manage,
// but any KV or database works — the logic is the point.
//
// How the two keys get set:
//   casts:<userId>  — bumped here on every successful cast.
//   sub:<userId>    — set to "1" by your Stripe webhook when a
//                     subscription starts, deleted when it ends.
//                     (That webhook is the one remaining backend file.)
// ─────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL / _TOKEN from env

const FREE_CASTS = 2; // how many casts a signed-in free user gets

export async function checkAndConsumeQuota(userId) {
  // Subscribers: unlimited, nothing consumed.
  const isSubscriber = await redis.get(`sub:${userId}`);
  if (isSubscriber) return { allowed: true, remaining: Infinity };

  const used = Number((await redis.get(`casts:${userId}`)) || 0);
  if (used >= FREE_CASTS) {
    return { allowed: false, remaining: 0 };
  }

  await redis.set(`casts:${userId}`, used + 1);
  return { allowed: true, remaining: FREE_CASTS - used - 1 };
}
