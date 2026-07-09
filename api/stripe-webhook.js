// api/stripe-webhook.js  —  Vercel serverless function
// Stripe calls this after events. It's the ONLY thing that may set
// is_member — never trust the browser for that. Writes to Supabase
// `profiles` with the secret key.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

// Stripe signature verification needs the raw, unparsed body.
export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let event;
  try {
    const body = await rawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] bad signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Someone subscribed → unlock membership.
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id; // the Supabase user id
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              is_member: true,
              member_since: new Date().toISOString(),
              stripe_customer_id: s.customer || null,
              casts_this_period: 0,
              period_started_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      // Subscription ended → back to the free tier.
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase
          .from("profiles")
          .update({ is_member: false })
          .eq("stripe_customer_id", sub.customer);
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
