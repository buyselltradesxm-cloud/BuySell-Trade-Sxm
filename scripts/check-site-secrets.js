// Pre-deploy gate: fails if the built site folder holds a secret or an internal file.
// Usage: node scripts/check-site-secrets.js [dir]   (default _site, the folder Pages publishes)
// Prints the kind, file, line and a short digest of each hit, never the value itself.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const site = path.resolve(process.argv[2] || '_site');

// Values that are meant to be public (publishable keys, anon JWTs) are not listed here.
const secretPatterns = {
  'Supabase secret key': /sb_secret_[A-Za-z0-9_-]{20,}/g,
  'Stripe secret key': /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/g,
  'Stripe webhook secret': /\bwhsec_[A-Za-z0-9]{10,}/g,
  'AWS access key id': /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  'private key': /-----BEGIN (?:RSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
  'Google OAuth client secret': /\bGOCSPX-[A-Za-z0-9_-]{20,}/g,
  'GitHub token': /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/g,
  'Resend API key': /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{10,}/g,
  'Turnstile secret key': /\b0x4AAAAAAA[A-Za-z0-9_-]{20,}/g,
  'database URL with password': /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s'"<>:]+:[^\s'"<>@]+@[^\s'"<>]+/g,
  'LLM API key': /\bsk-(?:ant-|proj-)[A-Za-z0-9_-]{30,}/g,
};
// The Turnstile SITE key shares the 0x4AAAAAAA prefix but is shorter; secret keys are longer.
const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const forbiddenFile = /\.(?:md|map|sql|env|jks|keystore|p8|p12|pem|key|ps1|toml|lock|log)$|(?:^|\/)\.env|service-account.*\.json$/i;

function jwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role || 'none';
  } catch (_) {
    return 'undecodable';
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (!fs.existsSync(site)) {
  console.error('FAIL site folder not found: ' + site);
  process.exit(1);
}
const problems = [];
let scanned = 0;
for (const file of walk(site)) {
  const rel = path.relative(site, file).split(path.sep).join('/');
  if (forbiddenFile.test(rel)) problems.push('internal file published: ' + rel);
  if (fs.statSync(file).size > 20e6) continue;
  const text = fs.readFileSync(file, 'utf8');
  scanned++;
  const lineOf = index => text.slice(0, index).split('\n').length;
  const digest = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 10);
  for (const [kind, pattern] of Object.entries(secretPatterns)) {
    for (const match of text.matchAll(pattern)) {
      problems.push(kind + ' in ' + rel + ':' + lineOf(match.index) + ' (sha256 ' + digest(match[0]) + ')');
    }
  }
  for (const match of text.matchAll(jwtPattern)) {
    const role = jwtRole(match[0]);
    if (role !== 'anon') problems.push('JWT with role "' + role + '" in ' + rel + ':' + lineOf(match.index) + ' (sha256 ' + digest(match[0]) + ')');
  }
}
if (problems.length) {
  for (const problem of problems) console.error('FAIL ' + problem);
  process.exit(1);
}
console.log('PASS ' + scanned + ' published files hold no secret and no internal file');
