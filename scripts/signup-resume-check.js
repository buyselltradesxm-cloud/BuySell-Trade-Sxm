// Browser check: a signup left before the email code was entered comes back
// on the code step, and "Use a different email" returns to the signup form.
// Needs a local server on :5173. No request reaches the signup service.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  try {
    for (const page of ['index.html', 'marketplace.html']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      await context.route('**/functions/v1/signup-code', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ confirmed: true })
      }));
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
      await tab.fill('#signupOtpCode', '1234');
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
      await context.close();
      console.log('PASS ' + page);
    }
  } catch (error) { failed = true; console.error(error); }
  await browser.close();
  process.exitCode = failed ? 1 : 0;
})();
