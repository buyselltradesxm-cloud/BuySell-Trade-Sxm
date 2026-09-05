const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`http://localhost:5173${path}?local=1&admin=1`, { waitUntil:"domcontentloaded" });

    const result = await page.evaluate(() => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 3).toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 3).toISOString();
      state.user = {
        id:"qa-personal-monthly",
        name:"QA Personal",
        email:"qa-personal@example.com",
        accountType:"personal",
        accountPlan:"personal-free",
        subscriptionStatus:"free"
      };
      const mine = Array.from({ length:5 }, (_, index) => ({
        id:Date.now() + index,
        ownerId:state.user.id,
        sellerId:state.user.id,
        t:`Monthly listing ${index + 1}`,
        cat:"elec",
        area:"Marigot",
        side:"fr",
        status:index === 0 ? "sold" : "active",
        sold:index === 0,
        createdAt:thisMonth
      }));
      L.unshift(...mine, {
        id:Date.now() - 9000000000,
        ownerId:state.user.id,
        sellerId:state.user.id,
        t:"Old listing",
        cat:"elec",
        area:"Marigot",
        side:"fr",
        status:"active",
        createdAt:lastMonth
      });
      return {
        monthly:monthlyUserListingCount(),
        active:activeUserListingCount(),
        usage:publicationUsageCountFor(state.user),
        limit:listingLimitFor(state.user),
        message:publicationLimitMessage(5, true)
      };
    });

    if(result.monthly !== 5) errors.push(`${path}: expected 5 monthly listings, got ${result.monthly}`);
    if(result.active !== 5) errors.push(`${path}: expected 5 active listings including old active, got ${result.active}`);
    if(result.usage !== 5) errors.push(`${path}: personal usage must use monthly count`);
    if(result.limit !== 5) errors.push(`${path}: personal limit must be 5`);
    if(!/mois|month/.test(result.message)) errors.push(`${path}: personal limit message should mention month`);
    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
