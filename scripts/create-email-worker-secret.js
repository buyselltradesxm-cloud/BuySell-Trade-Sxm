const crypto = require("crypto");

const secret = crypto.randomBytes(32).toString("hex");

console.log("Run these commands in PowerShell. Do not commit the secret.\n");
console.log(`$env:EMAIL_QUEUE_SECRET="${secret}"`);
console.log("supabase secrets set EMAIL_QUEUE_SECRET=$env:EMAIL_QUEUE_SECRET");
console.log("");
console.log("Then run this SQL in Supabase SQL Editor or with supabase db query:");
console.log("");
console.log(`select vault.create_secret('${secret}', 'EMAIL_QUEUE_SECRET');`);
