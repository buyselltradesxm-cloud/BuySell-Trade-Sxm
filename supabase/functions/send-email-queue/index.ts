type EmailQueueRow = {
  id: string;
  recipient_email: string;
  listing_id: number | string | null;
  template: string;
  subject: string;
  payload: Record<string, unknown> | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const workerSecret = Deno.env.get("EMAIL_QUEUE_SECRET") || "";
const fromEmail = Deno.env.get("EMAIL_FROM") || "Buy Sell Trade SXM <noreply@buyselltradesxm.com>";
const siteUrl = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textOnly(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function actionUrl(listingId: string | number | null, action: "keep" | "sold" | "delete") {
  const url = new URL(siteUrl + "/");
  url.searchParams.set("listing", String(listingId || ""));
  url.searchParams.set("renew", action);
  return url.toString();
}

function buildListingRenewalEmail(row: EmailQueueRow) {
  const title = String(row.payload?.listing_title || "votre annonce");
  const listingId = row.payload?.listing_id || row.listing_id;
  const safeTitle = escapeHtml(title);
  const keepUrl = actionUrl(listingId, "keep");
  const soldUrl = actionUrl(listingId, "sold");
  const deleteUrl = actionUrl(listingId, "delete");

  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family:Arial,sans-serif;color:#092126;background:#f8f3ea;padding:24px;">
    <main style="max-width:620px;margin:auto;background:#fff;border:2px solid #092126;border-radius:12px;padding:24px;">
      <h1 style="font-size:24px;margin:0 0 12px;">Votre annonce est-elle encore disponible ?</h1>
      <p style="font-size:16px;line-height:1.5;">L'annonce <strong>${safeTitle}</strong> a atteint 30 jours sur Buy Sell Trade SXM.</p>
      <p style="font-size:16px;line-height:1.5;">Choisissez une action pour garder la marketplace propre.</p>
      <p style="margin:24px 0;">
        <a href="${keepUrl}" style="display:inline-block;background:#ffc400;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Oui, garder l'annonce</a>
        <a href="${soldUrl}" style="display:inline-block;background:#0f7c8a;color:#fff;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Marquer comme vendu</a>
        <a href="${deleteUrl}" style="display:inline-block;background:#ffe0dd;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Supprimer</a>
      </p>
      <p style="font-size:14px;color:#526366;">Sans reponse, l'annonce pourra etre cachee automatiquement apres quelques jours.</p>
    </main>
  </body>
</html>`;

  return {
    subject: row.subject || "Votre annonce est-elle encore disponible ?",
    html,
    text: textOnly(html),
  };
}

function buildEmail(row: EmailQueueRow) {
  if (row.template === "listing-renewal") return buildListingRenewalEmail(row);
  const message = String(row.payload?.message || row.subject || "Notification Buy Sell Trade SXM");
  const html = `<p>${escapeHtml(message)}</p>`;
  return { subject: row.subject || "Notification Buy Sell Trade SXM", html, text: message };
}

async function rpc(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    // Keep raw text for debugging.
  }
  if (!response.ok) throw new Error(`${name} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function sendWithResend(row: EmailQueueRow, email: ReturnType<typeof buildEmail>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "idempotency-key": `email_queue_${row.id}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [row.recipient_email],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    // Keep raw text for debugging.
  }
  if (!response.ok) throw new Error(`Resend failed: ${response.status} ${JSON.stringify(data)}`);
  return data as { id?: string };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!workerSecret) return json({ ok: false, error: "EMAIL_QUEUE_SECRET is not configured" }, 503);
  if (request.headers.get("x-email-worker-secret") !== workerSecret) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "Supabase service env is missing" }, 503);
  if (!resendApiKey) return json({ ok: false, error: "RESEND_API_KEY is not configured" }, 503);

  const body = await request.json().catch(() => ({}));
  const batchSize = Math.max(1, Math.min(Number(body.batch_size || 10), 50));
  const rows = (await rpc("claim_email_queue", { batch_size: batchSize })) as EmailQueueRow[];
  const results = [];

  for (const row of rows || []) {
    try {
      const email = buildEmail(row);
      const sent = await sendWithResend(row, email);
      await rpc("mark_email_sent", {
        email_id: row.id,
        provider_name: "resend",
        provider_id: sent.id || null,
      });
      results.push({ id: row.id, ok: true, providerId: sent.id || null });
    } catch (error) {
      await rpc("mark_email_failed", {
        email_id: row.id,
        error_message: error instanceof Error ? error.message : String(error),
      });
      results.push({ id: row.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return json({ ok: true, claimed: rows?.length || 0, results });
});
