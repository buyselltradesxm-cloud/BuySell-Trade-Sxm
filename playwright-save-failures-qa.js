const assert = require("node:assert/strict");
const { chromium } = require("playwright");

// Local UI regression checks. All backend writes are stubs; no accounts,
// listings, uploads, or payments are created in production.
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const route of ["/", "/marketplace.html"]) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(`${route}: ${error.message}`));
      await page.goto(`http://localhost:5173${route}?local=1`, { waitUntil: "domcontentloaded" });
      const results = await page.evaluate(async () => {
        const results = [];
        const api = window.SB;
        const setup = mode => {
          state.lang = "en";
          state.user = normalizeUser({ id: "qa-save-user", name: "QA Seller", email: "qa@example.com", provider: "supabase" });
          notifications = [];
          userListings = [];
          L.length = 0;
          const listing = { id: "qa-save-listing", ownerId: state.user.id, sellerId: state.user.id,
            t: "QA save", cat: "elec", area: "Marigot", side: "fr", cond: "tbe", cur: "usd",
            usd: 10, eur: 9, ph: 1, status: "active", sold: false,
            createdAt: new Date(Date.now() - 31 * 86400000).toISOString(),
            expiresAt: new Date(Date.now() - 86400000).toISOString() };
          L.push(listing);
          userListings.push({ ...listing });
          state.favs.add(idKey(listing.id));
          notifications.push({ id: "qa-expiry", kind: "listing_expiring", listingId: listing.id });
          const failed = async () => { if (mode === "throw") throw new Error("QA network failure"); return mode === "false" ? false : null; };
          window.SB = { enabled: () => mode !== "offline", confirmListingAvailable: failed, updateListing: failed,
            deleteListing: failed, uploadAvatar: async () => "https://example.com/new-avatar.jpg", upsertProfile: failed };
          window.confirm = () => true;
          return listing;
        };
        const record = (label, pass) => results.push({ label, pass: !!pass });
        for (const mode of ["null", "false", "throw", "offline"]) {
          for (const action of ["renew", "sold", "delete", "sold-remove"]) {
            const listing = setup(mode);
            const before = JSON.stringify(listing);
            const beforeOwned = JSON.stringify(userListings);
            const beforeNotifications = JSON.stringify(notifications);
            if (action === "renew") await confirmListingAvailable(listing.id);
            if (action === "sold") await setOwnListingSold(listing.id, true);
            if (action === "delete") await deleteOwnListing(listing.id);
            if (action === "sold-remove") await markSoldAndRemove(listing.id);
            record(`${action}/${mode}: preserve listing and notifications`,
              L.includes(listing) && JSON.stringify(listing) === before && JSON.stringify(userListings) === beforeOwned &&
              JSON.stringify(notifications) === beforeNotifications && state.favs.has(idKey(listing.id)));
            record(`${action}/${mode}: show failure`, /failed|try again/i.test(document.getElementById("toast").textContent));
          }
          setup(mode);
          history.replaceState({}, "", `${location.pathname}?local=1&listing=qa-save-listing&renew=keep`);
          await handleListingRenewalActionFromUrl();
          record(`renew-link/${mode}: preserve retry link`, new URLSearchParams(location.search).get("renew") === "keep");
          history.replaceState({}, "", `${location.pathname}?local=1`);

          const listing = setup(mode);
          state.user.accountType = "business";
          state.user.accountPlan = "pro-business";
          state.user.subscriptionStatus = "active";
          state.user.subscriptionCurrentPeriodEnd = new Date(Date.now() + 86400000).toISOString();
          const applied = await applyAutomaticIncludedBoosts({ silent: true });
          record(`auto-boost/${mode}: no unconfirmed boost`, applied === 0 && !listing.boosted && autoBoostUsedCountFor(state.user) === 0);

          setup(mode);
          state.user.avatarUrl = "https://example.com/old-avatar.jpg";
          const response = await fetch("icons/icon-192.png");
          if (!response.ok) throw new Error("Avatar test fixture is missing");
          const input = { files: [new File([await response.blob()], "avatar.png", { type: "image/png" })], value: "avatar.png" };
          await handleAvatarChange(input);
          record(`avatar/${mode}: preserve old avatar`, state.user.avatarUrl === "https://example.com/old-avatar.jpg");
          record(`avatar/${mode}: show failure`, /failed/i.test(document.getElementById("toast").textContent));

          for (const editing of [false, true]) {
            const listing = setup(mode);
            SB.insertListing = SB.updateListing;
            SB.uploadPhotos = async () => [];
            editingListingId = editing ? listing.id : null;
            buildPostForm(editing ? listing : null);
            openModal("postModal");
            document.getElementById("newTitle").value = "QA unsaved title";
            document.getElementById("newDesc").value = "QA unsaved description";
            document.getElementById("newPrice").value = "25";
            selectedPostPhotos = ["https://example.com/photo.jpg"];
            selectedPostFiles = [];
            const count = L.length;
            await createListing({ preventDefault() {}, target: document.getElementById("postForm") });
            record(`publish/${editing ? "edit" : "new"}/${mode}: preserve listing and form`,
              L.length === count && listing.t === "QA save" && document.getElementById("newTitle").value === "QA unsaved title" &&
              document.getElementById("postModal").classList.contains("open") && selectedPostPhotos.length === 1);
            closeModal("postModal");
          }
        }
        const listing = setup("success");
        SB.confirmListingAvailable = async () => ({ ...listing, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() });
        await confirmListingAvailable(listing.id);
        record("renew/success: apply confirmed expiration", Math.round((Date.parse(listing.expiresAt) - Date.now()) / 86400000) === 30);
        SB.updateListing = async candidate => ({ ...candidate });
        await setOwnListingSold(listing.id, true);
        record("sold/success: apply confirmed status", listing.status === "sold" && listing.sold);
        SB.deleteListing = async () => true;
        await deleteOwnListing(listing.id);
        record("delete/success: remove confirmed listing", !L.includes(listing) && !state.favs.has(idKey(listing.id)));

        const confirmedBoost = setup("success");
        state.user.accountType = "business";
        state.user.accountPlan = "pro-business";
        state.user.subscriptionStatus = "active";
        SB.updateListing = async candidate => ({ ...candidate });
        const count = await applyAutomaticIncludedBoosts({ silent: true });
        record("auto-boost/success: count confirmed boost", count === 1 && isIncludedAutoBoost(confirmedBoost) && autoBoostUsedCountFor(state.user) === 1);

        const strippedBoost = setup("success");
        state.user.accountType = "business";
        state.user.accountPlan = "pro-business";
        state.user.subscriptionStatus = "active";
        SB.updateListing = async candidate => ({ ...candidate, boosted: false, boost: null });
        const strippedCount = await applyAutomaticIncludedBoosts({ silent: true });
        record("auto-boost/stripped: no unconfirmed entitlement", strippedCount === 0 && !strippedBoost.boosted);

        const partialListing = setup("partial-upload");
        editingListingId = partialListing.id;
        buildPostForm(partialListing);
        document.getElementById("newCat").value = "elec";
        selectedPostPhotos = ["https://example.com/photo.jpg"];
        selectedPostFiles = [new File(["test"], "photo.png", { type: "image/png" })];
        let wroteListing = false;
        SB.uploadPhotos = async () => [];
        SB.updateListing = async candidate => { wroteListing = true; return candidate; };
        await createListing({ preventDefault() {}, target: document.getElementById("postForm") });
        record("upload/partial: do not save missing photos", !wroteListing && selectedPostFiles.length === 1);

        window.SB = api;
        for (const status of ["active", "reserved", "sold", "expired"]) {
          window.db = { from: () => ({ select: () => ({ order: async () => ({ data: [{ id: 123, title: "QA", status }] }) }) }) };
          const [mapped] = await api.fetchListings();
          record(`adapter/${status}: preserve database status`, mapped.status === status);
        }
        for (const deletedRows of [[], [{ id: 123 }]]) {
          let selected = false;
          window.db = {
            auth: { getUser: async () => ({ data: { user: { id: "qa-save-user" } } }) },
            rpc: async () => ({ error: { message: "QA fallback" } }),
            from: () => ({ delete: () => ({ eq: () => ({
              data: deletedRows, select: async () => { selected = true; return { data: deletedRows }; }
            }) }) })
          };
          const removed = await api.deleteListing(123);
          record(`adapter/delete/${deletedRows.length}: require deleted row`, selected && removed === (deletedRows.length === 1));
        }
        return results;
      });
      errors.push(...results.filter(result => !result.pass).map(result => `${route}: ${result.label}`));
      await context.close();
    }
    console.log(JSON.stringify({ coverage: "local UI with stubbed backend failures", errors }, null, 2));
    assert.equal(errors.length, 0);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
