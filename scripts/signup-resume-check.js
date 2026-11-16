// Browser check: a signup left before the email code was entered comes back
// on the code step, and "Use a different email" returns to the signup form.
// Needs a local server on :5173. No request reaches the signup service.
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  try {
    for (const page of ['index.html', 'marketplace.html']) {
      const context = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
      const userId = '00000000-0000-4000-8000-000000000000';
      await context.route('**/functions/v1/signup-code', route => {
        const request = route.request().postDataJSON();
        if (request.action === 'resend') return route.abort('failed');
        const existing = request.action === 'start' && request.email === 'existing@example.com';
        const json = request.action === 'verify' ? { confirmed: true }
          : existing ? { code: 'signup_failed' } : { accepted: true, user_id: userId };
        return route.fulfill({ status: existing ? 400 : 200, json });
      });
      const tab = await context.newPage();
      await tab.addInitScript(() => {
        if (sessionStorage.getItem('qa-seeded')) return;
        sessionStorage.setItem('qa-seeded', '1');
        localStorage.setItem('bst-pending-signup', JSON.stringify({ email: 'resume-qa@example.com', userId: '00000000-0000-4000-8000-000000000000', savedAt: Date.now() }));
      });
      await tab.goto('http://127.0.0.1:5173/' + page, { waitUntil: 'domcontentloaded' });
      await tab.waitForFunction(() => typeof requireAccount === 'function');
      await tab.evaluate(() => requireAccount('profile'));

      assert.equal(await tab.isVisible('#signupOtpStep'), true, page + ': code step must come back');
      assert.equal(await tab.isHidden('#signupFields'), true, page + ': signup fields must be hidden');
      assert.match(await tab.textContent('#signupOtpError'), /resume-qa@example\.com/);

      // Confirm with the stubbed service: no password is kept, so the login form takes over.
      await tab.fill('#signupOtpCode', '123456');
      await tab.click('#signupOtpStep [data-click="confirmSignupCode"]');
      await tab.waitForFunction(() => document.getElementById('signupOtpStep').hidden);
      assert.equal(await tab.inputValue('#loginEmail'), 'resume-qa@example.com');
      assert.match(await tab.textContent('#loginError'), /prêt|ready/);
      assert.equal(await tab.evaluate(() => localStorage.getItem('bst-pending-signup')), null, page + ': saved signup must be cleared');

      // Start over from a resumed signup.
      await tab.evaluate(() => {
        localStorage.setItem('bst-pending-signup', JSON.stringify({ email: 'resume-qa@example.com', userId: '00000000-0000-4000-8000-000000000000', savedAt: Date.now() }));
        closeModal('accountModal');
        requireAccount('profile');
      });
      assert.equal(await tab.isVisible('#signupOtpStep'), true);
      await tab.click('#signupOtpStep [data-click="cancelSignupCode"]');
      assert.equal(await tab.isVisible('#signupFields'), true, page + ': signup form must return');
      assert.equal(await tab.evaluate(() => localStorage.getItem('bst-pending-signup')), null);

      // An expired saved signup is ignored.
      await tab.evaluate(() => {
        localStorage.setItem('bst-pending-signup', JSON.stringify({ email: 'old@example.com', userId: '00000000-0000-4000-8000-000000000000', savedAt: Date.now() - 2 * 60 * 60 * 1000 }));
        closeModal('accountModal');
        requireAccount('profile');
      });
      assert.equal(await tab.isHidden('#signupOtpStep'), true, page + ': expired signup must not resume');

      await tab.evaluate(() => {
        setLang('en');
        Captcha.token = async () => 'stubbed-token';
      });
      await tab.fill('#accountName', 'Signup check');
      await tab.fill('#accountEmail', 'existing@example.com');
      await tab.fill('#accountPassword', 'local-fixture-password');
      await tab.fill('#accountPasswordConfirm', 'local-fixture-password');
      await tab.check('#accountTermsConsent');
      const createAccount = tab.locator('#signupSubmitRow button');
      await createAccount.click();
      await tab.getByRole('button', { name: 'Go to sign in' }).click();
      assert.equal(await tab.inputValue('#loginEmail'), 'existing@example.com');
      assert.equal(await tab.evaluate(() => document.activeElement.id), 'loginEmail');
      assert.equal(await tab.isHidden('#signupOtpStep'), true);

      await tab.fill('#accountEmail', 'new@example.com');
      await createAccount.click();
      await tab.locator('#signupOtpStep').waitFor();
      const resend = tab.locator('[data-click="resendSignupCode"]');
      await resend.click();
      await tab.getByText('The code could not be resent. Please try again shortly.').waitFor();
      assert.equal(await resend.isEnabled(), true);
      assert.equal(await tab.isVisible('#signupOtpStep'), true);
      await context.close();
      console.log('PASS ' + page);
    }
  } catch (error) { failed = true; console.error(error); }
  await browser.close();
  process.exitCode = failed ? 1 : 0;
})();
