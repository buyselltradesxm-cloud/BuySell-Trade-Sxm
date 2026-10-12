const BASE = Deno.env.get("SUPABASE_URL") || "";
const PACKAGE = "com.korekdigitalmarketing.buyselltradesxm";
const SERVICE_JSON = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "";
const PLAN_BY_PRODUCT: Record<string, string> = Object.fromEntries(
  ["starter", "business", "premium", "elite", "unlimited"].map(tier => [
    `pro_${tier}_monthly`, `pro-${tier}`,
  ]),
);

function b64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pemBytes(pem: string) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}
let cachedAccessToken = "", cachedUntil = 0;
async function googleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedUntil > Date.now() + 60_000) return cachedAccessToken;
  let account: { client_email?: string; private_key?: string; token_uri?: string };
  try { account = JSON.parse(SERVICE_JSON); } catch { throw new Error("google_not_configured"); }
  if (!account.client_email || !account.private_key) throw new Error("google_not_configured");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: account.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const privateKey = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(unsigned)));
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(signature)}` }),
  });
  if (!response.ok) throw new Error("google_auth_failed");
  const result = await response.json();
  cachedAccessToken = String(result.access_token || "");
  cachedUntil = Date.now() + Number(result.expires_in || 3600) * 1000;
  if (!cachedAccessToken) throw new Error("google_auth_failed");
  return cachedAccessToken;
}
function serviceKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "");
    if (typeof keys === "string") return keys;
    for (const value of Object.values(keys)) if (typeof value === "string" && value.length > 20) return value;
  } catch { /* fail closed */ }
  return "";
}
const DB_KEY = serviceKey();
async function db(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${BASE}/rest/v1/${path}`, { method, headers: {
    apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation",
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw new Error("purchase_storage_failed");
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
async function currentUser(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(`${BASE}/auth/v1/user`, { headers: { apikey: DB_KEY, Authorization: authorization } });
  return response.ok ? (await response.json()).id as string : null;
}
async function verifyGoogle(productId: string, purchaseToken: string) {
  const token = await googleAccessToken();
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("purchase_not_verified");
  const purchase = await response.json();
  const matching = (purchase.lineItems || []).find((item: any) => item.productId === productId);
  if (!matching || purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId == null) throw new Error("purchase_not_verified");
  const plan = PLAN_BY_PRODUCT[productId];
  if (!plan) throw new Error("unknown_product");
  const activeStates = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
  const expiry = matching.expiryTime ? new Date(matching.expiryTime) : null;
  const active = activeStates.includes(purchase.subscriptionState) && !!expiry && expiry.getTime() > Date.now();
  if (purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" && active) {
    const ack = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    if (!ack.ok) throw new Error("purchase_acknowledgement_failed");
  }
  return { active, plan, expiry: expiry?.toISOString() || null, cancelAtPeriodEnd: purchase.subscriptionState === "SUBSCRIPTION_STATE_CANCELED", accountId: purchase.externalAccountIdentifiers.obfuscatedExternalAccountId };
}

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  const allowed = ["https://buyselltradesxm.com", "https://www.buyselltradesxm.com", "http://localhost:5173", "http://127.0.0.1:5173"];
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "https://buyselltradesxm.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (origin && !allowed.includes(origin)) return reply({ error: "Forbidden." }, 403);
  if (!BASE || !DB_KEY || !SERVICE_JSON) return reply({ error: "Google Play verification is not configured yet." }, 503);
  try {
    const owner = await currentUser(req);
    if (!owner) return reply({ error: "Please sign in first." }, 401);
    const raw = await req.text();
    if (raw.length > 12000) return reply({ error: "Payload too large." }, 413);
    const body = JSON.parse(raw);
    if (body.action === "ready") {
      await googleAccessToken();
      return reply({ ok: true });
    }
    if (!(await db("rpc/consume_google_play_purchase_rate_limit", "POST", { p_user: owner }))) return reply({ error: "Please try again later." }, 429);
    if (body.action === "sync") {
      const [stored] = await db(`profiles?id=eq.${encodeURIComponent(owner)}&select=google_play_purchase_token,google_play_product_id,apple_transaction_id,stripe_subscription_id`);
      if (!stored?.google_play_purchase_token || !stored?.google_play_product_id) return reply({ ok: true, active: false });
      const current = await verifyGoogle(stored.google_play_product_id, stored.google_play_purchase_token);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
      const accountId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (current.accountId !== accountId) return reply({ error: "Purchase account could not be confirmed." }, 403);
      if (current.active) await db(`profiles?id=eq.${encodeURIComponent(owner)}`, "PATCH", {
        account_type: "business", account_plan: current.plan, subscription_status: "active",
        subscription_current_period_end: current.expiry, subscription_cancel_at_period_end: current.cancelAtPeriodEnd,
      });
      else if (!stored.apple_transaction_id && !stored.stripe_subscription_id) await db(`profiles?id=eq.${encodeURIComponent(owner)}`, "PATCH", {
        account_type: "personal", account_plan: "personal-free", subscription_status: "inactive",
        subscription_current_period_end: current.expiry, google_play_purchase_token: null, google_play_product_id: null,
      });
      return reply({ ok: true, active: current.active, plan: current.active ? current.plan : "personal-free", currentPeriodEnd: current.expiry });
    }
    if (body.action !== "verify" || typeof body.productId !== "string" || typeof body.purchaseToken !== "string" || body.purchaseToken.length > 4096) {
      return reply({ error: "Invalid purchase." }, 400);
    }
    const result = await verifyGoogle(body.productId, body.purchaseToken);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
    const expectedAccountId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (result.accountId !== expectedAccountId) return reply({ error: "This purchase belongs to a different marketplace account." }, 403);
    const matches = await db(`profiles?google_play_purchase_token=eq.${encodeURIComponent(body.purchaseToken)}&id=neq.${encodeURIComponent(owner)}&select=id`);
    if (matches.length) return reply({ error: "This Google Play purchase is linked to another account." }, 409);
    if (result.active) {
      await db(`profiles?id=eq.${encodeURIComponent(owner)}`, "PATCH", {
        account_type: "business", account_plan: result.plan, subscription_status: "active",
        subscription_current_period_end: result.expiry,
        subscription_cancel_at_period_end: result.cancelAtPeriodEnd, google_play_purchase_token: body.purchaseToken,
        google_play_product_id: body.productId,
      });
    } else {
      const own = await db(`profiles?id=eq.${encodeURIComponent(owner)}&google_play_purchase_token=eq.${encodeURIComponent(body.purchaseToken)}&select=id,apple_transaction_id,stripe_subscription_id`);
      if (own.length && !own[0].apple_transaction_id && !own[0].stripe_subscription_id) await db(`profiles?id=eq.${encodeURIComponent(owner)}`, "PATCH", {
        account_type: "personal", account_plan: "personal-free", subscription_status: "inactive",
        subscription_current_period_end: result.expiry, google_play_purchase_token: null, google_play_product_id: null,
      });
    }
    return reply({ ok: true, active: result.active, plan: result.active ? result.plan : "personal-free", currentPeriodEnd: result.expiry });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "purchase_verification_failed";
    const status = reason === "purchase_not_verified" || reason === "unknown_product" ? 400 : 503;
    return reply({ error: status === 400 ? "Google Play could not verify this purchase." : "Purchase verification is temporarily unavailable. Try Restore Purchases again." }, status);
  }
});
