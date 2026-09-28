// Authenticated Stripe Checkout creator. The browser supplies only a plan
// name; the server maps it to a Stripe Price ID held in Edge Function secrets.
// Deploy with STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_* secrets.

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
  let plan = ""; try { plan = String(JSON.parse(raw).plan || ""); } catch (_) { /* invalid plan below */ }
  const price = PRICE_BY_PLAN[plan];
  if (!price) return json({ error: "invalid plan" }, 400, headers);
  if (!(await consume(user.id))) return json({ error: "try again later" }, 429, headers);

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    "metadata[supabase_user_id]": user.id,
    "metadata[plan]": plan,
    "subscription_data[metadata][supabase_user_id]": user.id,
    "subscription_data[metadata][plan]": plan,
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
