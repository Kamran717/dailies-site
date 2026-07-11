// api/create-checkout.js — opens a Stripe Checkout session for a one-time cast pack.
// POST { pack } + Authorization: Bearer <supabase token>. Returns { url }.
// Packs are defined here (via Stripe price_data) — no products to set up in Stripe.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// amount is in cents. Change prices here.
const PACKS = {
  starter:  { casts: 5,  amount: 325,  label: "5 Casts" },
  standard: { casts: 10, amount: 640,  label: "10 Casts" },
  value:    { casts: 20, amount: 1225, label: "20 Casts" },
  best:     { casts: 50, amount: 2999, label: "50 Casts" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  // Identity from the token, never the body.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to buy casts." });
  const { data: ud, error: authErr } = await admin.auth.getUser(token);
  const user = ud?.user;
  if (authErr || !user) return res.status(401).json({ error: "Sign in to buy casts." });

  const cfg = PACKS[(req.body || {}).pack];
  if (!cfg) return res.status(400).json({ error: "Unknown pack." });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `AiDirectorMe — ${cfg.label}` },
          unit_amount: cfg.amount,
        },
        quantity: 1,
      }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, casts: String(cfg.casts), pack: (req.body || {}).pack },
      success_url: `${process.env.SITE_URL}/?purchased=1`,
      cancel_url: `${process.env.SITE_URL}/?canceled=1`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed:", err);
    return res.status(500).json({ error: "checkout_failed", message: err.message });
  }
}
