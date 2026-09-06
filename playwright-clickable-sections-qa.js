const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil:"domcontentloaded" });

    await page.evaluate(() => {
      state.user = normalizeUser({
        id:"qa-click-user",
        name:"QA Click",
        email:"qa-click@example.com",
        accountType:"business",
        accountPlan:"pro-business",
        subscriptionStatus:"active",
        role:"user"
      });
      const existing = L.find(l => l.ownerId === state.user.id);
      if(!existing){
        L.unshift({
          id:"qa-click-listing",
          ownerId:state.user.id,
          sellerId:state.user.id,
          t:"QA clickable listing",
          cat:"elec",
          area:"Marigot",
          side:"fr",
          cond:"tbe",
          cur:"usd",
          eur:10,
          usd:11,
          ph:1,
          createdAt:new Date().toISOString()
        });
      }
      const fav = L.find(l => l.id !== "qa-click-listing") || L[0];
      state.favs.add(idKey(fav.id));
      threadFor("qa-click-listing").messages.push({
        who:"buyer",
        fr:"Bonjour",
        en:"Hello",
        at:"maintenant"
      });
      render();
      openProfile();
    });

    const profileModal = page.locator("#profileModal");
    await profileModal.getByRole("button", { name:/Email vérifié|Verified email/i }).click();
    let toast = await page.locator("#toast").innerText({ timeout:2000 }).catch(() => "");
    if(!/Email|email/.test(toast)) errors.push(`${path}: trust badge did not show email info`);

    await profileModal.getByRole("button", { name:/Messages/i }).first().click();
    const messagesOpen = await page.locator("#messagesModal.open").count();
    if(!messagesOpen) errors.push(`${path}: profile messages stat did not open messages`);
    await page.evaluate(() => closeModal("messagesModal"));

    await page.evaluate(() => openProfile());
    await page.locator("#profileModal").getByRole("button", { name:/Suivre mes favoris|Watch saved items/i }).click();
    toast = await page.locator("#toast").innerText({ timeout:2000 }).catch(() => "");
    if(!/Favoris|Saved/.test(toast)) errors.push(`${path}: saved-items tool did not respond`);

    await page.evaluate(() => openListing("qa-click-listing"));
    await page.getByRole("button", { name:/Envoyer une photo|Send photo/i }).click();
    const photoLine = await page.locator("#chatLog-qa-click-listing").innerText({ timeout:2000 }).catch(() => "");
    if(!/photo/i.test(photoLine)) errors.push(`${path}: send photo action did not update chat`);

    await page.locator("#detailModal").getByRole("button", { name:/Copier le lien|Copy link/i }).click();
    await page.waitForFunction(() => /copié|copied|prêt|ready/i.test(document.querySelector("#toast")?.textContent || ""), null, { timeout:2000 }).catch(() => {});
    toast = await page.locator("#toast").innerText({ timeout:2000 }).catch(() => "");
    if(!/copié|copied|prêt|ready/i.test(toast)) errors.push(`${path}: copy link did not show confirmation, toast="${toast}"`);

    await page.evaluate(() => { closeModal("detailModal"); openBoostInfo(); });
    await page.getByRole("button", { name:/Publier gratuitement|Post free|Annonce gratuite|Free listing/i }).first().click();
    const postOpen = await page.locator("#postModal.open").count();
    if(!postOpen) errors.push(`${path}: free pricing card did not open post modal`);

    await page.close();
  }

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
