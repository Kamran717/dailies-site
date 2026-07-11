// lib/gate.js — the cast gate. All the logic (member > free > credits) now lives
// in the atomic Postgres function consume_cast(), so two rapid casts can't
// double-spend a credit. Server-only (uses the secret key).
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

export async function checkAndConsumeQuota(userId) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return { allowed: false, reason: "signin_required", remaining: 0 };
  }
  const { data, error } = await supabase.rpc("consume_cast", { uid: userId });
  if (error || !data) {
    console.error("[gate] consume_cast failed:", error);
    return { allowed: false, reason: "error", remaining: 0 };
  }
  // data = { allowed, remaining, isMember?, source?, reason? }
  return data;
}
