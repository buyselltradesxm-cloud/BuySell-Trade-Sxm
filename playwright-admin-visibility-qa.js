const { chromium } = require("playwright");
const path = require("path");

const fileUrl = `file://${path.resolve(__dirname, "index.html").replace(/\\/g, "/")}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];

  page.on("pageerror", err => errors.push(err.message));

  await page.goto(`${fileUrl}?local=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#profileBtn", { state: "attached" });
  const headerAdminButtons = await page.locator("#adminBtn").count();
  if (headerAdminButtons !== 0) {
    errors.push("Admin button still exists in the public header.");
  }

  await page.evaluate(() => {
    window.__bstState.user = {
      id: "normal-user",
      provider: "supabase",
      email: "normal.user@example.com",
      name: "Normal User",
      avatar: "NU",
      role: "admin"
    };
    window.render();
  });

  const normalProfileHasAdmin = await page.evaluate(async () => {
    window.openProfile();
    await new Promise(resolve => setTimeout(resolve, 100));
    return document.querySelector("#profileModal")?.textContent?.includes("Admin") || false;
  });
  if (normalProfileHasAdmin) {
    errors.push("A non-allowlisted Supabase user with role=admin can see the profile Admin shortcut.");
  }
  await page.evaluate(() => window.closeModal("profileModal"));

  await page.evaluate(() => {
    window.__bstState.user = {
      id: "admin-user",
      provider: "supabase",
      email: "rxmarketing09@gmail.com",
      name: "Buy Sell Trade SXM",
      avatar: "BS",
      role: "admin"
    };
    window.render();
  });

  const allowedAdminCanOpen = await page.evaluate(async () => {
    await window.openAdmin();
    await new Promise(resolve => setTimeout(resolve, 100));
    return document.querySelector("#adminModal")?.classList.contains("open") || false;
  });
  if (!allowedAdminCanOpen) {
    errors.push("An allowlisted Supabase user with role=admin cannot open admin.");
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
