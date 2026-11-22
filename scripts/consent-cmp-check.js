const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const scenario of ['google-eu', 'google-non-eu', 'fallback', 'late-google', 'ios']) {
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:5173/offline.html');
      await page.evaluate(scenario => {
        document.body.innerHTML = '';
        document.documentElement.lang = 'en';
        localStorage.clear();
        window.revocations = 0;
        window.Capacitor = { isNativePlatform: () => scenario === 'ios', getPlatform: () => 'ios' };
        if (scenario !== 'fallback') {
          window.googlefc = { callbackQueue: [], showRevocationMessage: () => window.revocations++ };
          window.__tcfapi = (command, version, callback) => {
            if (command === 'addEventListener') callback({ gdprApplies: scenario !== 'google-non-eu' }, true);
          };
        }
      }, scenario);
      await page.addScriptTag({ url: 'http://127.0.0.1:5173/consent.js' });
      if (scenario === 'late-google') {
        await page.evaluate(() => BstConsent.open());
        assert.equal(await page.locator('#bst-consent').count(), 1);
      }
      if (!['fallback', 'ios'].includes(scenario)) {
        await page.evaluate(() => {
          const callback = googlefc.callbackQueue.find(entry => entry.CONSENT_API_READY);
          window.cmpObservedReady = !!callback;
          if (callback) callback.CONSENT_API_READY();
        });
        assert.equal(await page.evaluate(() => cmpObservedReady), true, 'Google CMP readiness must be observed');
      }
      await page.evaluate(() => BstConsent.open());
      const google = ['google-eu', 'late-google'].includes(scenario);
      assert.equal(await page.evaluate(() => revocations), google ? 1 : 0, scenario);
      assert.equal(await page.locator('#bst-consent').count(), google || scenario === 'ios' ? 0 : 1, scenario);
      assert.equal(await page.evaluate(() => localStorage.getItem('bst_consent')), null, 'Opening choices must not grant consent');
      if (scenario === 'fallback') {
        await page.getByRole('button', { name: 'Decline', exact: true }).click();
        assert.equal(await page.evaluate(() => BstConsent.state()), 'denied');
      }
      console.log('PASS ' + scenario);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
