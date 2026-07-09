// lib/gate.js  —  the free-cast gate, backed by Supabase `profiles`.
// ─────────────────────────────────────────────────────────────
// Single source of truth: accounts, membership, and cast counts all
// live in Postgres. Uses the SECRET key (server-only), which bypasses
// RLS — that's why this must never run in the browser.
//
// Rules:
//   • Casting requires a signed-in user (no anonymous casts).
//   • Free users get FREE_CASTS lifetime casts.
//   • Members are allowed through; their usage is still counted so you
//     can see it in analytics and cap it later if needed.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const FREE_CASTS = 5;

export async function checkAndConsumeQuota(userId) {
  // Anonymous ids can't cast any more — sign-in required.
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return { allowed: false, reason: "signin_required", remaining: 0 };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, is_member, casts_used")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { allowed: false, reason: "no_profile", remaining: 0 };
  }

  // Members pass; we still count the cast for analytics.
  if (profile.is_member) {
    await supabase
      .from("profiles")
      .update({ casts_used: profile.casts_used + 1 })
      .eq("id", userId);
    return { allowed: true, remaining: null, isMember: true };
  }

  if (profile.casts_used >= FREE_CASTS) {
    return { allowed: false, reason: "limit_reached", remaining: 0 };
  }

  const used = profile.casts_used + 1;
  await supabase.from("profiles").update({ casts_used: used }).eq("id", userId);
  return { allowed: true, remaining: FREE_CASTS - used, isMember: false };
}
