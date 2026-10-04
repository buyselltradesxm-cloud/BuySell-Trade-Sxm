const { chromium } = require("playwright");

// Blocking a user: their listings and conversations disappear for the
// blocker, the block is listed in the profile, and unblocking restores them.
// Supabase is stubbed in the page; the message-blocking rule itself lives in
// supabase/user-blocks.sql and is not exercised here.
(async () => {
  const browser = await chromium.launch();
  const errors = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`http://localhost:5173${path}?local=1`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      state.user = normalizeUser({
        id: "qa-block-user",
        name: "QA Block",
        email: "qa-block@example.com",
        accountType: "personal",
        accountPlan: "personal-free"
      });
      state.user.provider = "supabase";
      ["seller-a", "seller-b"].forEach((sellerId, i) => {
        L.unshift({
          id: `qa-block-${i}`, ownerId: sellerId, sellerId, seller: i ? "Bob" : "Alice",
          t: `Block listing ${i}`, cat: "elec", area: "Marigot", side: "fr", cond: "tbe",
          cur: "usd", eur: 10, usd: 11, ph: 1, createdAt: new Date().toISOString()
        });
      });
      const blocked = new Set();
      const message = (id, listingId, from) => ({
        id, listing_id: listingId, sender_id: from, recipient_id: "qa-block-user",
        sender_name: from === "seller-a" ? "Alice" : "Bob", body: `Hello from ${from}`,
        read: true, created_at: new Date().toISOString()
      });
      window.qaBlockCalls = [];
      window.SB = Object.assign(window.SB || {}, {
        enabled: () => true,
        currentUser: async () => ({ id: "qa-block-user" }),
        fetchBlocks: async () => [...blocked].map(id => ({ id, name: "" })),
        blockUser: async (id, name) => { blocked.add(id); window.qaBlockCalls.push(["block", id, name]); return true; },
        unblockUser: async id => { blocked.delete(id); window.qaBlockCalls.push(["unblock", id]); return true; },
        fetchInbox: async () => [["qa-block-0", "seller-a"], ["qa-block-1", "seller-b"]]
          .filter(([, other]) => !blocked.has(other))
          .map(([listingId, other], i) => ({
            key: `${listingId}:${other}`, listingId, otherId: other, otherName: other === "seller-a" ? "Alice" : "Bob",
            lastBody: `Hello from ${other}`, lastAt: new Date().toISOString(), unread: 0,
            messages: [message(i + 1, listingId, other)]
          })),
        markConversationRead: async () => 0
      });
      render();
    });

    const visibleBefore = await page.evaluate(() => L.filter(passesFilters).filter(l => String(l.id).startsWith("qa-block-")).length);
    if (visibleBefore !== 2) errors.push(`${path}: test listings not visible before blocking (${visibleBefore})`);

    await page.evaluate(() => openMessages());
    await page.locator("#messagesModal.open .msgr-item").first().waitFor({ timeout: 3000 });
    if (await page.locator("#messagesModal.open .msgr-item").count() !== 2) errors.push(`${path}: inbox should start with 2 conversations`);

    // Block Alice from the conversation header.
    await page.locator("#messagesModal.open .msgr-item", { hasText: "Alice" }).click();
    const blockBtn = page.locator("#msgrBlock:not([hidden])");
    if (!(await blockBtn.count())) errors.push(`${path}: block button missing in conversation header`);
    else await blockBtn.click();
    await page.waitForFunction(() => document.querySelectorAll("#messagesModal.open .msgr-item").length === 1, null, { timeout: 3000 })
      .catch(() => errors.push(`${path}: blocked conversation still listed in the inbox`));

    const afterBlock = await page.evaluate(() => ({
      calls: window.qaBlockCalls,
      blocked: isBlockedUser("seller-a"),
      listings: L.filter(passesFilters).filter(l => String(l.id).startsWith("qa-block-")).map(l => l.sellerId)
    }));
    if (!afterBlock.blocked || afterBlock.calls[0]?.[1] !== "seller-a") errors.push(`${path}: block was not recorded`);
    if (afterBlock.listings.join() !== "seller-b") errors.push(`${path}: blocked seller's listing still in the feed (${afterBlock.listings})`);

    // The profile lists the block and can undo it.
    await page.evaluate(() => { closeModal("messagesModal"); openProfile(); });
    const unblock = page.locator('#profileModal.open [data-click="unblockUser"]');
    await unblock.waitFor({ timeout: 3000 }).catch(() => errors.push(`${path}: blocked user not listed in profile`));
    const profileText = await page.locator("#profileModal.open").innerText();
    if (!/Alice/.test(profileText)) errors.push(`${path}: blocked user's name missing in profile`);
    if (await unblock.count()) await unblock.click();
    await page.waitForFunction(() => !isBlockedUser("seller-a"), null, { timeout: 3000 })
      .catch(() => errors.push(`${path}: unblock did not clear the block`));
    const visibleAfter = await page.evaluate(() => L.filter(passesFilters).filter(l => String(l.id).startsWith("qa-block-")).length);
    if (visibleAfter !== 2) errors.push(`${path}: listing did not come back after unblocking`);

    // A user cannot block themselves.
    const self = await page.evaluate(() => blockUser(state.user.id, "me"));
    if (self !== false) errors.push(`${path}: blocking yourself should be refused`);

    await page.close();
  }

  await browser.close();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("Block user QA passed");
})();
