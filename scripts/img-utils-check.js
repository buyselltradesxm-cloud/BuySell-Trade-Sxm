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

    // Same photo, thumb forced to JPEG, and thumb asked for in a type no
    // browser can encode (what Safari does with WebP).
    // Size comparison on a smooth, photo-like image: on pure noise neither
    // codec can win, so WebP-vs-JPEG there is a coin toss.
    const sc = document.createElement('canvas'); sc.width = 2000; sc.height = 1500;
    const sctx = sc.getContext('2d');
    const grad = sctx.createLinearGradient(0, 0, 2000, 1500); grad.addColorStop(0, '#1d6fa5'); grad.addColorStop(1, '#f2c14e');
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 2000, 1500);
    for (let i = 0; i < 60; i++) { sctx.fillStyle = `hsl(${i * 37 % 360},60%,50%)`; sctx.beginPath(); sctx.arc(i * 97 % 2000, i * 53 % 1500, 40 + i % 90, 0, 7); sctx.fill(); }
    const smooth = await new Promise((res) => sc.toBlob((b) => res(new File([b], 'smooth.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.95));
    const rWebpSmooth = await window.ImgUtils.compressForListing(smooth);
    const rJpeg = await window.ImgUtils.compressForListing(smooth, { thumbMime: 'image/jpeg', thumbQuality: 0.68 });
    const rUnsupported = await window.ImgUtils.compressForListing(big, { thumbMime: 'image/x-not-a-real-type' });

    // Portrait photo: card crops it to fill, so its WIDTH must reach 480 too.
    const rPortrait = await window.ImgUtils.compressForListing(await makePhoto(1500, 3000));

    return {
      portraitThumb: rPortrait.thumbWidth + 'x' + rPortrait.thumbHeight,
      smallThumb: rs.thumbWidth + 'x' + rs.thumbHeight,
      webpSmoothThumbBytes: rWebpSmooth.thumbBytes,
      thumbType: r.thumbFile.type,
      thumbName: r.thumbFile.name,
      jpegThumbBytes: rJpeg.thumbBytes,
      fallbackThumbType: rUnsupported.thumbFile.type,
      fallbackThumbName: rUnsupported.thumbFile.name,
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
      thumbIsFile: r.thumbFile instanceof File,
      thumbBytes: r.thumbBytes,
      thumbW: r.thumbWidth, thumbH: r.thumbHeight,
      thumbAspectKept: Math.abs((r.thumbWidth / r.thumbHeight) - (4032 / 3024)) < 0.02,
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
  check('thumb output is a File', out.thumbIsFile);
  check('thumb shortest edge is 480', out.thumbW === 640 && out.thumbH === 480, out.thumbW + 'x' + out.thumbH);
  check('portrait thumb is 480 wide (sharp on a card)', out.portraitThumb === '480x960', out.portraitThumb);
  check('tiny photo thumb is not upscaled', out.smallThumb === '320x240', out.smallThumb);
  check('thumb aspect ratio preserved', out.thumbAspectKept);
  check('thumb much smaller than full photo', out.thumbBytes < out.outBytes, out.thumbBytes + ' vs ' + out.outBytes + ' bytes');
  check('thumb encoded as WebP', out.thumbType === 'image/webp' && out.thumbName === 'thumb.webp', out.thumbType + ' ' + out.thumbName);
  check('WebP thumb smaller than the JPEG thumb', out.webpSmoothThumbBytes < out.jpegThumbBytes, out.webpSmoothThumbBytes + ' vs ' + out.jpegThumbBytes + ' bytes');
  check('unsupported thumb type falls back to JPEG', out.fallbackThumbType === 'image/jpeg' && out.fallbackThumbName === 'thumb.jpg', out.fallbackThumbType + ' ' + out.fallbackThumbName);

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
