const fs = require("fs");
const path = require("path");

const config = fs.readFileSync(path.join(__dirname, "supabase-config.js"), "utf8");
const url = /window\.SUPABASE_URL\s*=\s*"([^"]+)"/.exec(config)?.[1];
const anonKey = /window\.SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(config)?.[1];

if (!url || !anonKey) {
  console.error("Missing Supabase URL or anon key in supabase-config.js");
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "Content-Type": "application/json"
};

async function request(label, endpoint, options = {}) {
  const response = await fetch(`${url}${endpoint}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: { ...headers, ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_err) {}
  return { label, status: response.status, ok: response.ok, body };
}

function expected(check, ok, note) {
  return { ...check, httpOk: check.ok, ok, note };
}

function fail(errors, label, detail) {
  errors.push(`${label}: ${detail}`);
}

function securityRejection(check) {
  return [401, 403].includes(check.status) && check.body?.code === "42501";
}

(async () => {
  const errors = [];
  const checks = [];

  const listings = await request("public listings expose seller_name", "/rest/v1/listings?select=id,title,seller_name&limit=3");
  checks.push(listings);
  if (!listings.ok || !Array.isArray(listings.body)) fail(errors, listings.label, `expected 200 array, got ${listings.status}`);

  const profiles = await request("anon cannot read profiles", "/rest/v1/profiles?select=id,name,role&limit=1");
  // Production hardening revokes the anon table grant, so PostgREST returns
  // 401 instead of returning an empty 200 result. Accept either secure shape:
  // older deployments may still expose an empty RLS-filtered response.
  const profilesSecure = securityRejection(profiles) ||
    (profiles.status === 200 && Array.isArray(profiles.body) && profiles.body.length === 0);
  checks.push(expected(profiles, profilesSecure, "Expected empty RLS result or explicit permission denial"));
  if (!profilesSecure) fail(errors, profiles.label, `unexpected response ${profiles.status}/${profiles.body?.code || "rows"}`);

  const reportInsert = await request("anon cannot create reports", "/rest/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      listing_id: -9007199254740000,
      reporter_id: "00000000-0000-4000-8000-000000000000",
      reason: "anon qa should fail"
    })
  });
  checks.push(expected(reportInsert, securityRejection(reportInsert), "Expected permission denial, not a generic server error"));
  if (!securityRejection(reportInsert)) fail(errors, reportInsert.label, `expected permission rejection, got ${reportInsert.status}/${reportInsert.body?.code}`);

  const adminStatus = await request("anon cannot call admin status RPC", "/rest/v1/rpc/admin_set_listing_status", {
    method: "POST",
    body: JSON.stringify({ listing_id: -9007199254740000, new_status: "active" })
  });
  checks.push(expected(adminStatus, securityRejection(adminStatus), "Expected admin-only permission denial"));
  if (!securityRejection(adminStatus)) fail(errors, adminStatus.label, `expected permission rejection, got ${adminStatus.status}/${adminStatus.body?.code}`);

  const adminDelete = await request("anon cannot call admin delete RPC", "/rest/v1/rpc/admin_delete_listing", {
    method: "POST",
    body: JSON.stringify({ listing_id: -9007199254740000 })
  });
  checks.push(expected(adminDelete, securityRejection(adminDelete), "Expected admin-only permission denial"));
  if (!securityRejection(adminDelete)) fail(errors, adminDelete.label, `expected permission rejection, got ${adminDelete.status}/${adminDelete.body?.code}`);

  const publicBridge = await fetch("https://buyselltradesxm.com/supabase-api.js?backend-health=1", { signal: AbortSignal.timeout(20000) });
  const bridgeText = await publicBridge.text();
  checks.push({
    label: "public site has hardened Supabase bridge",
    status: publicBridge.status,
    ok: publicBridge.ok,
    body: {
      hasSellerName: bridgeText.includes("seller_name"),
      hasAdminRpc: bridgeText.includes("adminSetListingStatus")
    }
  });
  if (!publicBridge.ok) fail(errors, "public bridge", `expected 200, got ${publicBridge.status}`);
  if (!bridgeText.includes("seller_name") || !bridgeText.includes("adminSetListingStatus")) {
    fail(errors, "public bridge", "deployed supabase-api.js is missing hardening code");
  }

  console.log(JSON.stringify({ errors, checks }, null, 2));
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
