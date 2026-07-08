// api/stripe-webhook.js  —  Vercel serverless function
// Stripe calls this after events. It's the piece that makes the gate real:
// on payment it sets sub:<userId> = "1" (unlimited casts); on cancellation
// it deletes that flag (back to the free limit). This is the ONLY thing
// that should ever set a subscription flag — never trust the browser for it.

import Stripe from "stripe";
import { Redis } from "@upstash/redis";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const redis = Redis.fromEnv();

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
      // Someone subscribed → unlock unlimited casts.
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id;
        if (userId) {
          await redis.set(`sub:${userId}`, "1");
          // remember which Stripe customer maps to this user, so we can
          // turn it back off if they cancel later.
          if (s.customer) await redis.set(`cust:${s.customer}`, userId);
        }
        break;
      }

      // Subscription ended → back to the free limit.
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = await redis.get(`cust:${sub.customer}`);
        if (userId) await redis.del(`sub:${userId}`);
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
