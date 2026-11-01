// AdMob server-side verification (SSV) callback for rewarded video ads.
// Google calls this URL after a user finishes a rewarded video in the store
// app. The ad request carries the Supabase user id (user_id) and the listing
// id (custom_data); Google signs the whole query string, so neither can be
// forged without actually watching an ad. A verified callback records five
// extra messages for that listing (see supabase/rewarded-messages.sql).
// Set this function's URL as the SSV callback on the AdMob rewarded units.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Required comma-separated list of accepted ad unit ids (the number after the
// slash). Google signs callbacks for every AdMob publisher with the same keys,
// so a valid signature alone would accept another publisher's ad pointed here.
const AD_UNITS = (Deno.env.get("ADMOB_REWARDED_AD_UNITS") || "").split(",").map(s => s.trim()).filter(Boolean);
const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const MAX_AGE_MS = 60 * 60 * 1000;
let keyCache: { at: number; keys: Map<string, CryptoKey> } | null = null;

function text(body: string, status: number) { return new Response(body, { status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } }); }
function b64(value: string) { const s = value.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(s + "=".repeat((4 - s.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); }
async function verifierKeys(force = false) {
  if (!force && keyCache && Date.now() - keyCache.at < 24 * 60 * 60 * 1000) return keyCache.keys;
  const response = await fetch(KEYS_URL); if (!response.ok) throw new Error("keys unavailable");
  const keys = new Map<string, CryptoKey>();
  for (const k of (await response.json()).keys || []) { try { keys.set(String(k.keyId), await crypto.subtle.importKey("spki", b64(String(k.base64)), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"])); } catch (_) {} }
  keyCache = { at: Date.now(), keys }; return keys;
}
// Google signs with ECDSA P-256 / SHA-256 in DER form; WebCrypto wants r||s.
function derToRaw(der: Uint8Array) {
  if (der[0] !== 0x30) throw new Error("bad signature");
  let i = der[1] & 0x80 ? 2 + (der[1] & 0x7f) : 2;
  const out = new Uint8Array(64);
  for (const offset of [0, 32]) {
    if (der[i++] !== 0x02) throw new Error("bad signature");
    let len = der[i++]; let start = i; i += len;
    while (len > 32 && der[start] === 0) { start++; len--; }
    if (len > 32) throw new Error("bad signature");
    out.set(der.subarray(start, start + len), offset + 32 - len);
  }
  return out;
}
async function signatureOk(query: string, signature: string, keyId: string) {
  let key = (await verifierKeys()).get(keyId);
  if (!key) key = (await verifierKeys(true)).get(keyId); // Google rotated its keys
  if (!key) return false;
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(b64(signature)), new TextEncoder().encode(query));
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return text("method not allowed", 405);
  if (!SUPABASE_URL || !SERVICE_KEY || !AD_UNITS.length) return text("unavailable", 503);
  const url = new URL(req.url); const raw = url.search.replace(/^\?/, "");
  // AdMob pings the URL without parameters when it is saved in the console.
  if (!raw) return text("ok", 200);
  // The signed content is the query string exactly as sent, up to &signature=.
  const cut = raw.indexOf("&signature="); if (cut < 0) return text("unsigned", 400);
  const p = url.searchParams; const signature = p.get("signature") || ""; const keyId = p.get("key_id") || "";
  let valid = false; try { valid = await signatureOk(raw.slice(0, cut), signature, keyId); } catch (_) { valid = false; }
  if (!valid) return text("invalid signature", 403);

  // From here on Google vouches for the request: answer 200 even when nothing
  // is granted, so AdMob does not keep retrying a callback we chose to skip.
  const userId = p.get("user_id") || ""; const listingId = p.get("custom_data") || ""; const transactionId = p.get("transaction_id") || "";
  const adUnit = p.get("ad_unit") || ""; const timestamp = Number(p.get("timestamp") || 0);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^\d{1,18}$/.test(listingId) || !transactionId) return text("ignored", 200);
  if (!AD_UNITS.includes(adUnit)) return text("ignored", 200);
  if (!timestamp || Math.abs(Date.now() - timestamp) > MAX_AGE_MS) return text("stale", 200);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/grant_message_ad_reward`, { method: "POST", headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_transaction_id: transactionId, p_user_id: userId, p_listing_id: Number(listingId), p_ad_unit: adUnit }) });
  // A database failure is worth a retry from AdMob; anything else is final.
  if (!response.ok) return text("retry", 500);
  return text(String(await response.json()), 200);
});
