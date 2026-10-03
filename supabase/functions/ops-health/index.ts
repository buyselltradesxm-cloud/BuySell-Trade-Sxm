// Buy Sell Trade SXM — ops-health Edge Function
//
// POST, header x-ops-secret: <OPS_HEALTH_SECRET>
// Returns the ops_health() summary: 200 when healthy, 503 when something
// needs attention. Polled by .github/workflows/health-check.yml, which fails
// (and so emails the repository owner) on anything but a healthy 200.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const OPS_SECRET = Deno.env.get("OPS_HEALTH_SECRET") || "";

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

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!OPS_SECRET || !SUPABASE_URL || !SERVICE_KEY) return json({ error: "not configured" }, 503);
  if (!(await timingSafeEqual(req.headers.get("x-ops-secret") || "", OPS_SECRET))) return json({ error: "unauthorized" }, 401);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ops_health`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => null);
  if (!res || !res.ok) return json({ healthy: false, error: "database check failed", status: res?.status ?? null }, 503);

  const health = await res.json();
  const problems: string[] = [];
  for (const job of health.failing_jobs || []) problems.push(`cron job "${job.job}" last status: ${job.last_status ?? "never ran"} at ${job.last_run ?? "-"}`);
  if (health.emails_failed_24h > 0) problems.push(`${health.emails_failed_24h} email(s) failed in the last 24h`);
  if (health.emails_stuck_pending > 0) problems.push(`${health.emails_stuck_pending} email(s) pending for over 2h`);
  if (health.stripe_events_failed_24h > 0) problems.push(`${health.stripe_events_failed_24h} Stripe webhook event(s) failed in the last 24h`);

  return json({ healthy: problems.length === 0, problems, health }, problems.length ? 503 : 200);
});
