const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  page.on("console", msg => {
    if(msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:5173/", { waitUntil:"domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil:"domcontentloaded" });

  await page.getByRole("button", { name:/déposer|post/i }).first().click();
  await page.locator(".plan-card").filter({ has: page.locator("[data-i18n='planPlusTitle']") }).click();
  await page.locator("#accountName").fill("Island Tech");
  await page.locator("#accountEmail").fill(`pro-${Date.now()}@example.com`);
  await page.locator("#businessName").fill("Island Tech SXM");
  await page.locator("#accountPassword").fill("password123");
  await page.locator("#accountPasswordConfirm").fill("password123");
  await page.getByRole("button", { name:/continuer vers le paiement|continue to payment/i }).click();
  await page.locator("#paymentModal.open").waitFor();

  const userBeforePayment = await page.evaluate(() => {
    const raw = localStorage.getItem("bstsxm-state");
    return raw ? JSON.parse(raw).user : null;
  });
  if(userBeforePayment) errors.push("Pro user was created before payment confirmation.");

  await page.getByRole("button", { name:/confirmer le paiement test|confirm demo payment/i }).click();
  await page.locator("#postModal.open").waitFor();
  const userAfterPayment = await page.evaluate(() => {
    const raw = localStorage.getItem("bstsxm-state");
    return raw ? JSON.parse(raw).user : null;
  });
  if(userAfterPayment?.accountType !== "business") errors.push("Paid signup did not create a business account.");
  if(userAfterPayment?.subscriptionStatus !== "active") errors.push("Paid signup did not activate the Pro subscription.");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name:/profil|profile/i }).first().click();
  await page.locator("#profileModal.open").waitFor();
  const profileText = await page.locator("#profileBody").innerText();
  if(!/Espace Pro|Pro workspace/.test(profileText)) errors.push("Pro profile workspace is missing.");
  if(!/Ajouter un produit|Add product/.test(profileText)) errors.push("Pro product action is missing.");

  console.log(JSON.stringify({
    errors,
    accountType:userAfterPayment?.accountType,
    subscriptionStatus:userAfterPayment?.subscriptionStatus,
    profileHasProWorkspace:/Espace Pro|Pro workspace/.test(profileText)
  }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
