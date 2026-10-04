const { chromium } = require("playwright");

// Visit counting and error reporting (telemetry.js) and their display in the
// admin Statistics tab. telemetry.js stays silent on localhost unless the
// page is opened with ?telemetry=1. Every Supabase RPC is intercepted:
// nothing is written to the real project.
(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const calls = [];
    await context.route("**/rest/v1/rpc/**", route => {
      const name = route.request().url().split("/rpc/")[1].split("?")[0];
      let body = {}; try { body = JSON.parse(route.request().postData() || "{}"); } catch (e) { /* keep {} */ }
      calls.push({ name, body });
      route.fulfill({ status: 204, body: "" });
    });
    const sent = name => calls.filter(c => c.name === name);
    const waitFor = async (name, count) => {
      for (let i = 0; i < 40 && sent(name).length < count; i++) await page.waitForTimeout(100);
      return sent(name).length >= count;
    };

    await page.goto(`http://localhost:5173${path}?local=1&telemetry=1`, { waitUntil: "load" });
    if (!(await waitFor("track_site_view", 1))) errors.push(`${path}: page load was not counted`);
    else if (sent("track_site_view")[0].body.new_visit !== true || sent("track_site_view")[0].body.surface !== "web")
      errors.push(`${path}: first load should be a new web visit (${JSON.stringify(sent("track_site_view")[0].body)})`);

    await page.reload({ waitUntil: "load" });
    if (!(await waitFor("track_site_view", 2))) errors.push(`${path}: reload was not counted`);
    else if (sent("track_site_view")[1].body.new_visit !== false) errors.push(`${path}: a second load the same day counted as a new visit`);

    // The same bug twice is reported once; a third-party "Script error." never.
    await page.evaluate(() => {
      const boom = () => setTimeout(() => { throw new Error("qa telemetry boom"); }, 0);
      boom(); boom();
      window.dispatchEvent(new ErrorEvent("error", { message: "Script error.", filename: "" }));
    });
    if (!(await waitFor("log_client_error", 1))) errors.push(`${path}: a JavaScript error was not reported`);
    await page.waitForTimeout(400);
    const reports = sent("log_client_error");
    if (reports.length !== 1) errors.push(`${path}: expected 1 error report, got ${reports.length}`);
    const report = reports[0]?.body?.p || {};
    if (!/qa telemetry boom/.test(report.message || "")) errors.push(`${path}: error report lacks the message (${JSON.stringify(report).slice(0, 120)})`);
    if (report.page !== path) errors.push(`${path}: error report has the wrong page (${report.page})`);

    // Statistics tab renders visits and grouped errors, escaping their text.
    const html = await page.evaluate(() => {
      adminDailyCounts = [{ day: "2026-10-05", new_listings: 2, new_users: 1, new_messages: 4 }];
      adminSiteStats = {
        days: [{ day: "2026-10-05", visits: 37, views: 90, app_views: 12 }],
        errors: [{ message: "<img src=x onerror=1> is not defined", source: "https://x/app-index.js", line: 12, count: 3, last_seen: "2026-10-05T10:00:00Z", page: "/", surface: "web" }]
      };
      return adminStatsHTML();
    });
    if (!/<b>37<\/b>/.test(html) || !/37 (visites|visits)/.test(html)) errors.push(`${path}: visits missing from the Statistics tab`);
    if (!/× 3/.test(html) || !/app-index\.js:12/.test(html)) errors.push(`${path}: grouped error missing from the Statistics tab`);
    if (/<img src=x/.test(html)) errors.push(`${path}: error text is not escaped in the Statistics tab`);

    await context.close();
  }

  await browser.close();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Telemetry QA passed");
})();
