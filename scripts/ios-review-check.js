const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".html") ? "text/html" : "application/octet-stream");
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const filename of ["index.html", "marketplace.html"]) {
      const page = await browser.newPage({ serviceWorkers: "block" });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => {
        window.calls = []; window.purchaseResult = { cancelled: true }; window.emptyCatalog = true;
        window.Capacitor = { getPlatform: () => "ios", Plugins: { SXMNative: {
          products: async () => ({ products: window.emptyCatalog ? [] : ["starter", "business", "premium", "elite", "unlimited"].map(tier => ({ id: "com.korekdigitalmarketing.buyselltradesxm.pro_" + tier + "_monthly", price: "€12.34" })).concat([3, 7, 14].map(days => ({ id: "com.korekdigitalmarketing.buyselltradesxm.boost_" + days + "_days", price: "€4.56" }))) }),
          purchase: async args => { calls.push(["purchase", args]); return purchaseResult; },
          finish: async args => { calls.push(["finish", args]); },
          authenticate: async args => { calls.push(["authenticate", args]); return { url: "buyselltradesxm://auth/callback?code=pkce-test" }; },
          pending: async () => ({ transactions: [] }), restore: async () => ({ transactions: ["signed-test"] }),
          addListener: async () => ({}), manageSubscriptions: async () => { calls.push(["manage"]); }
        } } };
      });
      await page.route("**/functions/v1/apple-purchases", async route => {
        const body = route.request().postDataJSON();
        await page.evaluate(value => calls.push(["server", value]), body.action);
        const failed = await page.evaluate(() => window.verifyFails);
        await route.fulfill({ status: body.action === "verify" && failed ? 503 : 200,
          contentType: "application/json", body: JSON.stringify(body.action === "prepare" ? { appAccountToken: "a7cd2b01-01a0-48a0-b99d-27969d673661" } : failed ? { error: "Verification unavailable" } : { transactionId: "123" }) });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/${filename}?local=1`);
      await page.waitForFunction(() => document.querySelector('[data-i18n="boost3Price"]').textContent.includes('App Store'));
      await page.evaluate(() => {
        window.emptyCatalog = false;
        window.db = { auth: {
          getSession: async () => ({ data: { session: { access_token: "test", user: { id: "test-user" } } } }),
          signInWithOAuth: async options => { calls.push(["oauth", options]); return { data: { url: "https://szhaxlmronirhnntlwyb.supabase.co/auth/v1/authorize?provider=google" } }; },
          exchangeCodeForSession: async code => { calls.push(["exchange", code]); return { data: { session: {} } }; }
        } };
        SB.hydrate = async () => true;
        applySupabaseUser = async () => {};
        window.verifyFails = false;
      });
      const original = page.url();
      const auth = await page.evaluate(() => SB.signInWithOAuth("google"));
      assert.ok(!auth.error);
      assert.equal(page.url(), original, "OAuth must stay inside the app");
      let calls = await page.evaluate(() => window.calls);
      assert.equal(calls.find(x => x[0] === "oauth")[1].options.skipBrowserRedirect, true);
      assert.equal(calls.find(x => x[0] === "exchange")[1], "pkce-test");
      await page.evaluate(() => { window.calls = []; });
      assert.equal(await page.evaluate(() => SXM.buy("pro-starter")), false);
      calls = await page.evaluate(() => window.calls);
      assert.ok(!calls.some(x => x[0] === "finish" || x[1] === "verify"), "Cancellation cannot grant or finish a purchase");
      await page.evaluate(() => { window.calls = []; window.purchaseResult = { pending: true }; });
      assert.equal(await page.evaluate(() => SXM.buy("pro-starter")), false);
      assert.ok(!(await page.evaluate(() => window.calls)).some(x => x[0] === "finish"));
      await page.evaluate(() => { window.calls = []; window.purchaseResult = { signedTransaction: "signed-test" }; window.verifyFails = true; });
      assert.equal(await page.evaluate(() => SXM.buy("boost-7", "42")), false);
      assert.ok(!(await page.evaluate(() => window.calls)).some(x => x[0] === "finish"), "Failed delivery must remain unfinished");
      await page.evaluate(() => { window.calls = []; window.verifyFails = false; });
      assert.equal(await page.evaluate(() => SXM.buy("boost-7", "42")), true);
      calls = await page.evaluate(() => window.calls);
      assert.ok(calls.findIndex(x => x[1] === "verify") < calls.findIndex(x => x[0] === "finish"));
      await page.evaluate(async () => { window.calls = []; await SXM.restore(); });
      calls = await page.evaluate(() => window.calls);
      assert.ok(calls.some(x => x[1] === "verify"), "Restored purchases must reach the server");
      assert.ok(calls.findIndex(x => x[1] === "verify") < calls.findIndex(x => x[0] === "finish"), "Restore must verify before finishing");
      await page.evaluate(() => { setLang("en"); openPaymentModal({ existingUser: true, plan: "pro-starter" }); });
      await page.waitForFunction(() => document.getElementById("paymentPlanPrice").textContent.includes("€12.34"));
      assert.match(await page.locator('[data-i18n="paymentDemoText"]').innerText(), /auto-renewing/);
      assert.equal(await page.locator("[data-apple-restore]").first().isVisible(), true);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(filename + ": in-app OAuth, empty catalog recovery, cancelled/pending purchases, failed delivery, verified delivery, localized prices and verified restore passed.");
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
