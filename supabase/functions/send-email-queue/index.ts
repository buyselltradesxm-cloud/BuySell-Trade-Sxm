type EmailQueueRow = {
  id: string;
  user_id: string | null;
  recipient_email: string;
  listing_id: number | string | null;
  template: string;
  subject: string;
  payload: Record<string, unknown> | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = getSupabaseSecretKey();
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const workerSecret = Deno.env.get("EMAIL_QUEUE_SECRET") || "";
const fromEmail = Deno.env.get("EMAIL_FROM") || "Buy Sell Trade SXM <noreply@buyselltradesxm.com>";
const siteUrl = (Deno.env.get("SITE_URL") || "https://buyselltradesxm.com").replace(/\/$/, "");

function getSupabaseSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (legacy) return legacy;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      for (const value of Object.values(parsed)) {
        if (typeof value === "string" && value.length > 20) return value;
      }
    }
  } catch (_error) {
    return "";
  }

  return "";
}

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

function actionUrl(listingId: unknown, action: "keep" | "sold" | "delete") {
  const url = new URL(siteUrl + "/");
  url.searchParams.set("listing", String(listingId || ""));
  url.searchParams.set("renew", action);
  return url.toString();
}

function unsubscribeUrl(userId: string | null) {
  if (!userId) return null;
  const url = new URL(siteUrl + "/");
  url.searchParams.set("unsub", "renewal");
  url.searchParams.set("uid", userId);
  return url.toString();
}

// CAN-SPAM (15 U.S.C. 7704) requires a valid physical postal address in every
// commercial email; LCEN art. 6-III requires identifying the publisher.
const SENDER_ADDRESS = "Association Korek Digital · 17 Résidence des Gémeaux, 94260 Fresnes, France";
const addressFooter =
  `<p style="font-size:12px;color:#8a9598;margin-top:12px;">Buy Sell Trade SXM · ${SENDER_ADDRESS}</p>`;

function buildListingRenewalEmail(row: EmailQueueRow) {
  const title = String(row.payload?.listing_title || "votre annonce");
  const listingId = row.payload?.listing_id || row.listing_id;
  const safeTitle = escapeHtml(title);
  const keepUrl = actionUrl(listingId, "keep");
  const soldUrl = actionUrl(listingId, "sold");
  const deleteUrl = actionUrl(listingId, "delete");
  const unsubUrl = unsubscribeUrl(row.user_id);
  const unsubFooter = unsubUrl
    ? `<p style="font-size:12px;color:#8a9598;margin-top:20px;">
        <a href="${unsubUrl}" style="color:#8a9598;">Ne plus recevoir ces rappels</a> ·
        <a href="${unsubUrl}" style="color:#8a9598;">Stop these reminders</a>
      </p>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family:Arial,sans-serif;color:#092126;background:#f8f3ea;padding:24px;">
    <main style="max-width:620px;margin:auto;background:#fff;border:2px solid #092126;border-radius:12px;padding:24px;">
      <p style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#0f7c8a;font-weight:700;margin:0 0 10px;">Buy Sell Trade SXM</p>
      <h1 style="font-size:24px;margin:0 0 12px;">Votre annonce est-elle encore disponible ?</h1>
      <p style="font-size:16px;line-height:1.5;">L'annonce <strong>${safeTitle}</strong> a atteint 30 jours sur Buy Sell Trade SXM.</p>
      <p style="font-size:16px;line-height:1.5;">Choisissez une action pour garder la marketplace propre et eviter les annonces qui ne sont plus disponibles.</p>
      <p style="margin:24px 0;">
        <a href="${keepUrl}" style="display:inline-block;background:#ffc400;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Oui, garder l'annonce</a>
        <a href="${soldUrl}" style="display:inline-block;background:#0f7c8a;color:#fff;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Marquer comme vendu</a>
        <a href="${deleteUrl}" style="display:inline-block;background:#ffe0dd;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Supprimer</a>
      </p>
      <p style="font-size:14px;color:#526366;">Sans reponse, l'annonce pourra etre cachee automatiquement apres quelques jours.</p>
      <hr style="border:0;border-top:1px solid #d8dedc;margin:28px 0;">
      <h2 style="font-size:22px;margin:0 0 12px;">Is your listing still available?</h2>
      <p style="font-size:16px;line-height:1.5;">The listing <strong>${safeTitle}</strong> has reached 30 days on Buy Sell Trade SXM.</p>
      <p style="font-size:16px;line-height:1.5;">Please choose an action so buyers do not see items that are no longer available.</p>
      <p style="margin:24px 0;">
        <a href="${keepUrl}" style="display:inline-block;background:#ffc400;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Yes, keep the listing</a>
        <a href="${soldUrl}" style="display:inline-block;background:#0f7c8a;color:#fff;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Mark as sold</a>
        <a href="${deleteUrl}" style="display:inline-block;background:#ffe0dd;color:#092126;border:2px solid #092126;border-radius:10px;padding:12px 16px;font-weight:700;text-decoration:none;margin:0 8px 8px 0;">Delete</a>
      </p>
      <p style="font-size:14px;color:#526366;">Without a response, the listing may be hidden automatically after a few days.</p>
      ${unsubFooter}
      ${addressFooter}
    </main>
  </body>
</html>`;

  return {
    subject: "Votre annonce est-elle encore disponible ? / Is your listing still available?",
    html,
    text: textOnly(html),
  };
}

function buildEmail(row: EmailQueueRow) {
  if (row.template === "listing-renewal") return buildListingRenewalEmail(row);
  const message = String(row.payload?.message || row.subject || "Notification Buy Sell Trade SXM");
  const html = `<p>${escapeHtml(message)}</p>${addressFooter}`;
  return { subject: row.subject || "Notification Buy Sell Trade SXM", html, text: `${message}

Buy Sell Trade SXM · ${SENDER_ADDRESS}` };
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
      ...(unsubscribeUrl(row.user_id) && row.template === "listing-renewal"
        ? { headers: { "List-Unsubscribe": `<${unsubscribeUrl(row.user_id)}>, <mailto:rxmarketing09@gmail.com?subject=unsubscribe>` } }
        : {}),
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
  try {
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
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
