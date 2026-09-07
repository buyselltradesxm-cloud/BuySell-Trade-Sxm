/**
 * Smoke test for the PWA setup: serves the repo over HTTP and drives Chromium
 * (via Playwright) to verify the manifest, icons, service-worker registration
 * and the offline fallback.
 *
 * Run: node scripts/pwa-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 4599;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const base = `http://localhost:${PORT}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror] ' + e.message));
  page.on('requestfailed', (r) => console.log('  [reqfailed] ' + r.url() + ' — ' + (r.failure() && r.failure().errorText)));

  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // --- manifest ---
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
  check('manifest <link> present', manifestHref === '/manifest.webmanifest', manifestHref || 'missing');

  const mres = await page.request.get(base + '/manifest.webmanifest');
  let manifest = null;
  try { manifest = await mres.json(); } catch (e) {}
  check('manifest parses as JSON', !!manifest);
  check('manifest has name + start_url + standalone',
    manifest && manifest.name && manifest.start_url && manifest.display === 'standalone',
    manifest ? `${manifest.name} / ${manifest.start_url} / ${manifest.display}` : '');

  // --- icons resolve ---
  const iconList = (manifest && manifest.icons) || [];
  let iconOk = iconList.length > 0;
  for (const ic of iconList) {
    const r = await page.request.get(base + ic.src);
    if (!r.ok()) { iconOk = false; check('icon ' + ic.src, false, 'HTTP ' + r.status()); }
  }
  if (iconOk) check('all manifest icons resolve (' + iconList.length + ')', true);
  const hasMaskable = iconList.some((i) => (i.purpose || '').includes('maskable'));
  const has512 = iconList.some((i) => i.sizes === '512x512');
  check('has 512px + maskable icon', hasMaskable && has512);

  for (const p of ['/icons/apple-touch-icon.png', '/icons/favicon-32.png']) {
    const r = await page.request.get(base + p);
    check('resolves ' + p, r.ok(), 'HTTP ' + r.status());
  }

  // --- apple / theme meta ---
  const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content').catch(() => null);
  check('theme-color meta present', !!themeColor, themeColor || '');
  const appleIcon = await page.getAttribute('link[rel="apple-touch-icon"]', 'href').catch(() => null);
  check('apple-touch-icon link present', !!appleIcon, appleIcon || '');

  // --- service worker ---
  const swReg = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no SW support' };
    try {
      const reg = await navigator.serviceWorker.ready;
      return { ok: !!reg, scope: reg.scope, active: !!reg.active };
    } catch (e) { return { ok: false, reason: String(e) }; }
  });
  check('service worker registers + activates', swReg.ok && swReg.active,
    swReg.ok ? 'scope ' + swReg.scope : swReg.reason);

  // Give the SW a beat to finish precaching.
  await page.waitForTimeout(1500);
  const cacheNames = await page.evaluate(() => caches.keys());
  check('cache storage populated', cacheNames.length > 0, cacheNames.join(', '));

  // --- offline fallback ---
  await ctx.setOffline(true);
  const offlineResp = await page.goto(base + '/some-page-that-needs-network', { waitUntil: 'load' }).catch(() => null);
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
  check('offline navigation serves a cached page (not browser error)',
    !!offlineResp || /hors ligne|offline|connexion|Buy Sell Trade/i.test(bodyText),
    (bodyText || '').slice(0, 60).replace(/\n/g, ' '));
  await ctx.setOffline(false);

  await browser.close();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
