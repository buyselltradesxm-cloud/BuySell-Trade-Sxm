const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 5174;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const requested = url.pathname === "/" ? "/index.html" : url.pathname;
      const file = path.normalize(path.join(root, requested));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      fs.readFile(file, (err, body) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
        res.end(body);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const results = [];
  const uuid = "92cb0bbe-be63-4032-8161-530a5ba1e1c8";

  const listing = {
    id: uuid,
    t: "UUID Supabase test listing",
    en: "UUID Supabase test listing",
    eur: 123,
    usd: 134,
    cur: "eur",
    cat: "elec",
    subcat: "phones",
    area: "Marigot",
    side: "fr",
    cond: "good",
    ph: 0,
    pics: 1,
    photos: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"],
    sellerId: "seller-uuid-test",
    sellerName: "Supabase Seller",
    pro: false,
    boosted: false,
    feat: false
  };

  for (const pathName of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", err => errors.push(`${pathName}: ${err.message}`));
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("400")) errors.push(`${pathName}: ${msg.text()}`);
    });

    await page.addInitScript(({ listing }) => {
      localStorage.setItem("bstsxm-state", JSON.stringify({
        lang: "fr",
        cur: "eur",
        favs: [],
        saved: [],
        userListings: [listing],
        usersByEmail: {},
        chatThreads: {},
        adminReports: [{
          id: "rep-uuid-test",
          listingId: listing.id,
          reason: "QA report",
          status: "open",
          createdAt: new Date().toISOString()
        }],
        adminBanned: [],
        adminCategoryStatus: {}
      }));
    }, { listing });

    await page.goto(`http://localhost:${port}${pathName}?local=1&admin=1&email=rxmarketing09@gmail.com&listing=${uuid}`, {
      waitUntil: "domcontentloaded"
    });
    await page.waitForSelector("#detailModal.open", { timeout: 7000 });
    await page.click("#detailModal .secondary-btn");
    await page.waitForTimeout(300);
    await page.click("#detailModal .primary-btn");
    await page.waitForTimeout(300);
    await page.click("#detailModal .close-btn");
    await page.waitForTimeout(300);
    await page.evaluate(() => window.openAdmin());
    await page.waitForSelector("#adminModal.open", { timeout: 7000 });

    const adminRow = page.locator("#adminModal .admin-row", { hasText: "UUID Supabase test listing" }).first();
    await adminRow.getByRole("button", { name: "Voir" }).click();
    await page.waitForSelector("#detailModal.open", { timeout: 7000 });
    await page.click("#detailModal .close-btn");
    await page.waitForTimeout(300);
    await page.evaluate(() => window.openAdmin());
    await page.waitForSelector("#adminModal.open", { timeout: 7000 });

    const rowAgain = page.locator("#adminModal .admin-row", { hasText: "UUID Supabase test listing" }).first();
    await rowAgain.getByRole("button", { name: /Mettre une|Retirer une/ }).click();
    await page.waitForTimeout(300);
    await rowAgain.getByRole("button", { name: /Sold|Active/ }).click();
    await page.waitForTimeout(300);

    results.push(await page.evaluate((uuid) => ({
      path: location.pathname,
      detailTitle: document.querySelector("#detailTitle")?.textContent?.trim(),
      urlHasUuid: location.href.includes(uuid),
      favCount: document.querySelector("#favCount")?.textContent?.trim(),
      adminOpen: document.querySelector("#adminModal")?.classList.contains("open")
    }), uuid));

    await page.close();
  }

  await browser.close();
  server.close();
  console.log(JSON.stringify({ errors, results }, null, 2));
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
