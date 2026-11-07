// Fails when google-services.json does not belong to the expected Android package.
// Usage: node scripts/check-google-services.js <path to google-services.json> <package name>
const fs = require("fs");
const [file, pkg] = process.argv.slice(2);
let config;
try { config = JSON.parse(fs.readFileSync(file, "utf8")); }
catch (e) { console.error("google-services.json is not valid JSON:", e.message); process.exit(1); }
const ok = (config.client || []).some(c => c?.client_info?.android_client_info?.package_name === pkg);
if (!ok) { console.error(`google-services.json has no Android client for ${pkg}`); process.exit(1); }
console.log("Firebase project:", config.project_info?.project_id, "— Android client found for", pkg);
