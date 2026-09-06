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
      state.user = normalizeUser({
        id: "qa-inbox-user",
        name: "QA Inbox",
        email: "qa-inbox@example.com",
        accountType: "personal",
        accountPlan: "personal-free"
      });
      Object.keys(chatThreads).forEach(key => delete chatThreads[key]);
      for (let i = 1; i <= 30; i++) {
        const id = `qa-inbox-${i}`;
        L.unshift({
          id,
          ownerId: i % 2 ? state.user.id : `seller-${i}`,
          sellerId: i % 2 ? state.user.id : `seller-${i}`,
          seller: `Seller ${i}`,
          t: `Inbox listing ${i}`,
          cat: "elec",
          area: i % 2 ? "Marigot" : "Philipsburg",
          side: i % 2 ? "fr" : "nl",
          cond: "tbe",
          cur: "usd",
          eur: 10 + i,
          usd: 11 + i,
          ph: 1,
          createdAt: new Date().toISOString()
        });
        chatThreads[idKey(id)] = {
          seller: `Seller ${i}`,
          updated: "maintenant",
          messages: [
            { who: "seller", fr: `Bonjour message ${i}`, en: `Hello message ${i}`, at: "09:00" },
            { who: "buyer", fr: `Réponse test ${i}`, en: `Test reply ${i}`, at: "09:02" }
          ]
        };
      }
      render();
      openMessages();
    });

    const modal = page.locator("#messagesModal.open");
    await modal.waitFor({ timeout: 3000 });
    const box = await page.locator("#messagesModal.open .dialog.messenger").boundingBox();
    if (!box || box.width < 980 || box.height < 650) errors.push(`${path}: messenger modal is too small`);

    const items = await page.locator("#messagesModal.open .msgr-item").count();
    if (items < 25) errors.push(`${path}: inbox did not render many conversations`);

    const threadVisible = await page.locator("#messagesModal.open #msgrThread:not([hidden])").count();
    if (!threadVisible) errors.push(`${path}: first conversation did not auto-open on desktop`);

    await page.locator("#msgrSearch").fill("listing 22");
    const filtered = await page.locator("#messagesModal.open .msgr-item").count();
    const visibleText = await page.locator("#messagesModal.open #msgrRail").innerText();
    if (filtered !== 1 || !/Inbox listing 22/.test(visibleText)) errors.push(`${path}: inbox search did not filter conversations`);

    await page.locator("#messagesModal.open .msgr-item").first().click();
    await page.locator("#msgrInput").fill("Merci pour votre message");
    await page.locator("#msgrCompose button[type=submit]").click();
    const logText = await page.locator("#msgrLog").innerText();
    if (!/Merci pour votre message/.test(logText)) errors.push(`${path}: reply did not appear in thread`);

    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
