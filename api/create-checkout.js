// api/create-checkout.js  —  Vercel serverless function
// The "Subscribe" button POSTs here with { userId }. It opens a Stripe
// Checkout session and returns a URL to redirect the user to. When they
// pay, Stripe calls /api/stripe-webhook, which flips their sub flag on.

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: userId, // so the webhook knows who paid
      success_url: `${process.env.SITE_URL}/?subscribed=1`,
      cancel_url: `${process.env.SITE_URL}/?canceled=1`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed:", err);
    return res.status(500).json({ error: "checkout_failed", message: err.message });
  }
}
