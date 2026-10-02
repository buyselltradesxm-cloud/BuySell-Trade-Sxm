// Buy Sell Trade SXM — delete-my-account Edge Function
//
// POST {}   (no body needed)
// Header: Authorization: Bearer <the calling user's own Supabase access token>
//
// Self-service account deletion (GDPR "right to erasure"). Deletes the
// CALLER's own auth.users row (and, via FK cascades, their profile).
// Their listings keep existing (seller_id -> null, so they show with the
// "Example" badge instead of vanishing), their messages are deleted
// (messages.sender_id/recipient_id -> cascade) -- same cascade behavior
// as admin-delete-user, just always targeting the caller, never anyone
// else. This intentionally does NOT reuse admin-delete-user: that
// function explicitly refuses to let an admin delete themselves through
// it (to avoid an accidental self-lockout from the admin panel), so
// self-service deletion needed its own function rather than loosening
// that guard.
//
// Requires the service-role key (to call the Admin API), which is why it
// must run server-side, never in the browser.
//
// Deploy:
//   supabase functions deploy delete-my-account
// No extra secrets needed — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// already provided to every Edge Function automatically.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

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

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://buyselltradesxm.com" || origin === "https://www.buyselltradesxm.com") return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function callerId(bearer: string): Promise<string | null> {
  if (!bearer) return null;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearer}`, apikey: SERVICE_KEY },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  return user?.id || null;
}

// Deleting the account removes the profile row that links the user to
// their Stripe subscription -- after that nobody could cancel it from the
// app and Stripe would keep charging. So an active subscription is
// cancelled first, and the deletion is refused if that cancel fails.
// (Apple subscriptions can only be cancelled by the user in iOS Settings.)
async function cancelStripeSubscription(userId: string): Promise<"none" | "cancelled" | "failed"> {
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=stripe_subscription_id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!profRes.ok) return "failed";
  const rows = await profRes.json();
  const subscriptionId = String(rows?.[0]?.stripe_subscription_id || "");
  if (!subscriptionId) return "none";
  if (!STRIPE_KEY || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) return "failed";
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  }).catch(() => null);
  // 404 = Stripe no longer has it (already cancelled and purged).
  return res && (res.ok || res.status === 404) ? "cancelled" : "failed";
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, cors);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "function not configured" }, 500, cors);
  if (Number(req.headers.get("content-length") || 0) > 2048) return json({ error: "payload too large" }, 413, cors);

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const userId = await callerId(bearer);
  if (!userId) return json({ error: "not authenticated" }, 401, cors);

  if ((await cancelStripeSubscription(userId)) === "failed") {
    return json({ error: "subscription_cancel_failed" }, 409, cors);
  }

  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!delRes.ok) {
    return json({ error: "delete failed" }, 502, cors);
  }

  // Best-effort audit trail -- admin_id left null since this wasn't an
  // admin action; target_id kept even though the row it refers to is
  // now gone, same as admin-delete-user's own log entry.
  await fetch(`${SUPABASE_URL}/rest/v1/admin_events`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{
      admin_id: null,
      action: "self_delete_account",
      target_type: "user",
      target_id: userId,
      metadata: {},
    }]),
  }).catch(() => {});

  return json({ ok: true }, 200, cors);
});
