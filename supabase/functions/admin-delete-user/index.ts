// Buy Sell Trade SXM — admin-delete-user Edge Function
//
// POST { user_id: "<uuid>" }
// Header: Authorization: Bearer <the calling admin's Supabase access token>
//
// Permanently deletes an auth.users row (and, via FK cascades, that user's
// profile). Their listings keep existing (seller_id -> null, so they show
// with the "Example" badge instead of vanishing), their messages are
// deleted (messages.sender_id/recipient_id -> cascade), same as any other
// Supabase Auth user deletion.
//
// This can only be done with the service-role key, which is why it must
// run server-side (an Edge Function), never in the browser.
//
// Deploy (Supabase CLI, once linked to this project):
//   supabase functions deploy admin-delete-user
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

// Admin-only + service-role-backed, so a wildcard origin was never a way in
// on its own — but there's no reason to let every website on the internet
// read this response either. Only the real app origins (and local dev) get
// the header back; everything else gets no Access-Control-Allow-Origin at
// all, which the browser treats as "cross-origin read denied".
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

async function callerIsAdmin(bearer: string): Promise<{ ok: boolean; id?: string }> {
  if (!bearer) return { ok: false };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearer}`, apikey: SERVICE_KEY },
  });
  if (!userRes.ok) return { ok: false };
  const user = await userRes.json();
  if (!user?.id) return { ok: false };

  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!profRes.ok) return { ok: false };
  const rows = await profRes.json();
  return { ok: rows?.[0]?.role === "admin", id: user.id };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, cors);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "function not configured" }, 500, cors);
  if (Number(req.headers.get("content-length") || 0) > 2048) return json({ error: "payload too large" }, 413, cors);

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { ok: isAdmin, id: adminId } = await callerIsAdmin(bearer);
  if (!isAdmin) return json({ error: "admin only" }, 403, cors);

  const raw = await req.text().catch(() => "");
  if (new TextEncoder().encode(raw).byteLength > 2048) return json({ error: "payload too large" }, 413, cors);
  let body: { user_id?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid body" }, 400, cors); }
  const targetId = (body.user_id || "").trim();
  if (!targetId) return json({ error: "user_id required" }, 400, cors);
  // targetId is interpolated into the Admin API path below — only a real
  // UUID may reach it, never "../" or a query string.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
    return json({ error: "invalid user_id" }, 400, cors);
  }
  if (targetId === adminId) return json({ error: "cannot delete your own account this way" }, 400, cors);

  // Same rule as delete-my-account: once the profile row is gone nothing
  // links the user to their Stripe subscription, so cancel it first and
  // refuse the deletion if that fails (cancel it in the Stripe dashboard).
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetId}&select=stripe_subscription_id`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!profRes.ok) return json({ error: "profile lookup failed" }, 502, cors);
  const subscriptionId = String((await profRes.json())?.[0]?.stripe_subscription_id || "");
  if (subscriptionId) {
    const cancelRes = STRIPE_KEY && /^sub_[A-Za-z0-9]+$/.test(subscriptionId)
      ? await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${STRIPE_KEY}` },
        }).catch(() => null)
      : null;
    // 404 = Stripe no longer has it (already cancelled and purged).
    if (!cancelRes || !(cancelRes.ok || cancelRes.status === 404)) {
      return json({ error: "subscription_cancel_failed" }, 409, cors);
    }
  }

  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!delRes.ok) {
    return json({ error: "delete failed" }, 502, cors);
  }

  await fetch(`${SUPABASE_URL}/rest/v1/admin_events`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([{
      admin_id: adminId,
      action: "admin_delete_user",
      target_type: "user",
      target_id: targetId,
      metadata: {},
    }]),
  }).catch(() => {});

  return json({ ok: true }, 200, cors);
});
