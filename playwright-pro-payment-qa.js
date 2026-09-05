const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:5173/?local=1", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  const headerLogin = page.locator("#profileBtn");
  const headerPricing = page.locator(".bar-actions").getByRole("button", { name: /^Pricing$/i });
  if (!(await headerLogin.isVisible())) errors.push("Login/Profile button is missing from the header.");
  if (!(await headerPricing.isVisible())) errors.push("Pricing button is missing from the header.");
  const headerLoginText = await headerLogin.innerText();
  if (!/Login/.test(headerLoginText)) errors.push(`Signed-out header should say Login, got "${headerLoginText}".`);

  await headerPricing.click();
  await page.locator("#boostModal.open").waitFor();
  const directPricingText = await page.locator("#boostModal").innerText();
  if (!/Pro Starter/.test(directPricingText) || !/Pro Unlimited/.test(directPricingText)) {
    errors.push("Header Pricing button does not open the pricing plans.");
  }
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /déposer|post/i }).first().click();
  await page.locator("#accountModal.open").waitFor();

  const loginText = await page.locator("#accountModal").innerText();
  if (!/Créer gratuitement avec Google|Create free with Google/.test(loginText)) errors.push("Free Google account button is missing.");
  if (!/Continuer Pro avec Google|Continue Pro with Google/.test(loginText)) errors.push("Pro Google account button is missing.");
  if (!(await page.locator("#accountModal .email-login-card .social-btn.google").isVisible())) errors.push("Existing-account Google login button is missing.");
  const removedSocialProvider = "Face" + "book";
  if (loginText.includes(removedSocialProvider)) errors.push("Removed social login button should not be shown.");
  if (/Pro Starter|Pro Plus|Pro Premium|Dealer Pro/.test(loginText)) {
    errors.push("Pricing plans are still shown inside the login modal.");
  }
  if (!/Créer un compte est gratuit|Creating an account is free/.test(loginText)) {
    errors.push("Free account message is missing from the login modal.");
  }
  if (await page.locator("#accountModal .auth-intro").getByRole("button", { name: /^Pricing$/i }).count()) {
    errors.push("Pricing button should not be inside the login modal.");
  }

  await page.keyboard.press("Escape");
  await headerPricing.click();
  await page.locator("#boostModal.open").waitFor();
  const pricingText = await page.locator("#boostModal").innerText();
  for (const expected of ["Particulier", "Pro Starter", "Pro Business", "Pro Premium", "Pro Elite", "Pro Unlimited"]) {
    if (!pricingText.includes(expected)) errors.push(`Pricing modal is missing ${expected}.`);
  }
  for (const price of ["29 €/mois", "59 €/mois", "99 €/mois", "149 €/mois", "199 €/mois"]) {
    if (!pricingText.includes(price)) errors.push(`Pricing modal is missing ${price}.`);
  }
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
  await Promise.race([
    page.locator("#postModal.open").waitFor({ timeout: 10000 }).catch(() => null),
    page.locator("#toast").getByText(/confirmez votre email|confirm your email/i).waitFor({ timeout: 10000 }).catch(() => null)
  ]);

  const userAfterSignup = await page.evaluate(() => {
    const raw = localStorage.getItem("bstsxm-state");
    return raw ? JSON.parse(raw).user : null;
  });
  const emailConfirmationRequired = await page.locator("#toast").innerText().then(text => /confirmez votre email|confirm your email/i.test(text)).catch(() => false);
  if (emailConfirmationRequired && userAfterSignup) {
    errors.push("Confirmed-email signup should not sign the user in before email verification.");
  }
  if (!emailConfirmationRequired) {
    if (userAfterSignup?.accountType !== "personal") errors.push("Free signup did not create a personal account.");
    if (userAfterSignup?.accountPlan !== "personal-free") errors.push("Free signup did not use the Personal Free plan.");
  }

  console.log(JSON.stringify({
    errors,
    loginHasSocial: /Créer gratuitement avec Google|Create free with Google/.test(loginText) && /Continuer Pro avec Google|Continue Pro with Google/.test(loginText),
    pricingHasPlans: /Pro Starter/.test(pricingText) && /Pro Unlimited/.test(pricingText),
    emailConfirmationRequired,
    accountType: userAfterSignup?.accountType,
    accountPlan: userAfterSignup?.accountPlan
  }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
