const fs = require("fs");
const path = require("path");

const projectRef = process.env.SUPABASE_PROJECT_REF || "ujykgiitlcuqiiepsyiz";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function missing(name) {
  console.error(`Missing ${name}.`);
  process.exitCode = 1;
}

if (!accessToken) missing("SUPABASE_ACCESS_TOKEN");
if (!googleClientId) missing("GOOGLE_CLIENT_ID");
if (!googleClientSecret) missing("GOOGLE_CLIENT_SECRET");
if (process.exitCode) {
  console.error("");
  console.error("Set them in this terminal, then run this command again:");
  console.error("  $env:SUPABASE_ACCESS_TOKEN=\"your-supabase-access-token\"");
  console.error("  $env:GOOGLE_CLIENT_ID=\"your-google-client-id\"");
  console.error("  $env:GOOGLE_CLIENT_SECRET=\"your-google-client-secret\"");
  console.error("  npm run supabase:enable-google-auth");
  process.exit();
}

async function main() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      site_url: "https://buyselltradesxm.com",
      uri_allow_list: "https://buyselltradesxm.com,https://buyselltradesxm.com/**",
      external_google_enabled: true,
      external_google_client_id: googleClientId,
      external_google_secret: googleClientSecret
    })
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

  const configPath = path.join(__dirname, "..", "supabase-config.js");
  const config = fs.readFileSync(configPath, "utf8");
  const updated = config.replace(/google:\s*false/, "google: true");
  fs.writeFileSync(configPath, updated);

  console.log(JSON.stringify({
    ok: true,
    projectRef,
    googleEnabled: true,
    callbackUrl: `https://${projectRef}.supabase.co/auth/v1/callback`,
    siteUrl: "https://buyselltradesxm.com",
    localConfigUpdated: true
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
