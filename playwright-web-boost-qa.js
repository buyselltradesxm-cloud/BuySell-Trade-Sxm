const { chromium } = require("playwright");

// Buying a boost on the website: the Buy button asks the server for a Stripe
// Checkout page for the right listing and duration, and the return from
// Stripe is confirmed to the user and removed from the address bar.
// Supabase and Stripe are stubbed; the payment itself is applied by the
// stripe-webhook function and supabase/stripe-boosts.sql, not exercised here.
(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.addInitScript(() => {
      // sessionStorage survives the simulated return from Stripe below.
      if (!sessionStorage.getItem("qaBoostCalls")) localStorage.clear();
    });
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil: "domcontentloaded" });

    await page.evaluate(returnPath => {
      state.user = normalizeUser({
        id: "qa-boost-user", name: "QA Boost", email: "qa-boost@example.com",
        accountType: "personal", accountPlan: "personal-free"
      });
      state.user.provider = "supabase";
      L.unshift({
        id: 987654, ownerId: state.user.id, sellerId: state.user.id, seller: "QA Boost",
        t: "Boost test listing", cat: "elec", area: "Marigot", side: "fr", cond: "tbe",
        cur: "usd", eur: 10, usd: 11, ph: 1, createdAt: new Date().toISOString()
      });
      window.SB = Object.assign(window.SB || {}, {
        enabled: () => true,
        createBoostCheckout: async (listingId, days) => {
          sessionStorage.setItem("qaBoostCalls", JSON.stringify([String(listingId), days]));
          return { data: { url: `http://localhost:5173${returnPath}?local=1&boost=success` }, error: null };
        }
      });
      render();
      openBoostCheckout(987654);
    }, path);

    await page.locator("#boostCheckoutModal.open").waitFor({ timeout: 3000 });
    await page.locator('#boostCheckoutModal .boost-plan-choice[data-click-args^="[14"]').click();
    const amount = await page.locator("#boostCheckoutAmount").innerText();
    if (!/20/.test(amount)) errors.push(`${path}: 14-day boost should show $20, got ${amount}`);

    // Buying sends the visitor to the checkout URL the server returned.
    await Promise.all([
      page.waitForURL(/boost=success|local=1$/, { timeout: 8000 }).catch(() => errors.push(`${path}: buying a boost did not open checkout`)),
      page.locator('#boostCheckoutModal form button[type="submit"]').click()
    ]);
    await page.waitForFunction(() => !new URLSearchParams(location.search).has("boost"), null, { timeout: 5000 })
      .catch(() => errors.push(`${path}: boost=success was not removed from the address bar`));

    const calls = await page.evaluate(() => sessionStorage.getItem("qaBoostCalls"));
    if (calls !== JSON.stringify(["987654", 14])) errors.push(`${path}: checkout requested for the wrong listing or duration (${calls})`);
    const toast = await page.locator("#toast").innerText().catch(() => "");
    if (!/boost/i.test(toast)) errors.push(`${path}: no confirmation shown after returning from checkout ("${toast}")`);

    // A cancelled payment says so and never claims a boost.
    await page.goto(`http://localhost:5173${path}?local=1&boost=cancelled`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !new URLSearchParams(location.search).has("boost"), null, { timeout: 5000 })
      .catch(() => errors.push(`${path}: boost=cancelled was not removed from the address bar`));
    const cancelled = await page.locator("#toast").innerText().catch(() => "");
    if (!/annulé|cancelled/i.test(cancelled)) errors.push(`${path}: no cancellation message ("${cancelled}")`);

    await page.evaluate(() => sessionStorage.clear());
    await page.close();
  }

  await browser.close();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Web boost QA passed");
})();
