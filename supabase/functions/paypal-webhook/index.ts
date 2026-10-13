// PayPal subscription listener. Verifies the signed transmission with PayPal
// before reading or changing any account entitlement.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
const API = (Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com").replace(/\/$/, "");
const PLAN_BY_ID: Record<string,string> = Object.fromEntries([
  [Deno.env.get("PAYPAL_PLAN_PRO_STARTER") || "", "pro-starter"],
  [Deno.env.get("PAYPAL_PLAN_PRO_BUSINESS") || "", "pro-business"],
  [Deno.env.get("PAYPAL_PLAN_PRO_PREMIUM") || "", "pro-premium"],
  [Deno.env.get("PAYPAL_PLAN_PRO_ELITE") || "", "pro-elite"],
  [Deno.env.get("PAYPAL_PLAN_PRO_UNLIMITED") || "", "pro-unlimited"],
].filter(([id]) => id));
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
async function accessToken() {
  const response = await fetch(`${API}/v1/oauth2/token`, { method:"POST", headers:{ Authorization:`Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, "Content-Type":"application/x-www-form-urlencoded" }, body:"grant_type=client_credentials" });
  if (!response.ok) throw new Error("paypal_auth_failed");
  return (await response.json()).access_token as string;
}
async function verifyEvent(token: string, event: unknown, req: Request) {
  const headers = req.headers;
  const response = await fetch(`${API}/v1/notifications/verify-webhook-signature`, {
    method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body:JSON.stringify({ auth_algo:headers.get("paypal-auth-algo"), cert_url:headers.get("paypal-cert-url"), transmission_id:headers.get("paypal-transmission-id"), transmission_sig:headers.get("paypal-transmission-sig"), transmission_time:headers.get("paypal-transmission-time"), webhook_id:WEBHOOK_ID, webhook_event:event }),
  });
  if (!response.ok) return false;
  return (await response.json()).verification_status === "SUCCESS";
}
async function db(path: string, method = "GET", body?: unknown, prefer?: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, "Content-Type":"application/json", ...(prefer ? {Prefer:prefer} : {}) }, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
  if (!response.ok) throw new Error("database_unavailable");
  return response.status === 204 ? null : await response.json();
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed",{status:405});
  if (!SUPABASE_URL || !SERVICE_KEY || !CLIENT_ID || !CLIENT_SECRET || !WEBHOOK_ID) return new Response("not configured",{status:503});
  let event: any;
  try { event = await req.json(); } catch (_) { return new Response("invalid payload",{status:400}); }
  if (!event?.id || !event?.event_type) return new Response("invalid payload",{status:400});
  let token: string;
  try { token = await accessToken(); } catch (_) { return new Response("PayPal unavailable",{status:503}); }
  try { if (!(await verifyEvent(token,event,req))) return new Response("invalid signature",{status:400}); }
  catch (_) { return new Response("verification unavailable",{status:503}); }

  const inserted = await fetch(`${SUPABASE_URL}/rest/v1/paypal_webhook_events?on_conflict=event_id`, { method:"POST", headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, "Content-Type":"application/json", Prefer:"resolution=ignore-duplicates,return=representation" }, body:JSON.stringify([{event_id:event.id,event_type:event.event_type}]) });
  if (!inserted.ok) return new Response("event store unavailable",{status:503});
  const rows = await inserted.json();
  if (!Array.isArray(rows) || !rows.length) {
    const [previous] = await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}&select=status`);
    if (previous?.status !== "failed") return Response.json({received:true,duplicate:true});
    await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"received",error_code:null},"return=minimal");
  }

  try {
    const resource = event.resource || {};
    // Payment sale events carry a sale ID, not a subscription ID. The
    // subscription lifecycle events below are the source of entitlement state.
    if (event.event_type.startsWith("PAYMENT.SALE.")) {
      await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"ignored",processed_at:new Date().toISOString()} ,"return=minimal");
      return Response.json({received:true});
    }
    const subscriptionId = String(resource.id || "");
    if (!subscriptionId || !event.event_type.startsWith("BILLING.SUBSCRIPTION.")) {
      await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"ignored",processed_at:new Date().toISOString()},"return=minimal");
      return Response.json({received:true});
    }
    const detailRes = await fetch(`${API}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,{headers:{Authorization:`Bearer ${token}`} });
    if (!detailRes.ok) throw new Error("subscription_unavailable");
    const detail = await detailRes.json();
    const userId = String(detail.custom_id || "");
    const plan = PLAN_BY_ID[String(detail.plan_id || "")] || null;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !plan) throw new Error("untrusted_subscription_data");
    const active = detail.status === "ACTIVE";
    const pending = detail.status === "APPROVAL_PENDING";
    const canceled = detail.status === "CANCELLED";
    const [profile] = await db(`profiles?id=eq.${encodeURIComponent(userId)}&select=subscription_current_period_end,paypal_subscription_id,subscription_provider,paypal_checkout_started_at`);
    if (!profile || profile.subscription_provider !== "paypal" || profile.paypal_subscription_id !== subscriptionId) {
      await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"ignored",processed_at:new Date().toISOString()},"return=minimal");
      return Response.json({received:true,stale:true});
    }
    const paidThrough = detail.billing_info?.next_billing_time || profile?.subscription_current_period_end || null;
    const stillPaid = canceled && paidThrough && new Date(paidThrough).getTime() > Date.now();
    await db(`profiles?id=eq.${encodeURIComponent(userId)}`,"PATCH",{
      account_type: active || stillPaid ? "business" : "personal",
      account_plan: active || stillPaid || pending ? plan : "personal-free",
      subscription_status: active || stillPaid ? "active" : pending ? "pending" : "inactive",
      subscription_provider:"paypal",
      paypal_subscription_id:subscriptionId,
      paypal_payer_id:detail.subscriber?.payer_id || null,
      stripe_customer_id:null,
      stripe_subscription_id:null,
      subscription_started:detail.start_time || null,
      subscription_current_period_end:paidThrough,
      paypal_checkout_started_at:pending ? profile?.paypal_checkout_started_at || new Date().toISOString() : null,
      subscription_cancel_at_period_end:canceled || detail.status === "SUSPENDED",
    },"return=minimal");
    await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"processed",processed_at:new Date().toISOString(),error_code:null},"return=minimal");
    return Response.json({received:true});
  } catch (error) {
    await db(`paypal_webhook_events?event_id=eq.${encodeURIComponent(event.id)}`,"PATCH",{status:"failed",processed_at:new Date().toISOString(),error_code:error instanceof Error ? error.message.slice(0,80) : "processing_failed"},"return=minimal").catch(()=>{});
    return new Response("processing failed",{status:500});
  }
});
