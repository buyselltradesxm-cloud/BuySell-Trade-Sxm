const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.APP_QA_BASE_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const route of ['/', '/marketplace.html']) {
      for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        const page = await context.newPage();
        const check = (name, pass) => { console.log(route, width, name, pass); if (!pass) failures.push(`${route} ${width}: ${name}`); };
        page.on('pageerror', error => failures.push(`${route} ${width}: ${error.message}`));
        await page.goto(base + route + '?local=1');
        await page.evaluate(() => {
          state.lang = 'en'; state.favs.clear(); resetFilters();
          L.splice(0, L.length,
            { id: 'qa-fav', sellerId: 'qa-seller', t: 'QA Phone', cat: 'elec', sub: 'phones', area: 'Marigot', side: 'fr', usd: 100, eur: 92, ph: 1, feat: true },
            { id: 'qa-other', sellerId: 'qa-seller', t: 'QA Sofa', cat: 'meub', area: 'Marigot', side: 'fr', usd: 200, eur: 184, ph: 2 });
          render();
        });
        const favorite = page.locator('#grid .fav').first();
        await favorite.focus();
        await page.keyboard.press('Enter');
        check('keyboard favorite does not open listing', await page.locator('#detailModal.open').count() === 0);
        check('keyboard favorite saves item', await page.evaluate(() => state.favs.has('qa-fav')));
        await page.evaluate(() => { closeModal('detailModal'); state.favs.clear(); render(); });
        await page.locator('#grid .fav').first().click();
        check('featured and grid favorites stay in sync', await page.evaluate(() => [...document.querySelectorAll('[data-click="toggleFav"]')].filter(b => JSON.parse(b.dataset.clickArgs)[0] === 'qa-fav').every(b => b.getAttribute('aria-pressed') === 'true')));
        check('saved favorite announces removal action', /remove/i.test(await page.locator('#grid .fav').first().getAttribute('aria-label')));
        await page.evaluate(() => filterByCategory('elec'));
        await page.locator('#q').fill('Sofa');
        await page.locator('#q').press('Enter');
        check('search resets category highlight', await page.evaluate(() => state.cat === 'all' && document.querySelector('#catrail .cat[aria-pressed="true"]')?.dataset.clickArgs.includes('all')));
        check('search hides stale subcategories', await page.locator('#subcatPanel.show').count() === 0);
        await page.evaluate(() => {
          resetFilters(); filterByArea('Marigot');
        });
        check('area filter stays synchronized', await page.locator('#filterArea').inputValue() === 'Marigot');
        await page.evaluate(() => {
          resetFilters(); state.favs.clear(); state.favs.add('qa-fav'); filterByCategory('meub'); scrollFavs();
        });
        check('favorites remain reachable outside current filters', await page.locator('#grid .fav[aria-pressed="true"]').count() > 0);
        await page.evaluate(() => { resetFilters(); });
        await page.locator('#grid .card').first().focus();
        await page.keyboard.press('Enter');
        check('keyboard card still opens listing', await page.locator('#detailModal.open').count() === 1);
        await context.close();
      }
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
