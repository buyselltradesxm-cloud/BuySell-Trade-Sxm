// Buy Sell Trade SXM — send-push Edge Function
//
// POST { user_id, title, body, url?, tag? }
// Header: x-push-secret: <PUSH_FUNCTION_SECRET>   (or Authorization: Bearer <service key>)
//
// Looks up every push_subscriptions row for user_id, encrypts the payload per
// RFC 8291 (aes128gcm) and RFC 8188, signs a VAPID JWT (RFC 8292, ES256) and
// POSTs to each push service. 404/410 responses prune the dead subscription.
//
// Secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY   raw P-256 point, base64url (the client applicationServerKey)
//   VAPID_PRIVATE_KEY  either the private "d" (base64url) or the full private JWK JSON
//   VAPID_SUBJECT      mailto: or https: contact, e.g. mailto:admin@buyselltradesxm.com
//   PUSH_FUNCTION_SECRET  shared secret the DB trigger sends in x-push-secret
//
// iPhone app: a subscription whose endpoint is "apns:<device token>" is sent
// through Apple (APNs, token-based auth) instead of Web Push. Optional; without
// these secrets such rows are skipped and Web Push is unaffected.
//   APNS_KEY_ID       10-character id of the APNs auth key
//   APNS_TEAM_ID      Apple developer team id
//   APNS_PRIVATE_KEY  contents of the AuthKey_XXXXXXXXXX.p8 file
//   APNS_TOPIC        app bundle id (default below)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEYS)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@buyselltradesxm.com";
const PUSH_SECRET = Deno.env.get("PUSH_FUNCTION_SECRET") || "";
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") || "";
const APNS_TOPIC = Deno.env.get("APNS_TOPIC") || "com.korekdigitalmarketing.buyselltradesxm";
const APNS_HOST = Deno.env.get("APNS_HOST") || "https://api.push.apple.com";
const APNS_PREFIX = "apns:";
const APNS_READY = !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_PRIVATE_KEY);

function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  const bundle = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  try {
    const p = JSON.parse(bundle);
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      for (const v of Object.values(p)) if (typeof v === "string" && v.length > 20) return v as string;
    }
  } catch (_e) { /* ignore */ }
  return "";
}
const SERVICE_KEY = serviceKey();

// Byte arrays backed by a plain ArrayBuffer, which is what WebCrypto accepts.
type Bytes = Uint8Array<ArrayBuffer>;

// ---------- base64url helpers ----------
function b64urlToBytes(s: string): Bytes {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: ArrayBuffer | Uint8Array): string {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Bytes {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const enc = new TextEncoder();

// ---------- VAPID JWT (ES256) ----------
async function importVapidSigningKey(): Promise<CryptoKey> {
  let jwk: JsonWebKey;
  const trimmed = VAPID_PRIVATE.trim();
  if (trimmed.startsWith("{")) {
    jwk = JSON.parse(trimmed);
  } else {
    // private "d" only — recover x/y by splitting the raw public point (0x04||X||Y)
    const pub = b64urlToBytes(VAPID_PUBLIC);
    if (pub.length !== 65 || pub[0] !== 0x04) throw new Error("VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 point");
    jwk = {
      kty: "EC", crv: "P-256",
      d: trimmed,
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      ext: true,
    };
  }
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidAuthHeader(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(enc.encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  })));
  const signingInput = `${header}.${payload}`;
  const key = await importVapidSigningKey();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput));
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;
  return `vapid t=${jwt}, k=${VAPID_PUBLIC}`;
}

// ---------- RFC 8291 / RFC 8188 payload encryption (aes128gcm) ----------
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

async function encryptPayload(
  plaintext: Bytes,
  uaP256dh: Bytes,   // client public key, 65 raw bytes
  uaAuth: Bytes,     // client auth secret, 16 bytes
): Promise<Bytes> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const asPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asPair.publicKey)); // 65 bytes

  const uaPubKey = await crypto.subtle.importKey("raw", uaP256dh, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, asPair.privateKey, 256));

  // RFC 8291 §3.4: derive the input keying material
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaP256dh, asPublicRaw);
  const ikm = await hkdf(uaAuth, ecdh, keyInfo, 32);

  // RFC 8188 §2.1: content encryption key + nonce
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // single record: plaintext followed by the 0x02 delimiter
  const padded = concat(plaintext, new Uint8Array([0x02]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded));

  // RFC 8188 header: salt(16) | rs(4, uint32 BE) | idlen(1) | keyid(as_public, 65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concat(header, ct);
}

