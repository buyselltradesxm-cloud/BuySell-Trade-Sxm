// Authenticated PayPal subscription launcher for website users.
// Plan IDs and API credentials are server-side Edge Function secrets.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const API = (Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com").replace(/\/$/, "");
const PLAN_BY_NAME: Record<string, string> = {
  "pro-starter": Deno.env.get("PAYPAL_PLAN_PRO_STARTER") || "",
  "pro-business": Deno.env.get("PAYPAL_PLAN_PRO_BUSINESS") || "",
  "pro-premium": Deno.env.get("PAYPAL_PLAN_PRO_PREMIUM") || "",
  "pro-elite": Deno.env.get("PAYPAL_PLAN_PRO_ELITE") || "",
  "pro-unlimited": Deno.env.get("PAYPAL_PLAN_PRO_UNLIMITED") || "",
};
function serviceKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  try {
    const value = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "");
    if (typeof value === "string") return value;
    if (value && typeof value === "object") for (const item of Object.values(value)) if (typeof item === "string" && item.length > 20) return item;
  } catch (_) { /* secret unavailable */ }
  return "";
}
const SERVICE_KEY = serviceKey();
const allowedOrigin = (origin: string) => origin === "https://buyselltradesxm.com" || origin === "https://www.buyselltradesxm.com" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
function cors(req: Request): Record<string,string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string,string> = { "Access-Control-Allow-Headers":"authorization, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Cache-Control":"no-store", "Vary":"Origin" };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(body: unknown, status: number, headers: Record<string,string>) { return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type":"application/json" } }); }
async function accessToken() {
  const response = await fetch(`${API}/v1/oauth2/token`, { method:"POST", headers:{ Authorization:`Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, "Content-Type":"application/x-www-form-urlencoded" }, body:"grant_type=client_credentials" });
  if (!response.ok) throw new Error("paypal_auth_failed");
  return (await response.json()).access_token as string;
}
async function currentUser(bearer: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${bearer}` } });
  return response.ok ? await response.json() : null;
}
async function consume(userId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_security_rate_limit`, { method:"POST", headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ bucket_key:`paypal-checkout:${userId}`, max_attempts:5, window_seconds:600 }) });
  return response.ok && (await response.json()) === true;
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null,{headers});
  if (req.method !== "POST") return json({error:"method not allowed"},405,headers);
  if (!allowedOrigin(req.headers.get("origin") || "")) return json({error:"forbidden"},403,headers);
  if (!SUPABASE_URL || !SERVICE_KEY || !CLIENT_ID || !CLIENT_SECRET) return json({error:"PayPal unavailable"},503,headers);
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await currentUser(bearer);
  if (!user?.id) return json({error:"not authenticated"},401,headers);
  let request: Record<string,unknown> = {};
  try { request = await req.json(); } catch (_) { return json({error:"invalid request"},400,headers); }
  const plan = String(request.plan || "");
  const planId = PLAN_BY_NAME[plan];
  if (!planId) return json({error:"invalid plan"},400,headers);
  if (!(await consume(user.id))) return json({error:"try again later"},429,headers);
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=subscription_status,subscription_current_period_end,stripe_subscription_id,paypal_subscription_id,paypal_checkout_started_at,subscription_provider,account_plan`, { headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}` } });
  if (!profileRes.ok) return json({error:"profile unavailable"},503,headers);
  const [profile] = await profileRes.json();
  const periodValid = !profile?.subscription_current_period_end || new Date(profile.subscription_current_period_end).getTime() > Date.now();
  if (profile?.subscription_status === "active" && periodValid) return json({error:"subscription already active"},409,headers);
  const token = await accessToken();
  if (profile?.paypal_subscription_id && profile?.subscription_provider === "paypal" && profile?.subscription_status === "pending") {
    const previous = await fetch(`${API}/v1/billing/subscriptions/${encodeURIComponent(profile.paypal_subscription_id)}`, { headers:{Authorization:`Bearer ${token}`} });
    if (previous.ok) {
      const existing = await previous.json();
      if (existing.status === "ACTIVE") return json({error:"subscription confirmation pending"},409,headers);
      const started = new Date(profile.paypal_checkout_started_at || 0).getTime();
      if (existing.status === "APPROVAL_PENDING" && Date.now() - started < 30 * 60 * 1000) {
        const approval = Array.isArray(existing.links) ? existing.links.find((link: {rel?:string}) => link.rel === "approve")?.href : null;
        if (approval && /^https:\/\/www\.paypal\.com\//.test(approval)) return json({url:approval},200,headers);
      }
      if (existing.status === "APPROVAL_PENDING") {
        await fetch(`${API}/v1/billing/subscriptions/${encodeURIComponent(profile.paypal_subscription_id)}/cancel`, { method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify({reason:"Checkout expired"}) });
      }
    }
  }
  const response = await fetch(`${API}/v1/billing/subscriptions`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json", "PayPal-Request-Id":crypto.randomUUID() }, body:JSON.stringify({
    plan_id:planId, custom_id:user.id,
    application_context:{ brand_name:"Buy Sell Trade SXM", locale:"fr-FR", user_action:"SUBSCRIBE_NOW", return_url:`${SITE_URL}/?paypal=return`, cancel_url:`${SITE_URL}/?paypal=cancelled` }
  }) });
  if (!response.ok) return json({error:"PayPal could not start checkout"},502,headers);
  const subscription = await response.json();
  const approval = Array.isArray(subscription.links) ? subscription.links.find((link: {rel?:string}) => link.rel === "approve")?.href : null;
  if (!approval || !/^https:\/\/www\.paypal\.com\//.test(approval)) return json({error:"PayPal approval link unavailable"},502,headers);
  const saved = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, { method:"PATCH", headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify({subscription_status:"pending",subscription_provider:"paypal",paypal_subscription_id:subscription.id,paypal_checkout_started_at:new Date().toISOString(),account_plan:plan}) });
  if (!saved.ok) {
    await fetch(`${API}/v1/billing/subscriptions/${encodeURIComponent(subscription.id)}/cancel`, {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({reason:"Application could not save subscription"})});
    return json({error:"PayPal checkout unavailable"},503,headers);
  }
  return json({url:approval},200,headers);
});
