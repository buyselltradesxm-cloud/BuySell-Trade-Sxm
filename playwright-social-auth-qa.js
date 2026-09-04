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
  for (const provider of ["Google", "Facebook"]) {
    const beforeUrl = page.url();
    await page.getByRole("button", { name: new RegExp(provider, "i") }).first().click();
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    const toast = await page.locator("#toast").innerText().catch(() => "");
    results.push({ provider, beforeUrl, afterUrl, toast });
    if (afterUrl !== beforeUrl) errors.push(`${provider} click navigated away before provider was enabled.`);
    if (!new RegExp(`${provider} login`, "i").test(toast)) {
      errors.push(`${provider} did not show a clear setup toast.`);
    }
  }

  console.log(JSON.stringify({ errors, results }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
