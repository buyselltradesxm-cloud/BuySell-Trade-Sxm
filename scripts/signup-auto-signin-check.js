const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function check(pageFile, verification, signIn, password = 'QA secure password 123') {
  const source = fs.readFileSync(path.join(__dirname, '..', pageFile), 'utf8');
  const start = source.indexOf('async function confirmSignupCode(){');
  const end = source.indexOf('async function resendSignupCode(){', start);
  assert(start >= 0 && end > start, pageFile + ': signup confirmation function missing');

  const form = { reset() {} };
  const elements = {
    signupOtpCode: { value: '1234' },
    signupOtpError: { textContent: '' },
    signupOtpStep: { hidden: false, closest: () => form },
    signupFields: { hidden: true },
    signupSubmitRow: { hidden: true },
    loginEmail: { value: '' },
    loginPassword: { value: '' },
    loginError: { textContent: '' }
  };
  const button = { disabled: false, textContent: 'Confirm code' };
  const calls = { signIn: [], complete: 0, toast: 0 };
  const state = { lang: 'en', user: null };
  const context = {
    pendingSignupOtp: { email: 'qa@example.com', password, userId: 'qa-user' },
    document: {
      getElementById: id => elements[id],
      querySelector: selector => selector.includes('confirmSignupCode') ? button : { scrollIntoView() {} }
    },
    SB: {
      verifySignupCode: async () => verification,
      signIn: async (email, password) => {
        calls.signIn.push({ email, password });
        return signIn;
      }
    },
    state,
    t: () => ({ otpInvalid: 'Invalid code', otpConfirmed: 'Welcome' }),
    applySupabaseUser: async user => { state.user = user; return user; },
    showToast: () => { calls.toast++; },
    completeAuth: () => { calls.complete++; },
    clearPendingSignup: () => { calls.cleared = (calls.cleared || 0) + 1; }
  };
  vm.runInNewContext(source.slice(start, end), context, { filename: pageFile });
  await vm.runInNewContext('confirmSignupCode()', context);
  assert.equal(button.disabled, false, pageFile + ': confirmation button must recover');
  assert.equal(button.textContent, 'Confirm code');
  return { context, elements, calls, state };
}

(async () => {
  for (const page of ['app-index.js', 'app-marketplace.js']) {
    const success = await check(page, { data: { confirmed: true }, error: null },
      { data: { session: { access_token: 'qa-token' }, user: { id: 'qa-user' } }, error: null });
    assert.equal(success.calls.signIn.length, 1, page + ': must sign in after confirmation');
    assert.equal(success.calls.signIn[0].email, 'qa@example.com');
    assert.equal(success.calls.signIn[0].password, 'QA secure password 123');
    assert.equal(success.calls.complete, 1, page + ': must resume the pending account action');
    assert.equal(success.calls.toast, 1);
    assert.equal(success.state.user.id, 'qa-user');
    assert.equal(success.context.pendingSignupOtp, null);
    assert.equal(success.elements.signupOtpStep.hidden, true);

    const invalidCode = await check(page, { error: { code: 'invalid_or_expired_code' } }, null);
    assert.equal(invalidCode.calls.signIn.length, 0, page + ': invalid code must not sign in');
    assert.equal(invalidCode.calls.complete, 0);
    assert(invalidCode.context.pendingSignupOtp);

    const unconfirmed = await check(page, { data: { accepted: true }, error: null }, null);
    assert.equal(unconfirmed.calls.signIn.length, 0, page + ': an unconfirmed response must not sign in');
    assert.equal(unconfirmed.calls.complete, 0);

    const failedSignIn = await check(page, { data: { confirmed: true }, error: null },
      { data: null, error: { message: 'QA authentication failure' } });
    assert.equal(failedSignIn.calls.complete, 0, page + ': failed sign in must keep the login form');
    assert.equal(failedSignIn.calls.toast, 0, page + ': failed sign in must not show a welcome toast');
    assert.equal(failedSignIn.elements.loginEmail.value, 'qa@example.com');
    assert.match(failedSignIn.elements.loginError.textContent, /Automatic sign-in/);

    // Signup resumed after leaving the page: the password is not kept, so the
    // code confirms the address and the login form takes over.
    const resumed = await check(page, { data: { confirmed: true }, error: null }, null, '');
    assert.equal(resumed.calls.signIn.length, 0, page + ': a resumed signup has no password to sign in with');
    assert.equal(resumed.calls.cleared, 1, page + ': the saved pending signup must be cleared');
    assert.equal(resumed.elements.loginEmail.value, 'qa@example.com');
    assert.match(resumed.elements.loginError.textContent, /account is ready/);
  }
  console.log('Signup confirmation signs in on both pages; invalid codes and sign-in failures stay safe.');
})().catch(error => { console.error(error); process.exitCode = 1; });
