// Verified Stripe webhook. Never trust prices, plans, or payment status from
// the browser. Deploy with STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, and one
// STRIPE_PRICE_PRO_* secret per plan.

import { BOOST_CURRENCY, BOOST_PRICE_CENTS } from "../_shared/boosts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const STRIPE_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const PLAN_BY_PRICE: Record<string, string> = Object.fromEntries([
  [Deno.env.get("STRIPE_PRICE_PRO_STARTER") || "", "pro-starter"],
  [Deno.env.get("STRIPE_PRICE_PRO_BUSINESS") || "", "pro-business"],
  [Deno.env.get("STRIPE_PRICE_PRO_PREMIUM") || "", "pro-premium"],
  [Deno.env.get("STRIPE_PRICE_PRO_ELITE") || "", "pro-elite"],
  [Deno.env.get("STRIPE_PRICE_PRO_UNLIMITED") || "", "pro-unlimited"],
].filter(([price]) => price));

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  try {
    const value = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "");
    if (typeof value === "string") return value;
    if (value && typeof value === "object") for (const item of Object.values(value)) if (typeof item === "string" && item.length > 20) return item;
  } catch (_) { /* no secret */ }
  return "";
}
const SERVICE_KEY = serviceKey();
function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
function hexBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return new Uint8Array(value.match(/.{2}/g)!.map(x => parseInt(x, 16)));
}
function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]; return diff === 0;
}
async function verified(raw: string, signature: string): Promise<boolean> {
  const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
  const candidates = [...signature.matchAll(/(?:^|,)v1=([0-9a-f]{64})/gi)].map(m => m[1]);
  if (!timestamp || !candidates.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(STRIPE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)));
  return candidates.some(candidate => equal(digest, hexBytes(candidate) || new Uint8Array()));
}
async function setEvent(id: string, status: "processed" | "ignored" | "failed", errorCode?: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/payment_webhook_events?stripe_event_id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status, processed_at: new Date().toISOString(), error_code: errorCode || null }),
  });
}
async function stripeSubscription(id: string) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  if (response.ok) return await response.json();
  // 4xx = Stripe has no such subscription (not retryable). Anything else is
  // an outage on the way to Stripe: throw so the event is redelivered.
  if (response.status >= 400 && response.status < 500 && response.status !== 429) return null;
  throw new Error("stripe_unavailable");
}
async function updateProfile(userId: string, subscription: any, plan: string | null) {
  const active = subscription.status === "active" || subscription.status === "trialing";
  // Stripe API versions from 2025-03-31 moved the period end from the
  // subscription onto its items; read whichever the account's version sends.
  const periodEnd = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      account_type: "business",
      account_plan: active && plan ? plan : "personal-free",
      subscription_status: active && plan ? "active" : "inactive",
      stripe_customer_id: String(subscription.customer || "") || null,
      stripe_subscription_id: String(subscription.id || "") || null,
      subscription_current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      subscription_cancel_at_period_end: !!subscription.cancel_at_period_end,
    }),
  });
  return response.ok;
}
// A paid one-time Checkout Session for a boost (see create-checkout). Returns
// an error code when the payment cannot be applied and needs a refund; throws
// when the database is unreachable so Stripe redelivers.
async function applyBoost(session: any): Promise<string | null> {
  const meta = session.metadata || {};
  const days = String(meta.boost_days || "");
  if (session.payment_status !== "paid") return "boost_not_paid";
  if (!/^[0-9a-f-]{36}$/i.test(meta.supabase_user_id || "") || !/^\d{1,18}$/.test(meta.listing_id || "")) return "untrusted_boost_data";
  if (session.currency !== BOOST_CURRENCY || session.amount_total !== BOOST_PRICE_CENTS[days]) return "boost_amount_mismatch";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_stripe_boost`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p: {
      session_id: session.id, payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      user_id: meta.supabase_user_id, listing_id: meta.listing_id, boost_days: Number(days),
      amount_total: session.amount_total, currency: session.currency,
    } }),
  });
  if (!response.ok) throw new Error("boost_update_failed");
  const result = await response.json();
  return result?.ok ? null : String(result?.reason || "boost_not_applied");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_SECRET || !STRIPE_KEY) return new Response("not configured", { status: 503 });
  if (Number(req.headers.get("content-length") || 0) > 1024 * 1024) return new Response("payload too large", { status: 413 });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > 1024 * 1024 || !(await verified(raw, req.headers.get("stripe-signature") || ""))) return new Response("invalid signature", { status: 400 });
  let event: any; try { event = JSON.parse(raw); } catch (_) { return new Response("invalid payload", { status: 400 }); }
  if (!event?.id || !event?.type) return new Response("invalid event", { status: 400 });
  // Ignore duplicate delivery before performing any billing mutation.
  const insert = await fetch(`${SUPABASE_URL}/rest/v1/payment_webhook_events?on_conflict=stripe_event_id`, {
    method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify([{ stripe_event_id: event.id, event_type: event.type }]),
  });
  if (!insert.ok) return new Response("event store unavailable", { status: 503 });
  const inserted = await insert.json();
  if (!Array.isArray(inserted) || !inserted.length) {
    // Seen before. Only a delivery that finished is a true duplicate; one
    // that failed part-way is retried by Stripe and must be processed again
    // (the update below is idempotent: it copies Stripe's current state).
    const seen = await fetch(`${SUPABASE_URL}/rest/v1/payment_webhook_events?stripe_event_id=eq.${encodeURIComponent(event.id)}&select=status,error_code`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [previous] = seen.ok ? await seen.json() : [];
    const retryable = previous?.status === "failed" && previous?.error_code === "processing_failed";
    if (!retryable) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    const object = event.data?.object || {};
    if (object.mode === "payment" && object.metadata?.kind === "boost" && String(event.type).startsWith("checkout.session.")) {
      // Sessions that expired or whose delayed payment failed carry nothing to apply.
      const settled = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
      const problem = settled ? await applyBoost(object) : "boost_not_paid";
      if (problem === "boost_not_paid") await setEvent(event.id, "ignored");
      else await setEvent(event.id, problem ? "failed" : "processed", problem || undefined);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : object.id;
    if (!subscriptionId || !String(event.type).startsWith("checkout.session.") && !String(event.type).startsWith("customer.subscription.")) {
      await setEvent(event.id, "ignored");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
    const subscription = await stripeSubscription(subscriptionId);
    // A deleted subscription may no longer be retrievable from Stripe. The
    // deletion event still contains the authoritative metadata and item price,
    // so use that event object to revoke access instead of leaving Pro active.
    const source = subscription || (event.type === "customer.subscription.deleted" ? object : null);
    const userId = source?.metadata?.supabase_user_id || object?.metadata?.supabase_user_id || object?.client_reference_id;
    const priceId = source?.items?.data?.[0]?.price?.id || object?.items?.data?.[0]?.price?.id;
    const plan = PLAN_BY_PRICE[priceId || ""] || null;
    if (!source || !userId || !/^[0-9a-f-]{36}$/i.test(userId) || (!plan && event.type !== "customer.subscription.deleted")) {
      await setEvent(event.id, "failed", "untrusted_subscription_data");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
    if (!(await updateProfile(userId, source, plan))) throw new Error("profile_update_failed");
    await setEvent(event.id, "processed");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (_) {
    // A transient failure (Stripe or database unreachable) must not be
    // acknowledged: answering 200 here left a paid subscriber without Pro, or
    // a cancelled one with it, forever. 5xx makes Stripe redeliver.
    await setEvent(event.id, "failed", "processing_failed").catch(() => {});
    return new Response("processing failed", { status: 500 });
  }
});
