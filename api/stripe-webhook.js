// api/stripe-webhook.js — the ONLY place credits are added. Signature-verified,
// idempotent (apply_purchase keys on the Stripe session id). Server-only.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Stripe signature verification needs the raw, unparsed body.
export const config = { api: { bodyParser: false } };
async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
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
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      // Only credit a PAID one-time pack purchase.
      if (s.mode === "payment" && s.payment_status === "paid") {
        const uid = s.metadata?.user_id || s.client_reference_id;
        const casts = parseInt(s.metadata?.casts || "0", 10);
        if (uid && casts > 0) {
          const { data, error } = await supabase.rpc("apply_purchase", {
            uid, sess: s.id, n: casts, cents: s.amount_total ?? null,
          });
          if (error) console.error("[webhook] apply_purchase error:", error);
          else console.log("[webhook] purchase:", s.id, JSON.stringify(data));
        }
      }
    }
    // (Future) subscription events for the monthly unlimited plan go here.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
