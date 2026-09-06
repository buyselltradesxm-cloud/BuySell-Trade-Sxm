const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      state.user = normalizeUser({
        id: "qa-sub-personal",
        name: "QA Personal",
        email: "qa-personal@example.com",
        accountType: "personal",
        accountPlan: "personal-free",
        subscriptionStatus: "free"
      });
      render();
      openProfile();
    });

    const personalText = await page.locator("#profileModal.open").innerText();
    if (!/Mon abonnement|My subscription/.test(personalText)) errors.push(`${path}: missing subscription section for personal account`);
    if (!/5/.test(personalText)) errors.push(`${path}: missing personal monthly limit`);
    if (!/Le 1er du mois|1st of the month/.test(personalText)) errors.push(`${path}: missing personal renewal reset text`);

    await page.locator("#profileModal.open").getByRole("button", { name: /Changer de plan|Change plan/i }).click();
    const pricingOpen = await page.locator("#boostModal.open").count();
    if (!pricingOpen) errors.push(`${path}: change plan did not open pricing`);
    await page.evaluate(() => closeModal("boostModal"));

    await page.evaluate(() => {
      state.user = normalizeUser({
        id: "qa-sub-pro",
        name: "QA Pro",
        email: "qa-pro@example.com",
        accountType: "business",
        accountPlan: "pro-business",
        subscriptionStatus: "active",
        subscriptionStarted: "2026-09-01T12:00:00.000Z",
        subscriptionCurrentPeriodEnd: "2026-10-01T12:00:00.000Z"
      });
      const existing = L.find(l => l.ownerId === state.user.id);
      if (!existing) {
        L.unshift({
          id: "qa-sub-pro-listing",
          ownerId: state.user.id,
          sellerId: state.user.id,
          t: "QA Pro listing",
          cat: "elec",
          area: "Philipsburg",
          side: "nl",
          cond: "tbe",
          cur: "usd",
          eur: 10,
          usd: 11,
          ph: 1,
          createdAt: "2026-09-05T12:00:00.000Z"
        });
      }
      render();
      openProfile();
    });

    const proText = await page.locator("#profileModal.open").innerText();
    if (!/Pro Business/.test(proText)) errors.push(`${path}: missing Pro plan label`);
    if (!/1 \/ 30/.test(proText)) errors.push(`${path}: missing Pro listing quota`);
    if (!/01 oct\. 2026|Oct 01, 2026|Oct 1, 2026/.test(proText)) errors.push(`${path}: missing Pro renewal date`);

    await page.locator("#profileModal.open").getByRole("button", { name: /Gérer \/ annuler|Manage \/ cancel/i }).click();
    const toast = await page.locator("#toast").innerText({ timeout: 2000 }).catch(() => "");
    if (!/Stripe|Billing/i.test(toast)) errors.push(`${path}: manage subscription did not explain Stripe Billing`);

    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
