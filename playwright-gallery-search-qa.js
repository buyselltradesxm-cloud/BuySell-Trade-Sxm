const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const paths = ["/?listing=10", "/marketplace.html?listing=10"];
  const results = [];
  const errors = [];

  for (const path of paths) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", err => errors.push(`${path}: ${err.message}`));
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("400")) errors.push(`${path}: ${msg.text()}`);
    });
    page.on("requestfailed", req => errors.push(`${path}: ${req.url()} ${req.failure()?.errorText || ""}`));

    await page.goto(`http://localhost:5173${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#detailModal.open .gallery-thumb:nth-child(2)", { timeout: 7000 });
    await page.waitForTimeout(1000);

    const before = await page.evaluate(() => ({
      main: document.querySelector('[id^="mainPhoto-"]')?.src,
      thumbs: document.querySelectorAll(".gallery-thumb").length,
      loadedThumbs: [...document.querySelectorAll(".gallery-thumb img")].filter(img => img.naturalWidth > 0).length,
      broken: [...document.querySelectorAll("#detailModal img")]
        .filter(img => img.complete && img.naturalWidth === 0)
        .map(img => img.src)
    }));

    await page.click(".gallery-thumb:nth-child(2)");
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => ({
      main: document.querySelector('[id^="mainPhoto-"]')?.src,
      activeIndex: [...document.querySelectorAll(".gallery-thumb")].findIndex(el => el.classList.contains("active")) + 1,
      mainLoaded: document.querySelector('[id^="mainPhoto-"]')?.naturalWidth > 0
    }));

    await page.goto(`http://localhost:5173${path.startsWith("/marketplace") ? "/marketplace.html" : "/"}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#grid .card", { timeout: 7000 });
    await page.fill("#q", "car");
    await page.press("#q", "Enter");
    await page.waitForTimeout(800);
    const search = await page.evaluate(() => ({
      cards: document.querySelectorAll("#grid .card").length,
      titles: [...document.querySelectorAll("#grid .ttl")].map(n => n.textContent.trim()),
      allImagesLoaded: [...document.querySelectorAll("#grid .card img")].every(img => img.complete && img.naturalWidth > 0)
    }));

    if (before.thumbs < 2) errors.push(`${path}: expected multiple gallery thumbnails`);
    if (before.loadedThumbs !== before.thumbs) errors.push(`${path}: not all gallery thumbnails loaded`);
    if (before.broken.length) errors.push(`${path}: broken gallery image ${before.broken[0]}`);
    if (after.main === before.main) errors.push(`${path}: clicking a thumbnail did not change the main image`);
    if (after.activeIndex !== 2) errors.push(`${path}: clicked thumbnail did not become active`);
    if (!after.mainLoaded) errors.push(`${path}: selected main image did not load`);
    const expectedTitles = [
      "Suzuki Jimny 2019, clim, 62 000 km",
      "Renault Clio IV 2016, CT OK, 1re main",
      "Hyundai i10 automatique à louer - journée ou semaine",
      "Jantes 17\" + pneus été 205/45, jeu de 4"
    ];
    if (search.cards < expectedTitles.length) errors.push(`${path}: car search returned too few cards: ${search.cards}`);
    for (const expectedTitle of expectedTitles) {
      if (!search.titles.includes(expectedTitle)) errors.push(`${path}: car search missing "${expectedTitle}"`);
    }
    if (!search.allImagesLoaded) errors.push(`${path}: car search has unloaded images`);

    results.push({ path, gallery: before, selected: after, search });
    await page.close();
  }

  console.log(JSON.stringify({ errors, results }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
