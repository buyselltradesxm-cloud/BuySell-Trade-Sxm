const { chromium } = require("playwright");

const siteUrl = "https://buyselltradesxm.com/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const results = [];

  async function checkAdminAccess(path, label) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", err => errors.push(`${label}: ${err.message}`));
    page.on("console", msg => {
      const text = msg.text();
      if (msg.type() === "error" && !text.includes("400") && !text.includes("401")) {
        errors.push(`${label}: ${text}`);
      }
    });

    await page.goto(`${siteUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.SB && window.SB.enabled && window.SB.enabled(), null, { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.evaluate(async () => {
      if (window.SB) await window.SB.signOut();
    });
    await page.waitForTimeout(500);

    const openedFromUrl = await page.evaluate(() => !!document.querySelector("#accountModal.open"));
    if (!openedFromUrl) {
      await page.evaluate(() => window.openAdmin());
      await page.waitForTimeout(500);
    }

    const result = await page.evaluate(() => ({
      url: location.href,
      sbEnabled: !!(window.SB && window.SB.enabled && window.SB.enabled()),
      userEmail: window.state?.user?.email || null,
      accountModalOpen: !!document.querySelector("#accountModal.open"),
      adminModalOpen: !!document.querySelector("#adminModal.open"),
      loginEmailVisible: !!document.querySelector("#loginEmail"),
      toast: document.querySelector("#toast")?.textContent?.trim() || ""
    }));
    result.label = label;
    results.push(result);

    if (!result.sbEnabled) errors.push(`${label}: Supabase bridge is not enabled on the live site`);
    if (result.userEmail) errors.push(`${label}: Expected signed-out state, found ${result.userEmail}`);
    if (!result.accountModalOpen) errors.push(`${label}: Admin access did not ask a signed-out visitor to log in`);
    if (result.adminModalOpen) errors.push(`${label}: Admin modal opened for a signed-out visitor`);
    if (!/admin/i.test(result.toast)) errors.push(`${label}: Expected admin login toast, got "${result.toast}"`);

    await page.close();
  }

  await checkAdminAccess("?admin-access-qa=1", "admin button");
  await checkAdminAccess("admin/", "admin route with slash");
  await checkAdminAccess("admin", "admin route without slash");

  console.log(JSON.stringify({ errors, results }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
