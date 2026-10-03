// Public password-reset request endpoint.
//
// It deliberately returns 202 for valid, unknown, malformed, and rate-limited
// addresses, so callers cannot enumerate accounts. It stores only SHA-256
// hashes of identifiers in the rate-limit table.
//
// Deploy after security-hardening-v2.sql:
//   supabase functions deploy request-password-reset

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");
// The reset request goes to Auth with the public key, so Auth applies its
// CAPTCHA check to the visitor's Turnstile token (a service-role call skips it).
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  const bundle = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  try {
    const value = JSON.parse(bundle);
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      for (const item of Object.values(value)) if (typeof item === "string" && item.length > 20) return item;
    }
  } catch (_) { /* deliberately empty */ }
  return "";
}
const SERVICE_KEY = serviceKey();

function isAllowedOrigin(origin: string): boolean {
  return origin === "https://buyselltradesxm.com" || origin === "https://www.buyselltradesxm.com" ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function accepted(headers: Record<string, string>) {
  return new Response(JSON.stringify({ accepted: true }), {
    status: 202,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function consume(bucket: string, max: number, seconds: number): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_security_rate_limit`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_key: bucket, max_attempts: max, window_seconds: seconds }),
  });
  return response.ok && (await response.json()) === true;
}
async function securityEvent(type: string, subjectHash: string, ipHash: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify([{ event_type: type, subject_hash: subjectHash, ip_hash: ipHash }]),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response(null, { status: 405, headers });
  // Generic result also for unavailable configuration; do not leak topology.
  if (!SUPABASE_URL || !SERVICE_KEY) return accepted(headers);

  const declaredSize = Number(req.headers.get("content-length") || 0);
  if (declaredSize > 2048) return accepted(headers);
  const raw = await req.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > 2048) return accepted(headers);
  let email = "";
  let captchaToken = "";
  try {
    const body = JSON.parse(raw);
    email = String(body.email || "").trim().toLowerCase();
    captchaToken = String(body.captcha_token || "").slice(0, 4096);
  } catch (_) { /* generic response */ }

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const subjectHash = await sha256(email || "invalid");
  const ipHash = await sha256(ip);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  const allowed = validEmail && await consume(`reset:email:${subjectHash}`, 3, 3600) && await consume(`reset:ip:${ipHash}`, 10, 3600);
  if (!allowed) {
    await securityEvent("password_reset_rate_limited", subjectHash, ipHash);
    return accepted(headers);
  }

  const recoverKey = ANON_KEY || SERVICE_KEY;
  const redirectTo = `${SITE_URL}/?reset=1`;
  const recover = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: recoverKey, Authorization: `Bearer ${recoverKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, gotrue_meta_security: { captcha_token: captchaToken } }),
  }).catch(() => null);
  // The caller still gets the generic answer; the outcome is only recorded here.
  if (!recover || !recover.ok) {
    const type = recover && recover.status === 400 ? "password_reset_captcha_rejected" : "password_reset_auth_error";
    await securityEvent(type, subjectHash, ipHash);
    return accepted(headers);
  }
  await securityEvent("password_reset_requested", subjectHash, ipHash);
  return accepted(headers);
});