// ---------- Supabase REST ----------
async function getSubscriptions(userId: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=endpoint,p256dh,auth`,
    { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!r.ok) throw new Error(`subscriptions lookup ${r.status}`);
  return await r.json() as Array<{ endpoint: string; p256dh: string; auth: string }>;
}
async function deleteSubscription(endpoint: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
}

// ---------- Apple Push Notification service ----------
// Apple asks for the provider token to be reused for 20 to 60 minutes.
let apnsJwt: { token: string; at: number } | null = null;
async function apnsProviderToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (apnsJwt && now - apnsJwt.at < 40 * 60) return apnsJwt.token;
  const pem = APNS_PRIVATE_KEY.replace(/\\n/g, "\n");
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = bytesToB64url(enc.encode(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  apnsJwt = { token: `${head}.${claims}.${bytesToB64url(sig)}`, at: now };
  return apnsJwt.token;
}

type ApnsMessage = { title: string; body: string; url: string; tag?: string };
async function sendApns(deviceToken: string, message: ApnsMessage): Promise<"sent" | "gone" | "failed"> {
  if (!/^[0-9a-f]{32,200}$/i.test(deviceToken)) return "gone";
  const res = await fetch(`${APNS_HOST}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${await apnsProviderToken()}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: { alert: { title: message.title, body: message.body }, sound: "default", "thread-id": message.tag },
      url: message.url,
    }),
  });
  if (res.ok) return "sent";
  const reason = await res.text().catch(() => "");
  // The app was removed, or the token belongs to another app or environment.
  if (res.status === 410 || (res.status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(reason))) return "gone";
  console.warn("[send-push] apns", res.status, reason);
  return "failed";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Plain `===` on secrets leaks a timing side-channel (comparison exits at
// the first mismatched byte). Hash both sides to a fixed-length digest
// first — that removes any length signal too — then compare with a
// constant-time XOR accumulator instead of short-circuiting `!==`.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const ua = new Uint8Array(da), ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 8192) return json({ error: "payload too large" }, 413);

  const auth = req.headers.get("x-push-secret") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!PUSH_SECRET) return json({ error: "unauthorized" }, 401);
  const [matchesPush, matchesService] = await Promise.all([
    timingSafeEqual(auth, PUSH_SECRET),
    timingSafeEqual(auth, SERVICE_KEY),
  ]);
  if (!matchesPush && !matchesService) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "server not configured" }, 500);
  }

  const raw = await req.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > 8192) return json({ error: "payload too large" }, 413);
  let payload: { user_id?: string; title?: string; body?: string; url?: string; tag?: string };
  try { payload = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }
  if (!payload.user_id) return json({ error: "user_id required" }, 400);

  const content: ApnsMessage = {
    title: payload.title || "Buy Sell Trade Sxm",
    body: payload.body || "",
    url: payload.url || "/marketplace.html",
    tag: payload.tag || undefined,
  };
  const message = enc.encode(JSON.stringify(content));

  let subs: Array<{ endpoint: string; p256dh: string; auth: string }>;
  try { subs = await getSubscriptions(payload.user_id); }
  catch (e) { return json({ error: String(e) }, 502); }

  let sent = 0, pruned = 0, failed = 0, skipped = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      if (s.endpoint.startsWith(APNS_PREFIX)) {
        if (!APNS_READY) { skipped++; return; }
        const outcome = await sendApns(s.endpoint.slice(APNS_PREFIX.length), content);
        if (outcome === "sent") sent++;
        else if (outcome === "gone") { await deleteSubscription(s.endpoint); pruned++; }
        else failed++;
        return;
      }
      const cipher = await encryptPayload(message, b64urlToBytes(s.p256dh), b64urlToBytes(s.auth));
      const res = await fetch(s.endpoint, {
        method: "POST",
        headers: {
          "content-encoding": "aes128gcm",
          "content-type": "application/octet-stream",
          "ttl": "86400",
          "urgency": "normal",
          authorization: await vapidAuthHeader(s.endpoint),
        },
        body: cipher,
      });
      if (res.status === 404 || res.status === 410) { await deleteSubscription(s.endpoint); pruned++; }
      else if (res.ok || res.status === 201) sent++;
      else { failed++; console.warn("[send-push]", res.status, await res.text().catch(() => "")); }
    } catch (e) {
      failed++;
      console.warn("[send-push] error:", String(e));
    }
  }));

  return json({ ok: true, subscriptions: subs.length, sent, pruned, failed, skipped });
});
