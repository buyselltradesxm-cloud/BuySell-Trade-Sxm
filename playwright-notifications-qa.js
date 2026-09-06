const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      state.lang = "fr";
      state.user = normalizeUser({
        id: "qa-notif-user",
        name: "QA Notifications",
        email: "qa-notifications@example.com",
        accountType: "personal",
        accountPlan: "personal-free",
        subscriptionStatus: "free"
      });
      notifications = [];
      dismissedNotificationIds = new Set();
      L.unshift({
        id: "qa-expiring-listing",
        ownerId: state.user.id,
        sellerId: state.user.id,
        seller: state.user.name,
        t: "Annonce bientot expiree QA",
        cat: "elec",
        area: "Marigot",
        side: "fr",
        cond: "tbe",
        cur: "usd",
        eur: 100,
        usd: 108,
        ph: 1,
        status: "active",
        sold: false,
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
      });
      render();
    });

    const badgeVisible = await page.locator("#notifCount").isVisible();
    const badgeText = await page.locator("#notifCount").innerText().catch(() => "0");
    if (!badgeVisible || Number(badgeText) < 1) errors.push(`${path}: notification badge did not show expiring listing`);

    await page.locator("#notifBtn").click();
    const panelText = await page.locator("#notifPanel").innerText();
    if (!/Annonce bientôt expirée|Annonce bientot expiree QA/.test(panelText)) {
      errors.push(`${path}: notification panel did not show listing expiry alert`);
    }

    await page.locator("#notifPanel .notif-item").first().click();
    const detailOpen = await page.locator("#detailModal.open").count();
    const detailText = detailOpen ? await page.locator("#detailModal.open").innerText() : "";
    if (!detailOpen || !/Annonce bientot expiree QA/.test(detailText)) {
      errors.push(`${path}: clicking expiry notification did not open the listing`);
    }

    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
