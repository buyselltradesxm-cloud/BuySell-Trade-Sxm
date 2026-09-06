const fs = require("fs");
const path = require("path");

function readDefaultSupabaseUrl() {
  const file = path.join(__dirname, "..", "supabase-config.js");
  if (!fs.existsSync(file)) return "";
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/url:\s*["']([^"']+)["']/);
  return match ? match[1] : "";
}

const config = {
  supabaseUrl: process.env.SUPABASE_URL || readDefaultSupabaseUrl(),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  from: process.env.EMAIL_FROM || "Buy Sell Trade SXM <noreply@buyselltradesxm.com>",
  siteUrl: (process.env.SITE_URL || "https://buyselltradesxm.com").replace(/\/$/, ""),
  limit: Number(process.env.EMAIL_QUEUE_LIMIT || 10),
  dryRun: process.env.EMAIL_DRY_RUN === "1" || process.argv.includes("--dry-run")
};

function textOnly(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function actionUrl(siteUrl, listingId, action) {
  const url = new URL(siteUrl + "/");
  url.searchParams.set("listing", String(listingId));
  url.searchParams.set("renew", action);
  return url.toString();
}

function listingRenewalEmail(row, siteUrl) {
  const payload = row.payload || {};
  const listingId = payload.listing_id || row.listing_id;
  const title = payload.listing_title || "votre annonce";
  const keepUrl = actionUrl(siteUrl, listingId, "keep");
  const soldUrl = actionUrl(siteUrl, listingId, "sold");
  const deleteUrl = actionUrl(siteUrl, listingId, "delete");
  const safeTitle = escapeHtml(title);

  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family:Arial,sans-serif;color:#092126;background:#f8f3ea;padding:24px;">
    <main style="max-width:620px;margin:auto;background:#fff;border:2px solid #092126;border-radius:12px;padding:24px;">
      <h1 style="font-size:24px;margin:0 0 12px;">Votre annonce est-elle encore disponible ?</h1>
      <p style="font-size:16px;line-height:1.5;">L'annonce <strong>${safeTitle}</strong> a atteint 30 jours sur Buy Sell Trade SXM.</p>
      <p style="font-size:16px;line-height:1.5;">Choisissez une action pour garder la marketplace propre et eviter les annonces qui ne sont plus disponibles.</p>
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
    text: textOnly(html)
  };
}

function buildEmail(row, siteUrl = config.siteUrl) {
  if (!row || !row.recipient_email) throw new Error("email_queue row missing recipient_email");
  if (row.template === "listing-renewal") return listingRenewalEmail(row, siteUrl);
  return {
    subject: row.subject || "Notification Buy Sell Trade SXM",
    html: `<p>${escapeHtml(row.subject || "Notification")}</p><p>${escapeHtml(row.payload?.message || "")}</p>`,
    text: row.payload?.message || row.subject || "Notification Buy Sell Trade SXM"
  };
}

async function supabaseRpc(name, body, cfg = config) {
  const response = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch (_err) {}
  if (!response.ok) throw new Error(`${name} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function sendWithResend(row, email, cfg = config) {
  if (cfg.dryRun) {
    return { id: `dry-run-${row.id}` };
  }
  if (!cfg.resendApiKey) throw new Error("Missing RESEND_API_KEY");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `email_queue_${row.id}`
    },
    body: JSON.stringify({
      from: cfg.from,
      to: [row.recipient_email],
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch (_err) {}
  if (!response.ok) throw new Error(`Resend failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function processEmailQueue(cfg = config) {
  if (!cfg.supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!cfg.serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  const rows = await supabaseRpc("claim_email_queue", { batch_size: cfg.limit }, cfg);
  const results = [];
  for (const row of rows || []) {
    try {
      const email = buildEmail(row, cfg.siteUrl);
      const sent = await sendWithResend(row, email, cfg);
      await supabaseRpc("mark_email_sent", {
        email_id: row.id,
        provider_name: cfg.dryRun ? "dry-run" : "resend",
        provider_id: sent && sent.id ? sent.id : null
      }, cfg);
      results.push({ id: row.id, ok: true, providerId: sent && sent.id });
    } catch (error) {
      await supabaseRpc("mark_email_failed", {
        email_id: row.id,
        error_message: error.message
      }, cfg);
      results.push({ id: row.id, ok: false, error: error.message });
    }
  }
  return { claimed: rows ? rows.length : 0, results };
}

if (require.main === module) {
  processEmailQueue()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  actionUrl,
  buildEmail,
  listingRenewalEmail,
  processEmailQueue,
  sendWithResend,
  textOnly
};
