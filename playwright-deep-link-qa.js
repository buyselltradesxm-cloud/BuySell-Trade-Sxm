/* A shared link (?listing=<id>) to a real listing must open it. Real listings
   only arrive once the backend has answered, after the first render. */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 5176;
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const file = path.normalize(path.join(root, url.pathname === "/" ? "/index.html" : url.pathname));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, body) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
        res.end(body);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

const row = {
  id: 9001, title: "Deep link test listing", description: "From the backend.", category: "elec",
  side: "fr", area: "Marigot", condition: "bon", currency: "eur", price_eur: 50, price_usd: 55,
  photos: [], status: "active", moderation_status: "approved",
  seller_id: "11111111-1111-4111-8111-111111111111", created_at: new Date().toISOString()
};

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  for (const pathName of ["/", "/marketplace.html"]) {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    await page.route("**/*.supabase.co/**", route => {
      const isListings = /\/rest\/v1\/listings/.test(route.request().url());
      // Answer late, so the app has already rendered its built-in examples.
      setTimeout(() => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify(isListings ? [row] : [])
      }).catch(() => {}), isListings ? 600 : 0);
    });
    await page.goto(`http://localhost:${port}${pathName}?listing=${row.id}`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector("#detailModal.open", { timeout: 8000 });
      const title = (await page.textContent("#detailTitle")).trim();
      if (title !== row.title) failures.push(`${pathName}: opened "${title}"`);
      else console.log(`ok  ${pathName} opens the shared listing`);
    } catch (err) {
      failures.push(`${pathName}: listing did not open`);
    }
    await context.close();
  }

  await browser.close();
  server.close();
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
})();
