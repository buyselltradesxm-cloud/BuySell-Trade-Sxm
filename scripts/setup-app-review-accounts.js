// Creates ordinary, confirmed review users. Credentials stay outside the repository.
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ref = "szhaxlmronirhnntlwyb";
const url = `https://${ref}.supabase.co`;
const credentialFile = process.env.APP_REVIEW_CREDENTIAL_FILE || path.join(os.homedir(), ".codex", "private", "bst-app-review.json");
async function main() {
  const cli = process.platform === "win32" ? path.join(os.homedir(), ".local", "bin", "supabase.exe") : "supabase";
  const keys = JSON.parse(execFileSync(cli, ["projects", "api-keys", "--project-ref", ref, "--reveal", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const key = keys.find(key => key.name === "service_role")?.api_key;
  if (!key) throw new Error("Supabase service credential unavailable");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const saved = fs.existsSync(credentialFile) ? JSON.parse(fs.readFileSync(credentialFile, "utf8")) : {};
  for (const type of ["personal", "business"]) {
    let record = saved[type];
    if (!record) {
      record = { email: `appreview.${type}@buyselltradesxm.com`, password: randomBytes(24).toString("base64url") + "aA1!" };
      const response = await fetch(url + "/auth/v1/admin/users", { method: "POST", headers, body: JSON.stringify({
        email: record.email, password: record.password, email_confirm: true,
        user_metadata: { name: type === "personal" ? "App Review Personal" : "App Review Business" }
      }) });
      if (!response.ok) throw new Error(`Unable to create ${type} review account (${response.status}); no existing passwords were changed.`);
      record.id = (await response.json()).id;
      saved[type] = record;
      fs.mkdirSync(path.dirname(credentialFile), { recursive: true });
      fs.writeFileSync(credentialFile, JSON.stringify(saved, null, 2), { mode: 0o600 });
    }
    const profile = await fetch(`${url}/rest/v1/profiles?id=eq.${record.id}`, { method: "PATCH", headers, body: JSON.stringify({
      account_type: type, account_plan: type === "business" ? "pro-unlimited" : "personal-free", role: "user",
      subscription_status: type === "business" ? "active" : "free",
      subscription_started: type === "business" ? new Date().toISOString() : null,
      subscription_current_period_end: type === "business" ? new Date(Date.now() + 180 * 86400000).toISOString() : null,
      business_name: type === "business" ? "App Review Demo Business" : null
    }) });
    if (!profile.ok) throw new Error(`Unable to configure ${type} profile (${profile.status})`);
    const login = await fetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: keys.find(k => k.name === "anon").api_key, "Content-Type": "application/json" }, body: JSON.stringify({ email: record.email, password: record.password }) });
    if (!login.ok) throw new Error(`Review login failed for ${type} (${login.status})`);
    const session = await login.json();
    const prepare = await fetch(url + "/functions/v1/apple-purchases", { method: "POST", headers: { ...headers, Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "prepare", productId: "com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly" }) });
    if (!prepare.ok || !(await prepare.json()).appAccountToken) throw new Error(`Apple purchase preparation failed (${prepare.status})`);
    const check = await fetch(url + "/functions/v1/apple-purchases", { method: "POST", headers: { ...headers, Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ action: "verify", signedTransaction: "forged.invalid.signature" }) });
    if (check.status !== 503) throw new Error(`Unexpected forged purchase response (${check.status})`);
    console.log(`${type}: confirmed login and Apple purchase preparation work; forged Apple purchase rejected.`);
  }
  console.log(`Review credentials saved privately: ${credentialFile}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
