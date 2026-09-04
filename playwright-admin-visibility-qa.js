const { chromium } = require("playwright");
const path = require("path");

const fileUrl = `file://${path.resolve(__dirname, "index.html").replace(/\\/g, "/")}`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];

  page.on("pageerror", err => errors.push(err.message));

  await page.goto(`${fileUrl}?local=1`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#adminBtn", { state: "attached" });

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

  const normalUserSeesAdmin = await page.locator("#adminBtn").isVisible();
  if (normalUserSeesAdmin) {
    errors.push("A non-allowlisted Supabase user with role=admin can see the Admin button.");
  }

  await page.evaluate(() => {
    window.__bstState.user = {
      id: "admin-user",
      provider: "supabase",
      email: "buyselltradesxm@gmail.com",
      name: "Buy Sell Trade SXM",
      avatar: "BS",
      role: "admin"
    };
    window.render();
  });

  const allowedAdminSeesAdmin = await page.locator("#adminBtn").isVisible();
  if (!allowedAdminSeesAdmin) {
    errors.push("An allowlisted Supabase user with role=admin cannot see the Admin button.");
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
