const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /login|se connecter/i }).first().click();
  await page.locator("#accountModal.open").waitFor();

  const results = [];

  const consent = page.locator("#accountTermsConsent");
  const consentError = page.locator("#socialSignupError");
  const googleSignup = page.locator('.social-btn.google[data-click-args*="signup"]');
  if (!await googleSignup.evaluate(button => Boolean(document.querySelector("#accountTermsConsent").compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING))) {
    errors.push("The age and Terms checkbox should appear before social signup.");
  }
  await googleSignup.click();
  await consentError.waitFor({ state: "visible" });
  if (!await consent.evaluate(input => document.activeElement === input)) errors.push("Missing consent should focus the checkbox.");
  await consent.check();
  await consentError.waitFor({ state: "hidden" });
  const googleBeforeUrl = page.url();
  await page.getByRole("button", { name: /Google/i }).first().click();
  await page.waitForTimeout(1500);
  const googleAfterUrl = page.url();
  results.push({ provider: "Google", beforeUrl: googleBeforeUrl, afterUrl: googleAfterUrl });
  if (!googleAfterUrl.includes(`${encodeURIComponent("https://buyselltradesxm.com")}`) &&
      !googleAfterUrl.includes("/auth/v1/authorize") &&
      !googleAfterUrl.includes("accounts.google.com")) {
    errors.push("Google click did not start the Supabase OAuth flow.");
  }

  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /login|se connecter/i }).first().click();
  await page.locator("#accountModal.open").waitFor();
  await page.locator('.social-btn.apple[data-click-args*="signup"]').click();
  await consentError.waitFor({ state: "visible" });
  await page.locator("#accountTermsConsent").check();
  const appleBeforeUrl = page.url();
  await page.getByRole("button", { name: /Apple/i }).first().click();
  await page.waitForTimeout(1500);
  const appleAfterUrl = page.url();
  results.push({ provider: "Apple", beforeUrl: appleBeforeUrl, afterUrl: appleAfterUrl });
  if (!appleAfterUrl.includes("/auth/v1/authorize") &&
      !appleAfterUrl.includes("appleid.apple.com")) {
    errors.push("Apple click did not start the Supabase OAuth flow.");
  }

  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /login|se connecter/i }).first().click();
  await page.locator("#accountModal.open").waitFor();
  const removedSocialProvider = "Face" + "book";
  const removedProviderButtonCount = await page.getByRole("button", { name: new RegExp(removedSocialProvider, "i") }).count();
  results.push({ provider: "removed social provider", visibleButtons: removedProviderButtonCount });
  if (removedProviderButtonCount) errors.push("Removed social login button should not be shown.");

  console.log(JSON.stringify({ errors, results }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
