// One-time setup of the nightly database backup (.github/workflows/db-backup.yml).
// Run it yourself in a terminal, from the project folder:  node scripts/backup-setup.js
//
// 1. Creates (or updates) bst_backup, a READ-ONLY database account, with a new
//    random password. Only its SCRAM hash is sent to the database, so the
//    password itself never reaches the database or its logs.
// 2. Saves the connection address with that password as the GitHub secret
//    BACKUP_DB_URL. Nothing secret is printed.
// Needs: the Supabase CLI linked to the project, and gh signed in to GitHub.
// Running it again replaces the password; the nightly job keeps working.
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {execFileSync} = require("child_process");

const REF = "szhaxlmronirhnntlwyb";
const POOLER = "aws-1-eu-west-1.pooler.supabase.com:5432"; // session pooler (GitHub runners have no IPv6)
const REPO = "buyselltradesxm-cloud/BuySell-Trade-Sxm";

// Postgres SCRAM-SHA-256 verifier (RFC 5802/7677), as Postgres stores it.
function scramVerifier(password){
  const salt = crypto.randomBytes(16), iterations = 4096;
  const salted = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const hmac = (key, text)=>crypto.createHmac("sha256", key).update(text).digest();
  const storedKey = crypto.createHash("sha256").update(hmac(salted, "Client Key")).digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${hmac(salted, "Server Key").toString("base64")}`;
}

const password = crypto.randomBytes(32).toString("hex"); // hex: safe inside a URL
const verifier = scramVerifier(password);
if(!/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(verifier)) throw new Error("bad verifier");

// BYPASSRLS: a dump must see every row, not only what row policies show.
const sql = `do $$ begin
  if not exists (select from pg_roles where rolname = 'bst_backup') then create role bst_backup; end if;
end $$;
alter role bst_backup with login bypassrls nocreatedb nocreaterole password '${verifier}';
grant pg_read_all_data to bst_backup;
select rolname, rolcanlogin, rolbypassrls, pg_has_role('bst_backup', 'pg_read_all_data', 'member') as read_only_access
  from pg_roles where rolname = 'bst_backup';`;
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bst-backup-")), "role.sql");
fs.writeFileSync(tmp, sql, {mode: 0o600});
try {
  console.log("1/2  Creating the read-only database account bst_backup...");
  const out = execFileSync("supabase", ["db", "query", "--linked", "-f", tmp], {encoding: "utf8"});
  if(!/"read_only_access":\s*true/.test(out)) throw new Error("The database did not confirm the account:\n" + out);
} finally {
  fs.rmSync(path.dirname(tmp), {recursive: true, force: true});
}
console.log("2/2  Saving the connection as the GitHub secret BACKUP_DB_URL...");
execFileSync("gh", ["secret", "set", "BACKUP_DB_URL", "--repo", REPO],
  {input: `postgresql://bst_backup.${REF}:${password}@${POOLER}/postgres`, stdio: ["pipe", "inherit", "inherit"]});
console.log("Done. Start a first backup with:  gh workflow run db-backup.yml");
