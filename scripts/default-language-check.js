const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.APP_QA_BASE_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch();
  try {
    const initial = await browser.newContext({javaScriptEnabled: false, locale: 'fr-FR'});
    const initialPage = await initial.newPage();
    for (const route of ['/', '/marketplace.html']) {
      await initialPage.goto(base + route);
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
          await page.goto(base + route + '?local=1');
          const language = () => page.locator('html').getAttribute('lang');
          assert.equal(await language(), 'en', platform + ' must default to English even with a French device locale');
          assert.ok((await page.locator('#profileBtn').innerText()).includes(await page.evaluate(() => I18N.en.loginLabel)));
          assert.equal(await page.evaluate(() => state.langExplicit), false, 'Startup must not record an explicit choice');
          await page.evaluate(() => {
            const saved = JSON.parse(localStorage.getItem('bstsxm-state'));
            saved.lang = 'fr';
            delete saved.langExplicit;
            saved.favs = ['remember-me'];
            localStorage.setItem('bstsxm-state', JSON.stringify(saved));
            localStorage.setItem('bst_lang', 'fr');
          });
          await page.reload();
          assert.equal(await language(), platform === 'web' ? 'en' : 'fr', 'Migrate legacy web defaults while preserving native preferences');
          assert.equal(await page.evaluate(() => state.favs.has('remember-me')), true, 'Language migration must preserve saved items');
          const french = page.locator('.lang button').filter({hasText: /^FR$/});
          const english = page.locator('.lang button').filter({hasText: /^EN$/});
          await french.click();
          assert.equal(await language(), 'fr');
          assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bstsxm-state')).langExplicit), true);
          assert.equal(await page.evaluate(() => localStorage.getItem('bst_lang')), 'fr', 'Consent and ads share the selected language');
          assert.equal(await french.getAttribute('aria-pressed'), 'true');
          const tagline = page.locator('.brand-sub [data-en]').first();
          assert.equal(await tagline.innerText(), await tagline.getAttribute('data-fr'), 'French copy survives the English initial template');
          await page.reload();
          assert.equal(await language(), 'fr', 'Keep an explicitly chosen French preference');
          await english.click();
          const alternate = route === '/' ? '/marketplace.html' : '/';
          await page.goto(base + alternate + '?local=1');
          assert.equal(await language(), 'en', 'Share the English preference across both entry pages');
          assert.deepEqual(errors, []);
          console.log('PASS ' + platform + ' ' + locale + ' ' + route + ': English default, French switch and remembered preference');
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
