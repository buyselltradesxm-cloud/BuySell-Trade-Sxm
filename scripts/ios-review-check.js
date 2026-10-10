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
        window.calls = []; window.purchaseResult = { cancelled: true };
        window.Capacitor = { getPlatform: () => "ios", isNativePlatform: () => true, Plugins: { SXMNative: {
          products: async () => ({ products: ["starter", "business", "premium", "elite", "unlimited"].map(tier => ({ id: "com.korekdigitalmarketing.buyselltradesxm.pro_" + tier + "_monthly", price: "€12.34" })).concat([3, 7, 14].map(days => ({ id: "com.korekdigitalmarketing.buyselltradesxm.boost_" + days + "_days", price: "€4.56" }))) }),
          purchase: async args => { calls.push(["purchase", args]); return purchaseResult; },
          finish: async args => { calls.push(["finish", args]); },
          authenticate: async args => { calls.push(["authenticate", args]); return { url: "buyselltradesxm://auth/callback?code=pkce-test" }; },
          pending: async () => ({ transactions: [] }), restore: async () => ({ transactions: [] }),
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
      await page.evaluate(() => {
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
      assert.equal(calls.find(x => x[0] === "oauth")[1].options.redirectTo, "https://buyselltradesxm.com/auth-callback.html");
      assert.equal(calls.find(x => x[0] === "exchange")[1], "pkce-test");
      // The app stays on this page after provider sign-in, so nothing reloads
      // the login screen away as it does on the web: it has to close itself.
      await page.evaluate(() => {
        window.SUPABASE_OAUTH_PROVIDERS = { google: true, apple: true };
        const exchange = window.db.auth.exchangeCodeForSession;
        window.db.auth.exchangeCodeForSession = async code => {
          await exchange(code);
          const user = { id: "test-user", email: "reviewer@example.com" };
          // Stand-in for onAuthChange(), which loads the account a moment later.
          setTimeout(() => { state.user = normalizeUser({ id: user.id, provider: "supabase", email: user.email, name: "Reviewer" }); }, 300);
          return { data: { session: { user }, user }, error: null };
        };
        openModal("accountModal");
      });
      const loginOpen = () => page.locator("#accountModal").evaluate(el => el.classList.contains("open"));
      assert.equal(await loginOpen(), true);
      await page.evaluate(() => socialAuth("apple"));
      assert.equal(await loginOpen(), false, "Login screen must close after in-app sign-in");
      assert.equal(await page.evaluate(() => state.user && state.user.id), "test-user");
      // Closing the sheet leaves the login screen as it was, with no error.
      await page.evaluate(() => {
        Capacitor.Plugins.SXMNative.authenticate = async () => { throw Object.assign(new Error("Sign-in cancelled"), { code: "CANCELLED" }); };
        window.toasts = []; const show = showToast; showToast = message => { toasts.push(message); show(message); };
        openModal("accountModal");
      });
      await page.evaluate(() => socialAuth("google"));
      assert.equal(await loginOpen(), true, "Cancelling sign-in keeps the login screen");
      assert.deepEqual(await page.evaluate(() => window.toasts), [], "Cancelling sign-in is not an error");
      await page.evaluate(() => { closeModal("accountModal"); window.calls = []; });
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
      await page.evaluate(() => { setLang("en"); openPaymentModal({ existingUser: true, plan: "pro-starter" }); });
      await page.waitForFunction(() => document.getElementById("paymentPlanPrice").textContent.includes("€12.34"));
      assert.match(await page.locator('#paymentRenewalTerms').innerText(), /renew.*automatically|auto-renew/i);
      const renewalText = await page.locator('#paymentRenewalTerms').innerText();
      const localizedPrice = (await page.locator('#paymentPlanPrice').innerText()).replace(/\s*\/\s*month$/, '');
      assert.ok(renewalText.includes(localizedPrice), `Renewal disclosure must match the Apple localized price: ${renewalText}`);
      assert.ok(!renewalText.includes('$29'), "Apple renewal disclosure must not quote the web Stripe price");
      assert.equal(await page.locator("[data-apple-restore]").first().isVisible(), true);
      assert.deepEqual(errors, []);
      await page.close();
      // Builds with the native tab bar announce it through SXMNativeInfo: the
      // page hides its own bottom navigation, follows the bar, reports back
      // what it shows, and uses the system Sign in with Apple sheet.
      const shellPage = await browser.newPage({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
      const shellErrors = [];
      shellPage.on("pageerror", error => shellErrors.push(error.message));
      await shellPage.addInitScript(() => {
        window.calls = []; window.appleFails = false;
        window.SXMNativeInfo = { shell: 2, tabs: true, appleSignIn: true, refresh: true };
        window.Capacitor = { getPlatform: () => "ios", isNativePlatform: () => true, Plugins: { SXMNative: {
          products: async () => ({ products: [] }), pending: async () => ({ transactions: [] }), addListener: async () => ({}),
          ready: async () => ({ tab: "messages" }),
          setTabs: async tabs => { calls.push(["tabs", tabs]); },
          refreshDone: async () => { calls.push(["refreshDone"]); },
          appleSignIn: async () => { if (appleFails) throw Object.assign(new Error("Unable to complete sign-in"), { code: "AUTH_FAILED" }); return { identityToken: "apple-token", nonce: "raw-nonce", name: "Ada Reviewer" }; },
          authenticate: async args => { calls.push(["authenticate", args]); return { url: "buyselltradesxm://auth/callback?code=pkce-test" }; }
        } } };
      });
      await shellPage.goto(`http://127.0.0.1:${server.address().port}/${filename}?local=1`);
      const lastTabs = () => shellPage.evaluate(() => (calls.filter(x => x[0] === "tabs").pop() || [])[1]);
      const isOpen = id => shellPage.locator("#" + id).evaluate(el => el.classList.contains("open"));
      const tap = tab => shellPage.evaluate(name => { const event = new Event("sxmTab"); event.tab = name; window.dispatchEvent(event); }, tab);
      assert.equal(await shellPage.locator(".mobile-nav").evaluate(el => getComputedStyle(el).display), "none", "The native bar replaces the page's bottom navigation");
      // A tab chosen before the page was ready (home screen shortcut): signed out, it asks to sign in.
      await shellPage.waitForFunction(() => document.querySelector("#accountModal.open"), null, { timeout: 5000 });
      assert.equal((await lastTabs()).selected, "messages");
      await tap("browse");
      assert.equal(await isOpen("accountModal"), false);
      assert.equal((await lastTabs()).selected, "browse");
      await shellPage.evaluate(() => {
        const user = { id: "test-user", email: "reviewer@example.com" };
        window.db = { auth: {
          getSession: async () => ({ data: { session: null } }),
          signInWithIdToken: async options => { calls.push(["idToken", options]); setTimeout(() => { state.user = normalizeUser({ id: user.id, provider: "local", email: user.email, name: "Reviewer" }); }, 200); return { data: { session: { user }, user }, error: null }; },
          updateUser: async options => { calls.push(["updateUser", options]); return { data: { user }, error: null }; },
          signInWithOAuth: async options => { calls.push(["oauth", options]); return { data: { url: "https://szhaxlmronirhnntlwyb.supabase.co/auth/v1/authorize?provider=apple" } }; },
          exchangeCodeForSession: async code => { calls.push(["exchange", code]); setTimeout(() => { state.user = normalizeUser({ id: user.id, provider: "local", email: user.email, name: "Reviewer" }); }, 200); return { data: { session: { user }, user }, error: null }; }
        } };
        window.SUPABASE_OAUTH_PROVIDERS = { google: true, apple: true };
        applySupabaseUser = async () => {};
        openModal("accountModal");
      });
      await shellPage.evaluate(() => socialAuth("apple"));
      let shellCalls = await shellPage.evaluate(() => window.calls);
      assert.deepEqual(shellCalls.find(x => x[0] === "idToken")[1], { provider: "apple", token: "apple-token", nonce: "raw-nonce" });
      assert.equal(shellCalls.find(x => x[0] === "updateUser")[1].data.name, "Ada Reviewer");
      assert.ok(!shellCalls.some(x => x[0] === "oauth"), "The system Apple sheet needs no browser sign-in");
      assert.equal(await isOpen("accountModal"), false, "Login screen must close after the Apple sheet");
      // If the system sheet cannot finish, the browser sheet still signs in.
      await shellPage.evaluate(() => { state.user = null; window.calls = []; window.appleFails = true; openModal("accountModal"); });
      await shellPage.evaluate(() => socialAuth("apple"));
      shellCalls = await shellPage.evaluate(() => window.calls);
      assert.ok(shellCalls.some(x => x[0] === "oauth") && shellCalls.some(x => x[0] === "exchange"), "Falls back to the browser sheet");
      assert.equal(await isOpen("accountModal"), false);
      // Signed in: tabs open their screens, and closing one in the page moves the bar back.
      await tap("profile");
      assert.equal(await isOpen("profileModal"), true);
      assert.equal((await lastTabs()).selected, "profile");
      await shellPage.evaluate(() => closeModal("profileModal"));
      await shellPage.waitForFunction(() => (calls.filter(x => x[0] === "tabs").pop() || [])[1].selected === "browse");
      await shellPage.evaluate(() => { setUnreadMessageCount(3); setLang("en"); });
      await shellPage.waitForFunction(() => { const tabs = (calls.filter(x => x[0] === "tabs").pop() || [])[1]; return tabs.badges.messages === 3 && tabs.lang === "en"; });
      await shellPage.evaluate(() => { SB.hydrate = async () => true; window.dispatchEvent(new Event("sxmRefresh")); });
      await shellPage.waitForFunction(() => calls.some(x => x[0] === "refreshDone"));
      assert.deepEqual(shellErrors, []);
      await shellPage.close();
      // The web "add to home screen" hint has no place inside the App Store app;
      // in Safari on the same iPhone it still appears.
      for (const inApp of [true, false]) {
        const hintPage = await browser.newPage({ serviceWorkers: "block", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" });
        if (inApp) await hintPage.addInitScript(() => { window.Capacitor = { getPlatform: () => "ios", isNativePlatform: () => true, Plugins: {} }; });
        await hintPage.goto(`http://127.0.0.1:${server.address().port}/${filename}?local=1`);
        await hintPage.waitForTimeout(5500);
        assert.equal(await hintPage.locator("#bst-pwa-banner").count(), inApp ? 0 : 1, inApp ? "No install hint inside the app" : "Install hint still shown in Safari");
        assert.equal(await hintPage.evaluate(() => bstPromptInstall()), !inApp);
        await hintPage.close();
      }
      console.log(filename + ": in-app OAuth, cancelled/pending purchases, failed delivery, verified delivery, localized prices and restore controls passed.");
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
