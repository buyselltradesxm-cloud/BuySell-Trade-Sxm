// Four-digit email signup verification. Supabase Auth's built-in OTP requires
// at least six digits, so this endpoint owns the short-lived signup code while
// keeping passwords and service keys on the server.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");
const CODE_TTL_SECONDS = 900;
function allowedOrigin(origin: string) { return origin === "https://buyselltradesxm.com" || origin === "https://www.buyselltradesxm.com" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin); }
function headers(req: Request): Record<string,string> { const h: Record<string,string> = { "Access-Control-Allow-Headers":"content-type, apikey", "Access-Control-Allow-Methods":"POST, OPTIONS", "Cache-Control":"no-store", "Vary":"Origin" }; const origin = req.headers.get("origin") || ""; if (allowedOrigin(origin)) h["Access-Control-Allow-Origin"] = origin; return h; }
function json(body: unknown, status: number, h: Record<string,string>) { return new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type":"application/json" } }); }
async function digest(value: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2,"0")).join(""); }
function code() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 10000).padStart(4,"0"); }
async function auth(path: string, init: RequestInit = {}) { return fetch(`${SUPABASE_URL}/auth/v1${path}`, { ...init, headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type":"application/json", ...(init.headers || {}) } }); }
async function sendEmail(email: string, value: string) { if (!RESEND_KEY) return false; const response = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${RESEND_KEY}`, "Content-Type":"application/json", "Idempotency-Key":`signup_code_${await digest(email + value)}` }, body: JSON.stringify({ from:"Buy Sell Trade SXM <noreply@buyselltradesxm.com>", to:[email], subject:"Your Buy Sell Trade SXM verification code", text:`Your verification code is ${value}. It expires in 15 minutes. If you did not create this account, ignore this email.`, html:`<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Confirm your email address</h2><p>Enter this code in Buy Sell Trade SXM:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${value}</p><p>This code expires in 15 minutes. If you did not create this account, ignore this email.</p><p><a href="${SITE_URL}">${SITE_URL}</a></p></div>` }) }); return response.ok; }
function validEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }
async function consume(bucket: string, max_attempts: number, window_seconds: number) { const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_security_rate_limit`, { method:"POST", headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ bucket_key:bucket, max_attempts, window_seconds }) }); return response.ok && (await response.json()) === true; }
Deno.serve(async (req) => {
  const h = headers(req); if (req.method === "OPTIONS") return new Response(null, { headers: h });
  if (req.method !== "POST" || !allowedOrigin(req.headers.get("origin") || "")) return json({ error:"forbidden" }, 403, h);
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) return json({ error:"signup unavailable", code:"service_unavailable" }, 503, h);
  let body: any; try { body = await req.json(); } catch (_) { return json({ error:"invalid request" }, 400, h); }
  const action = String(body.action || "start"); const email = String(body.email || "").trim().toLowerCase(); if (!validEmail(email)) return json({ error:"invalid signup", code:"invalid_email" }, 400, h);
  if (!["start", "verify", "resend"].includes(action)) return json({ error:"invalid request", code:"invalid_request" }, 400, h);
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  // The shared limiter accepts only hashed bucket identifiers (minimum 32
  // characters). Hash both identifiers to satisfy that contract and avoid
  // persisting raw email addresses or IPs in the rate-limit table.
  const rate = action === "verify" ? { email: 10, ip: 30, seconds: 900 } : { email: 3, ip: 10, seconds: 3600 };
  if (!(await consume(`signup:${action}:email:${await digest(email)}`, rate.email, rate.seconds)) || !(await consume(`signup:${action}:ip:${await digest(ip)}`, rate.ip, rate.seconds))) return json({ error:"signup unavailable", code:action === "verify" ? "verification_rate_limited" : "signup_rate_limited" }, 429, h);
  if (action === "start") {
    const password = String(body.password || ""); if (password.length < 8 || password.length > 256) return json({ error:"invalid signup", code:"password_rejected" }, 400, h);
    const value = code(); const userMetadata = { name:String(body.name || "").slice(0,120), account_type:String(body.account_type || "personal").slice(0,20), account_plan:"personal-free", business_name:String(body.business_name || "").slice(0,160), phone:String(body.phone || "").slice(0,40), signup_code_hash:await digest(email + ":" + value), signup_code_expires_at:new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(), signup_code_attempts:0 };
    let created: Response; try { created = await auth("/admin/users", { method:"POST", body:JSON.stringify({ email, password, email_confirm:false, user_metadata:userMetadata }) }); } catch (_) { return json({ error:"signup unavailable", code:"service_unavailable" }, 503, h); }
    if (!created.ok) { let reason = ""; try { const detail = await created.json(); reason = String(detail.code || detail.error_code || "").toLowerCase(); } catch (_) {} return json({ error:"signup could not be completed", code:reason.includes("password") ? "password_rejected" : "signup_failed" }, 400, h); }
    const user = await created.json(); if (!user?.id) return json({ error:"signup unavailable", code:"service_unavailable" }, 503, h);
    let emailSent = false; try { emailSent = await sendEmail(email, value); } catch (_) {}
    if (!emailSent) { try { await auth(`/admin/users/${encodeURIComponent(user.id)}`, { method:"DELETE" }); } catch (_) {} return json({ error:"signup unavailable", code:"email_delivery_failed" }, 503, h); }
    return json({ accepted:true, user_id:user.id }, 200, h);
  }
  const userId = String(body.user_id || ""); if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error:"invalid code", code:"invalid_or_expired_code" }, 400, h); let found: Response; try { found = await auth(`/admin/users/${encodeURIComponent(userId)}`); } catch (_) { return json({ error:"signup unavailable", code:"service_unavailable" }, 503, h); } if (!found.ok) return json({ error:"invalid code", code:"invalid_or_expired_code" }, 400, h); const user = await found.json(); if (String(user.email || "").toLowerCase() !== email) return json({ error:"invalid code", code:"invalid_or_expired_code" }, 400, h);
  if (action === "resend") { const value = code(); const meta = { ...(user.user_metadata || {}), signup_code_hash:await digest(email + ":" + value), signup_code_expires_at:new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(), signup_code_attempts:0 }; let updated: Response; try { updated = await auth(`/admin/users/${encodeURIComponent(userId)}`, { method:"PUT", body:JSON.stringify({ user_metadata:meta, email_confirm:false }) }); } catch (_) { return json({ error:"signup unavailable", code:"service_unavailable" }, 503, h); } if (!updated.ok || !(await sendEmail(email,value))) return json({ error:"signup unavailable", code:"email_delivery_failed" }, 503, h); return json({ accepted:true }, 200, h); }
  const value = String(body.code || ""); const meta = user.user_metadata || {}; const attempts = Number(meta.signup_code_attempts || 0); const expires = Date.parse(String(meta.signup_code_expires_at || ""));
  if (attempts >= 5) return json({ error:"too many attempts", code:"verification_rate_limited" }, 429, h);
  if (!/^\d{4}$/.test(value) || !expires || expires < Date.now() || (await digest(email + ":" + value)) !== meta.signup_code_hash) { try { await auth(`/admin/users/${encodeURIComponent(userId)}`, { method:"PUT", body:JSON.stringify({ user_metadata:{ ...meta, signup_code_attempts:attempts + 1 } }) }); } catch (_) {} return json({ error:"invalid or expired code", code:"invalid_or_expired_code" }, 400, h); }
  const clean = { ...meta }; delete clean.signup_code_hash; delete clean.signup_code_expires_at; delete clean.signup_code_attempts; let confirmed: Response; try { confirmed = await auth(`/admin/users/${encodeURIComponent(userId)}`, { method:"PUT", body:JSON.stringify({ email_confirm:true, user_metadata:clean }) }); } catch (_) { return json({ error:"confirmation unavailable", code:"confirmation_unavailable" }, 503, h); } if (!confirmed.ok) return json({ error:"confirmation unavailable", code:"confirmation_unavailable" }, 503, h); return json({ confirmed:true }, 200, h);
});
