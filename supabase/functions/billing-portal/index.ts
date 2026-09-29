// Authenticated Stripe Customer Portal launcher: lets a Pro subscriber cancel
// or update billing online, which California's ARL (Bus. & Prof. 17602(c))
// and the FTC require when the subscription was bought online. The Stripe
// customer id is read server-side from the caller's own profile row, never
// taken from the browser. Deploy with STRIPE_SECRET_KEY, and enable
// "cancel subscriptions" in Stripe Dashboard > Settings > Billing > Customer portal.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
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
async function stripeCustomerId(userId: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!response.ok) return "";
  const rows = await response.json();
  return (Array.isArray(rows) && rows[0]?.stripe_customer_id) || "";
}
async function consume(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_security_rate_limit`, {
    method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_key: `billing-portal:${userId}`, max_attempts: 10, window_seconds: 600 }),
  });
  return response.ok && (await response.json()) === true;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, headers);
  if (!allowedOrigin(req.headers.get("origin") || "")) return json({ error: "forbidden" }, 403, headers);
  if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_KEY) return json({ error: "portal unavailable" }, 503, headers);
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await currentUser(bearer);
  if (!user?.id) return json({ error: "not authenticated" }, 401, headers);
  if (!(await consume(user.id))) return json({ error: "try again later" }, 429, headers);
  const customer = await stripeCustomerId(user.id);
  if (!customer) return json({ error: "no subscription" }, 404, headers);

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer, return_url: `${SITE_URL}/?billing=return` }),
  });
  if (!response.ok) return json({ error: "portal unavailable" }, 502, headers);
  const session = await response.json();
  return json({ url: session.url }, 200, headers);
});
