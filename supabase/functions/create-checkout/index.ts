// Authenticated Stripe Checkout creator. The browser supplies only a plan
// name (subscription) or a listing id + boost duration (one-time payment);
// the server maps them to a Stripe Price ID held in Edge Function secrets or
// to the fixed boost price. Deploy with STRIPE_SECRET_KEY and
// STRIPE_PRICE_PRO_* secrets.

import { BOOST_CURRENCY, BOOST_PRICE_CENTS } from "../_shared/boosts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const PRICE_BY_PLAN: Record<string, string> = {
  "pro-starter": Deno.env.get("STRIPE_PRICE_PRO_STARTER") || "",
  "pro-business": Deno.env.get("STRIPE_PRICE_PRO_BUSINESS") || "",
  "pro-premium": Deno.env.get("STRIPE_PRICE_PRO_PREMIUM") || "",
  "pro-elite": Deno.env.get("STRIPE_PRICE_PRO_ELITE") || "",
  "pro-unlimited": Deno.env.get("STRIPE_PRICE_PRO_UNLIMITED") || "",
};
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
function allowedOrigin(origin: string) {
  return origin === "https://buyselltradesxm.com" || origin === "https://www.buyselltradesxm.com" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = { "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store", "Vary": "Origin" };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(body: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } }); }
async function currentUser(bearer: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${bearer}` } });
  return response.ok ? await response.json() : null;
}
async function consume(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_security_rate_limit`, {
    method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_key: `checkout:${userId}`, max_attempts: 5, window_seconds: 600 }),
  });
  return response.ok && (await response.json()) === true;
}
// The caller's own listing, or null. A boost is only sold to the seller.
async function ownListing(listingId: string, userId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}&seller_id=eq.${encodeURIComponent(userId)}&select=id,title,status,moderation_status`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!response.ok) return null;
  const [listing] = await response.json();
  return listing || null;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, headers);
  if (!allowedOrigin(req.headers.get("origin") || "")) return json({ error: "forbidden" }, 403, headers);
  if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_KEY) return json({ error: "checkout unavailable" }, 503, headers);
  if (Number(req.headers.get("content-length") || 0) > 2048) return json({ error: "payload too large" }, 413, headers);
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await currentUser(bearer);
  if (!user?.id) return json({ error: "not authenticated" }, 401, headers);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > 2048) return json({ error: "payload too large" }, 413, headers);
  // deno-lint-ignore no-explicit-any
  let request: any = {}; try { request = JSON.parse(raw) || {}; } catch (_) { /* invalid plan below */ }
  const boost = request.boost && typeof request.boost === "object" ? request.boost : null;
  const plan = String(request.plan || "");
  const price = PRICE_BY_PLAN[plan];
  const boostDays = String(boost?.days || ""), boostListingId = String(boost?.listingId || "");
  if (boost && (!BOOST_PRICE_CENTS[boostDays] || !/^\d{1,18}$/.test(boostListingId))) return json({ error: "invalid boost" }, 400, headers);
  if (!boost && !price) return json({ error: "invalid plan" }, 400, headers);
  if (!(await consume(user.id))) return json({ error: "try again later" }, 429, headers);

  let form: URLSearchParams;
  if (boost) {
    const listing = await ownListing(boostListingId, user.id);
    if (!listing) return json({ error: "listing not found" }, 404, headers);
    const hidden = ["sold", "expired"].includes(listing.status) || (listing.moderation_status && listing.moderation_status !== "approved");
    if (hidden) return json({ error: "listing not boostable" }, 409, headers);
    const meta = { kind: "boost", supabase_user_id: user.id, listing_id: boostListingId, boost_days: boostDays };
    form = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": BOOST_CURRENCY,
      "line_items[0][price_data][unit_amount]": String(BOOST_PRICE_CENTS[boostDays]),
      "line_items[0][price_data][product_data][name]": `Boost ${boostDays} jours / days — ${String(listing.title || "").slice(0, 80)}`,
      "line_items[0][quantity]": "1",
      client_reference_id: user.id,
      // Terms: a boost is non-refundable once active; say so next to consent.
      "custom_text[submit][message]":
        "Le boost démarre dès le paiement confirmé et n'est pas remboursable une fois actif. " +
        "/ The boost starts as soon as payment is confirmed and is non-refundable once active.",
      success_url: `${SITE_URL}/?boost=success`,
      cancel_url: `${SITE_URL}/?boost=cancelled`,
    });
    for (const [key, value] of Object.entries(meta)) {
      form.set(`metadata[${key}]`, value);
      form.set(`payment_intent_data[metadata][${key}]`, value);
    }
    if (user.email) form.set("customer_email", user.email);
  } else form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    "metadata[supabase_user_id]": user.id,
    "metadata[plan]": plan,
    "subscription_data[metadata][supabase_user_id]": user.id,
    "subscription_data[metadata][plan]": plan,
    // Auto-renewal terms shown right above Stripe's Subscribe button
    // (California ARL / FTC ROSCA: clear and conspicuous, next to consent).
    "custom_text[submit][message]":
      "Renouvellement automatique chaque mois au même prix jusqu'à annulation. Annulable à tout moment en ligne : Profil > Gérer / annuler. " +
      "/ Renews automatically every month at the same price until you cancel. Cancel anytime online: Profile > Manage / cancel.",
    success_url: `${SITE_URL}/?checkout=success`,
    cancel_url: `${SITE_URL}/?checkout=cancelled`,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  if (!response.ok) return json({ error: "checkout unavailable" }, 502, headers);
  const session = await response.json();
  return json({ url: session.url }, 200, headers);
});
