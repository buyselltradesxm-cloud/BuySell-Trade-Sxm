const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const os = require('node:os');
const base = process.env.APP_QA_BASE_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const route of ['/', '/marketplace.html']) {
      for (const width of [390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        await page.route(/supabase\.co|googlesyndication\.com|google-analytics\.com/, request => request.abort());
        await page.goto(base + route + '?local=1');
        await page.waitForFunction(() => typeof gridCardsHTML === 'function' && window.Ads);
        for (const language of ['en', 'fr']) {
          for (const count of [0, 2, 3, 8, 30]) {
            await page.evaluate(({ count, language }) => {
              setLang(language);
              localStorage.setItem('bst_lang', language);
              document.documentElement.lang = language;
              resetFilters();
              L.splice(0, L.length, ...Array.from({ length: Math.max(1, count) }, (_, i) => ({
                id: 'ad-qa-' + i, sellerId: 'qa-seller', t: 'Island listing ' + i,
                cat: 'meub', area: 'Marigot', side: 'fr', usd: 100, eur: 92, ph: i + 1
              })));
              if (!count) state.q = '__no_matching_listing__';
              render();
              window.Ads.refresh();
            }, { count, language });
            const large = page.locator('#grid .feed-ad-large');
            assert.equal(await large.count(), count > 2 ? 1 : 0);
            if (count <= 2) continue;
            await large.scrollIntoViewIfNeeded();
            await page.waitForFunction(() => document.querySelector('#grid .feed-ad-large')?.dataset.adKind === 'house');
            const geometry = await large.evaluate(node => ({
              height: node.getBoundingClientRect().height,
              width: node.getBoundingClientRect().width,
              gridWidth: node.parentElement.getBoundingClientRect().width,
              preceding: Array.from(node.parentElement.children).slice(0, Array.from(node.parentElement.children).indexOf(node)).filter(el => el.matches('.card')).length,
              label: node.getAttribute('aria-label'),
              overflow: document.documentElement.scrollWidth > innerWidth
            }));
            assert.ok(geometry.height >= 300);
            assert.ok(Math.abs(geometry.width - geometry.gridWidth) < 2);
            assert.equal(geometry.preceding, count <= 4 ? 2 : count <= 12 ? 4 : 8);
            assert.equal(geometry.label, language === 'fr' ? 'Publicité' : 'Sponsored');
            assert.equal(geometry.overflow, false);
            if (count === 30) {
              await page.evaluate(() => { showMoreListings(); window.Ads.refresh(); });
              assert.equal(await large.count(), 1, 'pagination must not duplicate the large section');
            }
          }
        }
        // Exercise the existing house action using the keyboard.
        await page.evaluate(() => {
          window.__adActivated = false;
          for (const name of ['openBoostInfo', 'openPricingInfo', 'openPostModal']) window[name] = () => { window.__adActivated = true; };
        });
        await page.locator('#grid .feed-ad-large button').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => window.__adActivated), true);
        const file = path.join(process.env.APP_QA_SCREENSHOT_DIR || os.tmpdir(), `bstsxm-large-feed-ad-${width}.jpg`);
        if (route === '/') {
          await page.locator('#grid .feed-ad-large button').blur();
          await page.locator('#grid .feed-ad-large').evaluate(node => node.scrollIntoView({ block: 'center' }));
          await page.screenshot({ path: file });
        }
        await page.evaluate(() => {
          const config = window.Ads.config();
          config.house.enabled = false;
          config.adsense.slots.feed = '';
          render();
          window.Ads.refresh();
        });
        await page.locator('#grid .feed-ad-large').evaluate(node => node.scrollIntoView({ block: 'center' }));
        await page.waitForFunction(() => document.querySelector('#grid .feed-ad-large')?.dataset.adState === 'empty');
        assert.equal(await page.locator('#grid .feed-ad-large').isVisible(), false, 'no fill collapses the section');
        await page.close();
        console.log(`PASS ${route} ${width}: FR/EN, empty/short/long feeds, pagination, fallback, keyboard, layout`);
      }
      const nativePage = await browser.newPage({ serviceWorkers: 'block' });
      await nativePage.addInitScript(() => { window.__BST_NATIVE_ADS__ = true; });
      await nativePage.route(/supabase\.co|googlesyndication\.com|google-analytics\.com/, request => request.abort());
      await nativePage.goto(base + route + '?local=1');
      await nativePage.waitForFunction(() => window.Ads && typeof render === 'function');
      await nativePage.evaluate(() => {
        resetFilters();
        L.splice(0, L.length, ...Array.from({ length: 16 }, (_, i) => ({
          id: 'native-ad-qa-' + i, sellerId: 'qa-seller', t: 'Island listing ' + i,
          cat: 'meub', area: 'Marigot', side: 'fr', usd: 100, eur: 92, ph: i + 1
        })));
        render();
        window.Ads.refresh();
      });
      await nativePage.locator('#grid .feed-ad-large').evaluate(node => node.scrollIntoView({ block: 'center' }));
      await nativePage.waitForFunction(() => document.querySelector('#grid .feed-ad-large')?.dataset.adState === 'empty');
      assert.equal(await nativePage.locator('#grid .feed-ad-large .ad-unit').count(), 0,
        'native AdMob placement must never show the web promotional/network fallback');
      assert.equal(await nativePage.locator('#grid .feed-ad-large').isVisible(), false);
      console.log(`PASS ${route}: native placement excludes web promos, campaigns and AdSense`);
      await nativePage.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
