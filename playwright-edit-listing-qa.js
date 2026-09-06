const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      state.user = normalizeUser({
        id: "qa-edit-user",
        name: "QA Edit Seller",
        email: "qa-edit@example.com",
        accountType: "personal",
        accountPlan: "personal-free",
        subscriptionStatus: "free"
      });
      L.unshift({
        id: "qa-edit-listing",
        ownerId: state.user.id,
        sellerId: state.user.id,
        sellerName: state.user.name,
        t: "Original edit title",
        cat: "elec",
        sub: "phones",
        area: "Marigot",
        side: "fr",
        cond: "bon",
        cur: "usd",
        eur: 92,
        usd: 100,
        price: 100,
        delivery: "meetup",
        meetup: "public",
        negotiable: true,
        safeMeet: true,
        ph: 1,
        createdAt: new Date().toISOString(),
        photos: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80"]
      });
      render();
      openListing("qa-edit-listing");
    });

    await page.locator("#detailModal.open .detail-actions .secondary-btn", { hasText: /Modifier|Edit/i }).click();
    await page.locator("#postModal.open").waitFor({ timeout: 3000 });

    const submitLabel = await page.locator("#postSubmitBtn").innerText();
    if (!/Enregistrer|Save/.test(submitLabel)) errors.push(`${path}: edit form did not switch to save mode`);

    await page.locator("#newTitle").fill("Edited listing title");
    await page.locator("#newPrice").fill("125");
    await page.locator("#newDesc").fill("Updated seller description");
    await page.locator("#postSubmitBtn").click();
    await page.locator("#detailModal.open").waitFor({ timeout: 4000 });

    const result = await page.evaluate(() => {
      const listing = L.find(item => idKey(item.id) === "qa-edit-listing");
      return {
        title: listing && listing.t,
        usd: listing && listing.usd,
        eur: listing && listing.eur,
        desc: listing && listing.desc,
        count: L.filter(item => idKey(item.id) === "qa-edit-listing").length,
        detailTitle: document.querySelector("#detailTitle")?.textContent?.trim(),
        detailPriceText: document.querySelector(".detail-price")?.textContent?.trim() || ""
      };
    });

    if (result.title !== "Edited listing title") errors.push(`${path}: title was not updated`);
    if (result.usd !== 125) errors.push(`${path}: USD price was not updated`);
    if (result.eur !== 115) errors.push(`${path}: EUR conversion was not updated`);
    if (result.desc !== "Updated seller description") errors.push(`${path}: description was not updated`);
    if (result.count !== 1) errors.push(`${path}: edit created a duplicate listing`);
    if (result.detailTitle !== "Edited listing title") errors.push(`${path}: detail modal did not reopen edited listing`);
    if (!/\$125/.test(result.detailPriceText) || !/€115/.test(result.detailPriceText)) {
      errors.push(`${path}: detail price did not show both clean currencies: ${result.detailPriceText}`);
    }

    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
