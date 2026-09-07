/**
 * Unit-ish test for img-utils.js — runs the module in real Chromium (Playwright)
 * against a synthetic large photo.
 *
 * Run: node scripts/img-utils-check.js
 */
const path = require('path');
const { chromium } = require('playwright');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(__dirname, '..', 'img-utils.js') });

  const out = await page.evaluate(async () => {
    // Build a noisy 4032x3024 image (JPEG-incompressible) -> File.
    function makePhoto(w, h) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = Math.random() * 255;
        img.data[i + 1] = Math.random() * 255;
        img.data[i + 2] = Math.random() * 255;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return new Promise((res) => c.toBlob((b) => res(new File([b], 'IMG_1234.JPEG', { type: 'image/jpeg' })), 'image/jpeg', 0.98));
    }

    const big = await makePhoto(4032, 3024);
    const r = await window.ImgUtils.compressForListing(big, { maxEdge: 1600, quality: 0.82 });

    // A genuinely tiny image should pass through untouched.
    const small = await makePhoto(320, 240);
    const rs = await window.ImgUtils.compressForListing(small, { maxEdge: 1600 });

    return {
      inBytes: big.size,
      outBytes: r.bytes,
      outW: r.width, outH: r.height,
      isFile: r.file instanceof File,
      outName: r.file.name,
      outType: r.file.type,
      optimized: r.optimized,
      aspectKept: Math.abs((r.width / r.height) - (4032 / 3024)) < 0.02,
      smallOptimized: rs.optimized,
      smallW: rs.width,
    };
  });

  console.log('  (in ' + (out.inBytes / 1048576).toFixed(1) + ' MB -> out ' + (out.outBytes / 1024).toFixed(0) + ' KB, ' + out.outW + 'x' + out.outH + ')');

  check('longest edge capped at 1600', out.outW === 1600 && out.outH <= 1600, out.outW + 'x' + out.outH);
  check('aspect ratio preserved', out.aspectKept);
  check('output smaller than input', out.outBytes < out.inBytes);
  check('output is a File', out.isFile);
  check('output renamed to .jpg', /\.jpg$/i.test(out.outName), out.outName);
  check('output type image/jpeg', out.outType === 'image/jpeg', out.outType);
  check('large photo flagged optimized', out.optimized === true);
  check('tiny photo passes through (not optimized)', out.smallOptimized === false);
  check('tiny photo keeps its size', out.smallW === 320, String(out.smallW));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
