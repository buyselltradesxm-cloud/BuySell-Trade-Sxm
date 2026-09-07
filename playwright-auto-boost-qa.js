const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(root, requested));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  const errors = [];

  for (const route of ["/", "/marketplace.html"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block"
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${route}: ${error.message}`));
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(`${route}: ${msg.text()}`);
    });

    await page.goto(`http://127.0.0.1:${port}${route}?local=1`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });

    const starterLimit = await page.evaluate(() => {
      state.user = normalizeUser({
        id: "qa-auto-starter",
        name: "QA Starter",
        email: "qa-auto-starter@example.com",
        accountType: "business",
        accountPlan: "pro-starter",
        subscriptionStatus: "active"
      });
      return includedBoostLimitFor(state.user);
    });
    if (starterLimit !== 1) errors.push(`${route}: Pro Starter included boost limit should be 1.`);

    const businessResult = await page.evaluate(async () => {
      state.lang = "fr";
      state.user = normalizeUser({
        id: "qa-auto-pro",
        name: "QA Auto Pro",
        email: "qa-auto-pro@example.com",
        accountType: "business",
        accountPlan: "pro-business",
        subscriptionStatus: "active",
        subscriptionStarted: "2026-09-01T08:00:00.000Z",
        subscriptionCurrentPeriodEnd: "2026-10-01T08:00:00.000Z"
      });

      L.length = 0;
      for (let i = 1; i <= 5; i += 1) {
        L.push({
          id: `qa-auto-${i}`,
          ownerId: state.user.id,
          sellerId: state.user.id,
          t: `Auto boost listing ${i}`,
          cat: "elec",
          area: "Philipsburg",
          side: "nl",
          cond: "tbe",
          cur: "usd",
          eur: 10 + i,
          usd: 12 + i,
          ph: i,
          createdAt: `2026-09-${String(i).padStart(2, "0")}T12:00:00.000Z`
        });
      }
      L.push({
        id: "qa-paid-extra",
        ownerId: state.user.id,
        sellerId: state.user.id,
        t: "Already paid boost",
        cat: "elec",
        area: "Marigot",
        side: "fr",
        cond: "tbe",
        cur: "usd",
        eur: 99,
        usd: 110,
        ph: 10,
        createdAt: "2026-09-10T12:00:00.000Z",
        boosted: true,
        feat: true,
        boost: { days: 7, eur: 9, usd: 10, paid: true, startedAt: "2026-09-10T12:00:00.000Z" }
      });

      const firstApplied = await applyAutomaticIncludedBoosts({ silent: true });
      render();
      openProfile();
      const profileText = document.getElementById("profileModal").innerText;
      return {
        firstApplied,
        limit: includedBoostLimitFor(state.user),
        used: autoBoostUsedCountFor(state.user),
        includedIds: L.filter(l => l.boost?.included).map(l => l.id).sort(),
        paidCounted: isIncludedAutoBoost(L.find(l => l.id === "qa-paid-extra")),
        manualButtons: document.querySelectorAll("[onclick^='openBoostCheckout']").length,
        profileText
      };
    });

    if (businessResult.limit !== 2) errors.push(`${route}: Pro Business included boost limit should be 2.`);
    if (businessResult.firstApplied !== 2) errors.push(`${route}: Pro Business should auto-apply 2 boosts, got ${businessResult.firstApplied}.`);
    if (businessResult.used !== 2) errors.push(`${route}: Pro Business used count should be 2, got ${businessResult.used}.`);
    if (businessResult.includedIds.join(",") !== "qa-auto-4,qa-auto-5") {
      errors.push(`${route}: Pro Business should boost the newest two eligible listings, got ${businessResult.includedIds.join(",")}.`);
    }
    if (businessResult.paidCounted) errors.push(`${route}: manual paid boost was counted as an included automatic boost.`);
    if (businessResult.manualButtons !== 0) errors.push(`${route}: paid users should not see manual boost checkout buttons.`);
    if (!/Boosts auto ce mois/.test(businessResult.profileText) || !/2 \/ 2/.test(businessResult.profileText)) {
      errors.push(`${route}: profile does not show automatic boost usage for Pro Business.`);
    }

    const exhaustedResult = await page.evaluate(async () => {
      L.push({
        id: "qa-auto-6",
        ownerId: state.user.id,
        sellerId: state.user.id,
        t: "Newest after quota",
        cat: "elec",
        area: "Simpson Bay",
        side: "nl",
        cond: "tbe",
        cur: "usd",
        eur: 66,
        usd: 70,
        ph: 11,
        createdAt: "2026-09-11T12:00:00.000Z"
      });
      const applied = await applyAutomaticIncludedBoosts({ silent: true });
      return {
        applied,
        used: autoBoostUsedCountFor(state.user),
        newestBoosted: !!L.find(l => l.id === "qa-auto-6")?.boost?.included
      };
    });

    if (exhaustedResult.applied !== 0) errors.push(`${route}: quota-exhausted Business account should not apply more boosts.`);
    if (exhaustedResult.used !== 2) errors.push(`${route}: quota-exhausted Business account used count changed.`);
    if (exhaustedResult.newestBoosted) errors.push(`${route}: newest listing was boosted despite exhausted Business quota.`);

    const premiumResult = await page.evaluate(async () => {
      state.user.accountPlan = "pro-premium";
      const applied = await applyAutomaticIncludedBoosts({ silent: true });
      render();
      openProfile();
      return {
        applied,
        limit: includedBoostLimitFor(state.user),
        used: autoBoostUsedCountFor(state.user),
        includedIds: L.filter(l => l.boost?.included).map(l => l.id).sort(),
        profileText: document.getElementById("profileModal").innerText
      };
    });

    if (premiumResult.limit !== 5) errors.push(`${route}: Premium included boost limit should be 5.`);
    if (premiumResult.applied !== 3) errors.push(`${route}: Premium upgrade should apply 3 more boosts, got ${premiumResult.applied}.`);
    if (premiumResult.used !== 5) errors.push(`${route}: Premium used count should be 5, got ${premiumResult.used}.`);
    if (premiumResult.includedIds.join(",") !== "qa-auto-2,qa-auto-3,qa-auto-4,qa-auto-5,qa-auto-6") {
      errors.push(`${route}: Premium boosted the wrong listings: ${premiumResult.includedIds.join(",")}.`);
    }
    if (!/5 \/ 5/.test(premiumResult.profileText)) errors.push(`${route}: profile does not show Premium boost usage.`);

    await context.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})();
