const { chromium } = require("playwright");

const siteUrl = "https://buyselltradesxm.com/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const email = `qa-user-${stamp}@buyselltradesxm.com`;
  const password = `QA-${stamp}-BuySellTrade!`;
  let listingId = null;

  page.on("pageerror", err => errors.push(err.message));
  page.on("console", msg => {
    const text = msg.text();
    if (msg.type() === "error" && !text.includes("400") && !text.includes("401")) {
      errors.push(text);
    }
  });

  await page.goto(`${siteUrl}?live-flow=${stamp}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => window.SB && window.SB.enabled && window.SB.enabled(), null, { timeout: 15000 });

  const result = await page.evaluate(async ({ email, password, stamp }) => {
    const out = {
      email,
      signedUp: false,
      signedIn: false,
      profileUpserted: false,
      uploadedPhotos: 0,
      insertedListing: null,
      visiblePublicly: false,
      normalUserAdminRpcRejected: false,
      ownerDeletedListing: false
    };

    const signup = await window.SB.signUp(email, password, `QA User ${stamp}`);
    if (signup.error) out.signupError = signup.error.message;
    out.signedUp = !!signup.data?.user && !signup.error;

    let user = await window.SB.currentUser();
    if (!user) {
      const signin = await window.SB.signIn(email, password);
      if (signin.error) out.signinError = signin.error.message;
      user = signin.data?.user || null;
    }
    out.signedIn = !!user;
    if (!user) return out;

    const profile = await window.SB.upsertProfile({
      name: `QA User ${stamp}`,
      account_type: "personal",
      account_plan: "personal-free"
    });
    out.profileUpserted = !!profile;

    const pngBytes = Uint8Array.from([
      137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,
      0,0,0,13,73,68,65,84,120,156,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130
    ]);
    const file = new File([pngBytes], `qa-${stamp}.png`, { type: "image/png" });
    const photos = await window.SB.uploadPhotos([file]);
    out.uploadedPhotos = photos.length;

    const listing = await window.SB.insertListing({
      id: Date.now(),
      ownerId: user.id,
      sellerName: `QA User ${stamp}`,
      t: `QA TEST backend flow ${stamp} - delete me`,
      cat: "elec",
      sub: "phones",
      side: "fr",
      area: "Marigot",
      cond: "good",
      cur: "eur",
      eur: 1,
      usd: 1,
      delivery: "meetup",
      meetup: "public",
      negotiable: false,
      safeMeet: true,
      ph: 0,
      pics: photos.length,
      photos,
      desc: "Automated QA listing. Safe to delete.",
      pro: false,
      urgent: false,
      feat: false
    });
    out.insertedListing = listing ? { id: listing.id, title: listing.t, sellerName: listing.sellerName, photos: listing.photos?.length || 0 } : null;
    if (!listing) return out;

    const allListings = await window.SB.fetchListings();
    out.visiblePublicly = Array.isArray(allListings) && allListings.some(item => String(item.id) === String(listing.id));

    const rpc = await window.db.rpc("admin_set_listing_status", { listing_id: listing.id, new_status: "sold" });
    out.normalUserAdminRpcRejected = !!rpc.error && /admin only/i.test(rpc.error.message || "");

    out.ownerDeletedListing = await window.SB.deleteListing(listing.id);
    return out;
  }, { email, password, stamp });

  listingId = result.insertedListing?.id || null;

  if (!result.signedUp) errors.push(`signup failed: ${result.signupError || "unknown"}`);
  if (!result.signedIn) errors.push(`signin failed: ${result.signinError || "maybe email confirmation is required"}`);
  if (result.signedIn && !result.profileUpserted) errors.push("profile upsert failed");
  if (result.signedIn && result.uploadedPhotos !== 1) errors.push(`photo upload failed: ${result.uploadedPhotos}`);
  if (result.signedIn && !result.insertedListing) errors.push("listing insert failed");
  if (result.insertedListing && !result.visiblePublicly) errors.push("created listing was not visible through fetchListings");
  if (result.insertedListing && !result.normalUserAdminRpcRejected) errors.push("normal user could call admin RPC");
  if (result.insertedListing && !result.ownerDeletedListing) errors.push(`owner cleanup failed for listing ${listingId}`);

  console.log(JSON.stringify({ errors, result }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
