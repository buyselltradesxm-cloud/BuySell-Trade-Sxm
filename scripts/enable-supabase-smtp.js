const projectRef = process.env.SUPABASE_PROJECT_REF || "ujykgiitlcuqiiepsyiz";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

const smtpHost = process.env.SMTP_HOST || "smtp.resend.com";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER || "resend";
const smtpPass = process.env.SMTP_PASS;
const smtpSenderEmail = process.env.SMTP_SENDER_EMAIL || "noreply@buyselltradesxm.com";
const smtpSenderName = process.env.SMTP_SENDER_NAME || "Buy Sell Trade SXM";
const smtpMaxFrequency = Number(process.env.SMTP_MAX_FREQUENCY || 30);

function requireEnv(name, value) {
  if (value) return;
  console.error(`Missing ${name}.`);
  process.exitCode = 1;
}

requireEnv("SUPABASE_ACCESS_TOKEN", accessToken);
requireEnv("SMTP_PASS", smtpPass);

if (process.exitCode) {
  console.error("");
  console.error("For Resend, create and verify your domain first, then set:");
  console.error("  $env:SUPABASE_ACCESS_TOKEN=\"your-supabase-access-token\"");
  console.error("  $env:SMTP_PASS=\"your-resend-api-key\"");
  console.error("  $env:SMTP_SENDER_EMAIL=\"noreply@buyselltradesxm.com\"");
  console.error("  npm run supabase:enable-smtp");
  process.exit();
}

async function main() {
  const payload = {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: smtpSenderEmail,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    smtp_sender_name: smtpSenderName,
    smtp_max_frequency: smtpMaxFrequency
  };

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_err) {}

  if (!response.ok) {
    console.error(JSON.stringify({
      ok: false,
      status: response.status,
      body
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    projectRef,
    smtpEnabled: true,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpSenderEmail,
    smtpSenderName,
    smtpMaxFrequency
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
