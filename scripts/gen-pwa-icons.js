/**
 * Generate PWA icons from BuySellTradeSxm.Logo.png using the Chromium that
 * ships with Playwright (no image library needed — we render + screenshot).
 *
 * Outputs to ./icons/ :
 *   icon-192.png, icon-512.png            -> purpose "any"  (logo as-is, white bg)
 *   icon-maskable-192.png, -512.png       -> purpose "maskable" (logo padded on brand navy)
 *   apple-touch-icon.png (180)            -> iOS home screen
 *   favicon-32.png, favicon-16.png        -> browser tab
 *
 * Run: node scripts/gen-pwa-icons.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'BuySellTradeSxm.Logo.png');
const OUT = path.join(ROOT, 'icons');

// The source logo is a circular badge on a solid white field, so every icon
// keeps a white background — maskable variants just add safe-zone padding so a
// circular OS mask crops the white corners, not the badge.
const TARGETS = [
  { name: 'icon-192.png',            size: 192, pad: 0,    bg: '#FFFFFF' },
  { name: 'icon-512.png',            size: 512, pad: 0,    bg: '#FFFFFF' },
  { name: 'icon-maskable-192.png',   size: 192, pad: 0.08, bg: '#FFFFFF' },
  { name: 'icon-maskable-512.png',   size: 512, pad: 0.08, bg: '#FFFFFF' },
  { name: 'apple-touch-icon.png',    size: 180, pad: 0.04, bg: '#FFFFFF' },
  { name: 'favicon-32.png',          size: 32,  pad: 0,    bg: '#FFFFFF' },
  { name: 'favicon-16.png',          size: 16,  pad: 0,    bg: '#FFFFFF' },
];

(async () => {
  if (!fs.existsSync(SRC)) throw new Error('Missing ' + SRC);
  fs.mkdirSync(OUT, { recursive: true });

  const b64 = fs.readFileSync(SRC).toString('base64');
  const dataUri = `data:image/png;base64,${b64}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const t of TARGETS) {
    const inset = Math.round(t.size * t.pad);
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(`<!doctype html><html><head><style>
      html,body{margin:0;padding:0}
      .frame{width:${t.size}px;height:${t.size}px;background:${t.bg};
        display:flex;align-items:center;justify-content:center;overflow:hidden}
      .frame img{width:${t.size - inset * 2}px;height:${t.size - inset * 2}px;
        object-fit:contain;display:block}
    </style></head><body>
      <div class="frame"><img src="${dataUri}"></div>
    </body></html>`, { waitUntil: 'load' });
    await page.locator('.frame img').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, t.name), clip: { x: 0, y: 0, width: t.size, height: t.size } });
    console.log('  wrote icons/' + t.name + '  (' + t.size + 'px)');
  }

  await browser.close();
  console.log('done.');
})().catch((e) => { console.error(e); process.exit(1); });
