// iPad Air 11-inch (M3): 1640x2360 physical pixels at 2x scale.
// WebKit emulation checks the website; it does not run the signed iOS app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit, devices } = require('playwright');

(async () => {
  const browser = await webkit.launch();
  const output = path.join(__dirname, 'artifacts', 'ipad-air');
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  try {
    for (const [orientation, width, height] of [['portrait', 820, 1180], ['landscape', 1180, 820]]) {
      const context = await browser.newContext({
        ...devices['iPad Pro 11'], viewport: { width, height },
        screen: { width, height }, deviceScaleFactor: 2, serviceWorkers: 'block'
      });
      try {
        for (const route of ['/', '/marketplace.html']) {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto('https://buyselltradesxm.com' + route, { waitUntil: 'load' });
          await page.waitForFunction(() => typeof openProfile === 'function' && window.SB?.enabled());
          await page.locator('#grid [data-click="openListing"]').first().waitFor();
          const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scale: devicePixelRatio, touch: navigator.maxTouchPoints }));
          assert.equal(size.width, width);
          assert.equal(size.height, height);
          assert.equal(size.scale, 2);
          const prefix = (route === '/' ? 'index' : 'marketplace') + '-' + orientation;
          await page.screenshot({ path: path.join(output, prefix + '-discover.png') });
          await page.locator('#profileBtn').tap();
          await page.locator('#accountModal.open').waitFor();
          await page.locator('[data-click="scrollAccountSection"][data-click-args*="signInAccount"]').tap();
          assert.ok(await page.locator('#loginEmail').isVisible());
          await page.screenshot({ path: path.join(output, prefix + '-profile.png') });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
          assert.deepEqual(errors, []);
          results.push({ route, orientation, ...size, profile: 'passed', discover: 'passed' });
          await page.close();
        }
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
