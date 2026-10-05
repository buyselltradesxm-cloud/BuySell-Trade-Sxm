const assert = require("node:assert/strict");
const { chromium } = require("playwright");

// Public browsing only, in isolated signed-out contexts. No signup, listing
// write, messages, reports, or payments are submitted by this check.
const base = process.env.APP_QA_BASE_URL || "https://buyselltradesxm.com";
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const errors = [];
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      for (const route of ["/", "/marketplace.html"]) {
        const label = `${route} ${viewport.width}px`;
        const context = await browser.newContext({ viewport, serviceWorkers: "block" });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on("pageerror", error => errors.push(`${label}: ${error.message}`));
        try {
          const listingResponse = page.waitForResponse(response => response.url().includes("/rest/v1/listings?select=*&"), { timeout: 20000 });
          await page.goto(`${base}${route}?launch-qa=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          const response = await listingResponse;
          assert.equal(response.status(), 200, "Public listings request must succeed");
          const listings = await response.json();
          assert.ok(Array.isArray(listings), "Public listings response must be an array");
          await page.waitForFunction(() => window.SB?.enabled() && typeof openListing === "function", null, { timeout: 10000 });
          assert.ok(await page.locator("#q").isVisible(), "Search input must be visible");
          if (listings.length) {
            await page.waitForFunction(id => L.some(listing => String(listing.id) === id), String(listings[0].id));
            const keyword = listings[0].title.split(/\s+/)[0];
            await page.locator("#q").fill(keyword);
            await page.locator("#q").press("Enter");
            await page.locator('#grid [data-click="openListing"]').first().click();
            await page.locator("#detailModal.open").waitFor();
            assert.ok((await page.locator("#detailTitle").innerText()).trim(), "Listing detail must have a title");
            await page.keyboard.press("Escape");
          }
          // Check the login UI renders; completing authentication is a separate
          // acceptance test with two real disposable accounts.
          await page.locator('button[data-click="openProfile"]:visible').first().click();
          await page.locator("#accountModal.open").waitFor();
          assert.ok(await page.locator("#loginEmail").isVisible(), "Email login must be available");
          await page.keyboard.press("Escape");
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
          assert.equal(overflow, false, "Page must not overflow horizontally");
          results.push({ label, publicListings: listings.length, browsing: "passed", loginUi: "passed" });
        } catch (error) {
          errors.push(`${label}: ${error.message}`);
        } finally {
          await context.close();
        }
      }
    }
    console.log(JSON.stringify({ base, coverage: "live public browsing; no authenticated writes or payments", results, errors }, null, 2));
    assert.equal(errors.length, 0);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
