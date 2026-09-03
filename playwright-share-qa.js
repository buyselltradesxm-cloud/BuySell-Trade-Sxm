const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("http://localhost:5173/?listing=31", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#detailModal.open .share-box", { timeout: 5000 });

  const data = await page.evaluate(() => ({
    title: document.querySelector("#detailTitle")?.textContent?.trim(),
    shareValue: document.querySelector('[id^="shareUrl-"]')?.value,
    cardShareButtons: document.querySelectorAll(".share-card").length,
    modalOpen: document.querySelector("#detailModal")?.classList.contains("open"),
  }));

  console.log(JSON.stringify({ errors, ...data }, null, 2));
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
