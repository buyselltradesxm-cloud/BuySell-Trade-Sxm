/* ============================================================
 *  ADS CONFIGURATION  —  Buy Sell Trade Sxm
 * ------------------------------------------------------------
 *  This is the ONLY file you edit to control advertising.
 *  It is safe to commit: it holds no secrets (an AdSense
 *  publisher id and slot ids are public by design).
 *
 *  Priority per ad slot, decided at render time by ads.js:
 *    1. A live DIRECT-SOLD campaign  (see `campaigns` below)
 *    2. Google AdSense               (if `adsense.client` is set)
 *    3. A HOUSE promo                (your own Boost / Pro / Post CTA)
 *    4. Nothing — the slot collapses
 *
 *  Slot keys used across the site:
 *    "desktop-leaderboard"  big banner, top of page, desktop only
 *    "content-1"            band between the featured board and the grid (all sizes)
 *    "home-top"             mobile banner in the home flow
 *    "feed"                 in-grid card, repeats down the results grid (all sizes)
 *    "listing-detail"       inside the listing detail view (highest dwell time)
 *    "sticky-bottom"        dismissible mobile banner above the tab bar
 * ============================================================ */
window.AdsConfig = {

  /* ---- master switch ---------------------------------------
   * false = no network ads and no house promos anywhere.
   * You can also disable per visit with ?noads=1 in the URL. */
  enabled: true,

  /* ---- Google AdSense ------------------------------------- */
  adsense: {
    /* ads.js enforces non-personalized requests for every Google unit.
     * Before activation, configure Google's consent/privacy messaging.
     * Non-personalized does not mean cookie-free. */
    /* Your publisher id. Setting this loads the AdSense script
     * site-wide. It is set now so Google's reviewer can crawl the
     * live tag; individual slots still show a house promo until you
     * paste their ad-unit ids below (nothing serves before approval). */
    client: "ca-pub-7816106453580174",

    /* One ad-unit id per slot (the 10-digit number from the
     * AdSense unit you create). Leave "" to fall back to a
     * house promo for that slot even when `client` is set. */
    slots: {
      "desktop-leaderboard": "5151891881",   // top band, desktop
      "content-1": "9916686290",             // between featured board and the grid (desktop + mobile)
      "content-2": "",                       // under the subcategory panel, before the main layout (desktop + mobile) — PASTE SLOT ID TO ACTIVATE
      "home-top": "8398011482",              // mobile banner in the home flow
      "feed": "3399826517",                  // repeats inside the results grid (desktop + mobile)
      "listing-detail": "6995456596",        // inside the listing detail view (high dwell)
      "sticky-bottom": "2086744840"          // dismissible mobile banner above the tab bar
    },

    /* Auto ads. true = also let Google auto-place extra units and a
     * between-pages vignette, on top of the fixed slots above. The real
     * on/off + per-format control lives in the AdSense dashboard
     * (Ads > By site > Auto ads) — turn the vignette down there if it
     * feels heavy once ads are serving. */
    pageLevel: true
  },

  /* ---- AdMob (native app only) -----------------------------
   * Only used inside the packaged Android/iOS app (native-admob.js).
   * The web/PWA never reads this — it keeps using `adsense` above.
   * AdMob requires one ad unit per platform, and the App ID also has
   * to be pasted into the native project (a JS value here can't
   * change it — it's read before the page loads):
   *   Android → android/app/src/main/res/values/strings.xml  (admob_app_id)
   *   iOS     → ios/App/App/Info.plist  (GADApplicationIdentifier)
   *
   * Steps once you have a live AdMob account:
   *   1. admob.google.com → Apps → add this app (Android, then iOS).
   *   2. Ads > Ad units → create one Banner per platform.
   *   3. Paste both App IDs into the native files above, and both
   *      Banner unit ids into `banner` below.
   *   4. Set `testing: false`.
   *   5. `npx cap sync` and rebuild.
   * Until then, Google's public TEST ids below are safe to ship —
   * they show fake ads and can never get the account flagged. */
  admob: {
    // Live since 2026-10-04 for Android (iOS ships without ads for now).
    testing: false,
    banner: {
      android: "ca-app-pub-7816106453580174/5881780931", // "SXM Android Banner"
      ios: "ca-app-pub-3940256099942544/2934735716"       // Google TEST unit; unused while iOS has no ads
    }
    // testingDevices: ["YOUR_DEVICE_ID"], // needed to see real-looking test ads on a physical device
  },

  /* ---- Direct-sold local campaigns -----------------------
   * You sell these yourself to SXM businesses. Add an object
   * per campaign. Dates are inclusive, ISO "YYYY-MM-DD", in
   * the visitor's local time. `image` can be a repo path
   * (e.g. "/ads/acme-1200x300.jpg") or any https URL.
   *
   * Example (delete or edit):
   * {
   *   id: "acme-sept",
   *   placements: ["desktop-leaderboard", "home-top"],
   *   weight: 1,
   *   start: "2026-09-01",
   *   end:   "2026-09-30",
   *   sponsor: "ACME Rentals",
   *   url: "https://acme-sxm.example",
   *   image: "/ads/acme-1200x300.jpg",
   *   alt: { fr: "ACME Rentals — voitures dès 30€/jour",
   *          en: "ACME Rentals — cars from $32/day" },
   *   headline: { fr: "Louez une voiture à Sint Maarten",
   *               en: "Rent a car in Sint Maarten" },
   *   text: { fr: "Retrait à l'aéroport, assurance incluse.",
   *           en: "Airport pickup, insurance included." },
   *   cta: { fr: "Voir les offres", en: "See deals" }
   * }
   *
   * The entry below is a READY TEMPLATE. It is switched OFF (weight: 0).
   * To sell a slot to a business: copy it, set weight to 1, edit every
   * field, drop the creative image in /ads/ (see /ads/README.md), and
   * set start/end. Delete it when you don't need the example.
   */
  campaigns: [
    {
      id: "example-disabled",
      weight: 0,                                   // <-- set to 1 to go live
      placements: ["desktop-leaderboard", "content-1", "home-top"],
      start: "2026-01-01",
      end: "2026-12-31",
      sponsor: "Your advertiser name",
      url: "https://example.com",
      image: "/ads/example-1200x300.jpg",          // optional; remove line for text-only
      alt: { fr: "Texte alternatif de l’image", en: "Image alt text" },
      headline: { fr: "Titre de la publicité", en: "Ad headline" },
      text: { fr: "Une ligne de description.", en: "One line of description." },
      cta: { fr: "En savoir plus", en: "Learn more" }
    }
  ],

  /* ---- House promos (fallback fill) ---------------------- */
  house: {
    enabled: true,
    /* Which promos may appear, cycled per slot. Remove any you
     * don't want. `action` maps to a function already in the app. */
    promos: [
      {
        id: "boost",
        action: "openBoostInfo",
        headline: { fr: "Mettez votre annonce en avant",
                    en: "Put your listing on top" },
        text: { fr: "Plus de vues, plus de contacts. Boost dès aujourd'hui.",
                en: "More views, more buyers. Boost it today." },
        cta: { fr: "Booster", en: "Boost now" }
      },
      {
        id: "pro",
        action: "openPricingInfo",
        headline: { fr: "Passez en compte Pro",
                    en: "Go Pro for your business" },
        text: { fr: "Page boutique, badge Pro, plus d'annonces et de visibilité.",
                en: "Shop page, Pro badge, more listings and reach." },
        cta: { fr: "Voir les offres Pro", en: "See Pro plans" }
      },
      {
        id: "post",
        action: "openPostModal",
        headline: { fr: "Vendez ce que vous n'utilisez plus",
                    en: "Sell what you no longer use" },
        text: { fr: "Publier une annonce est gratuit sur toute l'île.",
                en: "Posting a listing is free across the island." },
        cta: { fr: "Publier une annonce", en: "Post an ad" }
      }
    ]
  },

  /* ---- Labelling & behaviour ---------------------------- */
  label: { fr: "Publicité", en: "Sponsored" },
  houseLabel: { fr: "Buy Sell Trade Sxm", en: "Buy Sell Trade Sxm" },

  /* Lazy-load distance in px before a slot scrolls into view. */
  lazyMargin: 320,

  /* Optional GA4 — only to measure traffic (helps you optimise
   * ads and is basically required for AdSense review). Paste a
   * measurement id like "G-XXXXXXX" to switch it on. */
  analytics: { ga4: "" }
};
