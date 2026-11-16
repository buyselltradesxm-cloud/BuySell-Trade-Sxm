const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const initial = await browser.newContext({javaScriptEnabled: false, locale: 'fr-FR'});
    const initialPage = await initial.newPage();
    for (const route of ['/', '/marketplace.html']) {
      await initialPage.goto('http://127.0.0.1:5173' + route);
      assert.equal(await initialPage.locator('html').getAttribute('lang'), 'en');
      assert.equal(await initialPage.locator('#profileBtnLabel').innerText(), 'Profile');
      assert.ok((await initialPage.locator('#q').getAttribute('placeholder')).includes('looking'));
      console.log('PASS initial English HTML before JavaScript: ' + route);
    }
    await initial.close();
    for (const platform of ['web', 'ios', 'android']) {
      for (const locale of ['en-US', 'fr-FR']) {
        for (const route of ['/', '/marketplace.html']) {
          const context = await browser.newContext({locale, serviceWorkers: 'block'});
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.route('**/*', request => {
            const url = new URL(request.request().url());
            if (url.hostname !== '127.0.0.1' || ['/admob-plugin.js', '/native-admob.js'].includes(url.pathname)) {
              return request.fulfill({status: 200, body: ''});
            }
            return request.continue();
          });
          if (platform !== 'web') await page.addInitScript(platform => {
            window.CapacitorCustomPlatform = {name: platform};
            window.SXMNativeInfo = {shell: 5, tabs: true};
            window.Capacitor = {
              getPlatform: () => platform, isNativePlatform: () => true,
              isPluginAvailable: () => false,
              Plugins: {SXMNative: {setTabs: async () => {}, ready: async () => {}, products: async () => ({products: []})}}
            };
          }, platform);
          await page.goto('http://127.0.0.1:5173' + route + '?local=1');
          const language = () => page.locator('html').getAttribute('lang');
          assert.equal(await language(), 'en', platform + ' must default to English even with a French device locale');
          assert.ok((await page.locator('#profileBtn').innerText()).includes(await page.evaluate(() => I18N.en.loginLabel)));
          const french = page.locator('.lang button').filter({hasText: /^FR$/});
          const english = page.locator('.lang button').filter({hasText: /^EN$/});
          await french.click();
          assert.equal(await language(), 'fr');
          assert.equal(await french.getAttribute('aria-pressed'), 'true');
          const tagline = page.locator('.brand-sub [data-en]').first();
          assert.equal(await tagline.innerText(), await tagline.getAttribute('data-fr'), 'French copy survives the English initial template');
          await page.reload();
          assert.equal(await language(), 'fr', 'Keep an explicitly chosen French preference');
          await english.click();
          const alternate = route === '/' ? '/marketplace.html' : '/';
          await page.goto('http://127.0.0.1:5173' + alternate + '?local=1');
          assert.equal(await language(), 'en', 'Share the English preference across both entry pages');
          assert.deepEqual(errors, []);
          console.log('PASS ' + platform + ' ' + locale + ' ' + route + ': English default, French switch and remembered preference');
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
