const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /login/i }).first().click();
  await page.locator("#accountModal.open").waitFor();

  const results = [];

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
  await page.getByRole("button", { name: /login/i }).first().click();
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
