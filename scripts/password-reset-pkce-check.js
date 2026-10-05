const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'supabase-api.js'), 'utf8');
const authCalls = [];
const edgeBodies = [];
let gateAllowed = true;
const context = {
  window: {
    Capacitor: null,
    location: { origin: 'https://buyselltradesxm.com' },
    SUPABASE_URL: 'https://qa-project.supabase.co',
    SUPABASE_ANON_KEY: 'qa-public-key',
    Captcha: { token: async () => 'qa-captcha-token' },
    db: { auth: { resetPasswordForEmail: async (email, options) => {
      authCalls.push({ email, options });
      return { data: {}, error: null };
    } } }
  },
  document: { documentElement: { lang: 'en' } },
  URL,
  console: { warn() {} },
  fetch: async (_url, options) => {
    edgeBodies.push(JSON.parse(options.body));
    return { ok: true, status: 202, json: async () => ({ accepted: true, allowed: gateAllowed }) };
  }
};

vm.runInNewContext(source, context, { filename: 'supabase-api.js' });

(async () => {
  const sent = await context.window.SB.requestPasswordReset('qa@example.com');
  assert.equal(sent.error, null);
  assert.equal(authCalls.length, 1, 'approved reset should use Supabase Auth SDK');
  assert.equal(authCalls[0].email, 'qa@example.com');
  assert.equal(authCalls[0].options.redirectTo, 'https://buyselltradesxm.com/?reset=1');
  assert.equal(authCalls[0].options.captchaToken, 'qa-captcha-token');
  assert.equal(edgeBodies[0].client_pkce, true);
  assert.equal(edgeBodies[0].captcha_token, 'qa-captcha-token');

  gateAllowed = false;
  await context.window.SB.requestPasswordReset('qa@example.com');
  assert.equal(authCalls.length, 1, 'rate-limited reset must not send a second email');
  console.log('Password reset PKCE flow: approved requests use SDK; denied requests do not send.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
