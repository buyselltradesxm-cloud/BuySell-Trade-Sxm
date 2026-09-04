const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /déposer|post/i }).first().click();
  await page.locator("#accountModal.open").waitFor();

  const loginText = await page.locator("#accountModal").innerText();
  if (!/Continuer avec Google|Continue with Google/.test(loginText)) errors.push("Google login button is missing.");
  if (!/Continuer avec Facebook|Continue with Facebook/.test(loginText)) errors.push("Facebook login button is missing.");
  if (/Pro Starter|Pro Plus|Pro Premium|Dealer Pro/.test(loginText)) {
    errors.push("Pricing plans are still shown inside the login modal.");
  }
  if (!/Créer un compte est gratuit|Creating an account is free/.test(loginText)) {
    errors.push("Free account message is missing from the login modal.");
  }

  await page.locator("#accountModal .auth-intro").getByRole("button", { name: /^Pricing$/i }).click();
  await page.locator("#boostModal.open").waitFor();
  const pricingText = await page.locator("#boostModal").innerText();
  for (const expected of ["Personal", "Pro Starter", "Pro Plus", "Pro Premium", "Dealer Pro"]) {
    if (!pricingText.includes(expected)) errors.push(`Pricing modal is missing ${expected}.`);
  }
  if (!/79 €\/mois|79 €\/month/.test(pricingText)) errors.push("Dealer Pro price is missing.");
  if (!/Créer un compte est gratuit|Creating an account is free/.test(pricingText)) {
    errors.push("Pricing modal does not explain that account creation is free.");
  }
  if (!/Publier et vendre vos objets personnels est gratuit|Posting and selling your personal items is free/.test(pricingText)) {
    errors.push("Pricing modal does not explain that selling personal items is free.");
  }
  if (!/Sans paiement confirmé|Without confirmed payment/.test(pricingText)) {
    errors.push("Pro payment requirement is missing.");
  }

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /déposer|post/i }).first().click();
  await page.locator("#accountModal.open").waitFor();
  const email = `free-${Date.now()}@example.com`;
  await page.locator("#accountName").fill("Free Seller");
  await page.locator("#accountEmail").fill(email);
  await page.locator("#accountPassword").fill("password123");
  await page.locator("#accountPasswordConfirm").fill("password123");
  await page.getByRole("button", { name: /créer mon compte|create my account/i }).click();
  await page.locator("#postModal.open").waitFor();

  const userAfterSignup = await page.evaluate(() => {
    const raw = localStorage.getItem("bstsxm-state");
    return raw ? JSON.parse(raw).user : null;
  });
  if (userAfterSignup?.accountType !== "personal") errors.push("Free signup did not create a personal account.");
  if (userAfterSignup?.accountPlan !== "personal-free") errors.push("Free signup did not use the Personal Free plan.");

  console.log(JSON.stringify({
    errors,
    loginHasSocial: /Continuer avec Google|Continue with Google/.test(loginText),
    pricingHasPlans: /Pro Starter/.test(pricingText) && /Dealer Pro/.test(pricingText),
    accountType: userAfterSignup?.accountType,
    accountPlan: userAfterSignup?.accountPlan
  }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
