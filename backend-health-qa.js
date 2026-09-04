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
    headers: { ...headers, ...(options.headers || {}) }
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_err) {}
  return { label, status: response.status, ok: response.ok, body };
}

function fail(errors, label, detail) {
  errors.push(`${label}: ${detail}`);
}

(async () => {
  const errors = [];
  const checks = [];

  const listings = await request("public listings expose seller_name", "/rest/v1/listings?select=id,title,seller_name&limit=3");
  checks.push(listings);
  if (!listings.ok) fail(errors, listings.label, `expected 200, got ${listings.status}`);

  const profiles = await request("anon cannot read profiles", "/rest/v1/profiles?select=id,name,role&limit=1");
  checks.push(profiles);
  if (!profiles.ok) fail(errors, profiles.label, `expected 200 empty result, got ${profiles.status}`);
  if (Array.isArray(profiles.body) && profiles.body.length !== 0) {
    fail(errors, profiles.label, "profiles returned rows to anon user");
  }

  const reportInsert = await request("anon cannot create reports", "/rest/v1/reports", {
    method: "POST",
    body: JSON.stringify({
      listing_id: 1,
      reporter_id: "00000000-0000-4000-8000-000000000000",
      reason: "anon qa should fail"
    })
  });
  checks.push(reportInsert);
  if (reportInsert.status < 400) fail(errors, reportInsert.label, `expected rejection, got ${reportInsert.status}`);

  const adminStatus = await request("anon cannot call admin status RPC", "/rest/v1/rpc/admin_set_listing_status", {
    method: "POST",
    body: JSON.stringify({ listing_id: 1, new_status: "active" })
  });
  checks.push(adminStatus);
  if (adminStatus.status < 400) fail(errors, adminStatus.label, `expected rejection, got ${adminStatus.status}`);

  const adminDelete = await request("anon cannot call admin delete RPC", "/rest/v1/rpc/admin_delete_listing", {
    method: "POST",
    body: JSON.stringify({ listing_id: 1 })
  });
  checks.push(adminDelete);
  if (adminDelete.status < 400) fail(errors, adminDelete.label, `expected rejection, got ${adminDelete.status}`);

  const publicBridge = await fetch("https://buyselltradesxm.com/supabase-api.js?backend-health=1");
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
