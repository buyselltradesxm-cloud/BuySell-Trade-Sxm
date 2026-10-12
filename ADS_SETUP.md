# Advertising setup — Buy Sell Trade Sxm

## Non-personalized advertising

Account setup (September 10, 2026):
- Publisher: `pub-7816106453580174`.
- Website added to AdSense: `buyselltradesxm.com`; review required.
- AdMob iOS app: `ca-app-pub-7816106453580174~2891833705`.
- iOS banner: `ca-app-pub-7816106453580174/9133808428`.
- Native SDK integration and consent flow are still pending. These production
  IDs must not be used for manual ad testing; use Google's demo units.

`ads.js` sets `adsbygoogle.requestNonPersonalizedAds = 1` before loading
Google and before requesting each unit. This applies to every AdSense
placement, including page-level requests. There is no personalized-ad toggle.
Direct campaigns rotate by placement, dates and weights, without using
account information or browsing history.

Status (September 11, 2026): `ads-config.js` has `adsense.client =
"ca-pub-7816106453580174"` and `pageLevel: true`, so the AdSense loader script
runs site-wide (helps Google's review crawl). Per-slot `adsense.slots` ids are
still empty, so every slot shows a house promo — nothing serves until the site
is approved AND unit ids are added. NPA (`requestNonPersonalizedAds = 1`) is
always on. Reference: https://support.google.com/adsense/answer/9007336?hl=en

## Consent

- `consent.js` shows a lightweight cookie/ads notice (Accept / Decline), stores
  the choice in `localStorage` (`bst_consent`), and exposes `window.BstConsent`.
  A "Cookie choices" link in the footer reopens it.
- Google Analytics (`ads-config.js` → `analytics.ga4`) only loads after Accept.
- The notice defers to a certified TCF CMP if one is present (`window.__tcfapi`).
- **For full EEA/UK compliance you must also publish Google's GDPR message:**
  AdSense → Privacy & messaging → GDPR → create for `buyselltradesxm.com`,
  privacy URL `https://buyselltradesxm.com/privacy.html`, add FR + EN → Publish.
  It then shows to EEA/UK visitors only; `consent.js` steps aside for them.

## Website full-screen ads (vignettes)

The website loads AdSense Auto ads (`adsense.pageLevel: true` in
`ads-config.js`), which can show Google's full-screen vignette between page
navigation events. Vignette enablement and frequency are account settings,
not a site timer: in AdSense, open **Ads → By site → Edit buyselltradesxm.com
→ Overlay formats → Vignette ads**. Google offers one repeat interval from 1
minute to 1 hour; there is no separate 90-second first-ad setting. The site
must be approved and the vignette setting applied before these ads can serve.
For this app's 90-second first / 3-minute later cadence, use AdMob in the
native Android app; don't add a custom timed overlay to the website.

The HTML blocks below are AdSense placements. Native AdMob (app) IDs
(`ca-app-pub-7816106453580174~2891833705`, banner `.../9133808428`) need a
separate SDK integration and are not used by this web setup.

The site now has a single ad system that fills every ad slot in this order:

1. **Direct-sold campaign** — an ad you sold to a local SXM business
2. **Google AdSense** — programmatic, once approved and configured
3. **House promo** — your own Boost / Pro / "Post a free ad" call to action
4. Nothing — the slot collapses to zero height

Everything is controlled from **`ads-config.js`**. That file holds no secrets and
is safe to commit. You do not need to touch `ads.js` or the HTML.

## Ad slots on the site

| Key                   | Where it shows                                   | Device  |
|-----------------------|-------------------------------------------------|---------|
| `desktop-leaderboard` | Full-width band near the top of the page         | Desktop |
| `content-1`           | Band between the featured board and the results grid | Desktop + mobile |
| `home-top`            | Banner in the mobile home flow                   | Mobile  |
| `feed`                | Card repeated inside the results grid (after items 6, 15, 30) | Desktop + mobile |
| `listing-detail`      | Inside the listing detail view — highest dwell time | Desktop + mobile |
| `sticky-bottom`       | Sticky banner above the tab bar — **disabled** in CSS today; ask to enable | Mobile |

For **more inventory** beyond this: turn on AdSense **Auto ads** (set
`adsense.pageLevel: true` in `ads-config.js` and enable Anchor / In-page
formats in the AdSense dashboard) — Google then places extra units and a
between-pages vignette automatically, on top of the fixed slots above.

Disable all ads for a visit by adding `?noads=1` to the URL (useful for demos
and screenshots). Re-enable with `?ads`.

---

## Path A — Direct-sold local ads (earns immediately, no approval)

**Easiest way (no code):** admin panel → **Publicités** tab → "+ Ajouter
une pub". Requires the `supabase/admin-upgrade.sql` migration — see
`ADMIN_UPGRADE_SETUP.md`. This is now the recommended way to manage
campaigns; `ads-config.js` still works as a fallback/seed but every ad you
add there needs a code deploy, unlike the admin tab.

The manual way (editing `ads-config.js` directly) still works if you
prefer it or haven't run the migration yet — add one entry to
`campaigns`:

```js
campaigns: [
  {
    id: "acme-oct",
    placements: ["desktop-leaderboard", "home-top"],
    weight: 1,                       // rotation weight if several are live
    start: "2026-10-01",             // inclusive, visitor local date
    end:   "2026-10-31",             // inclusive
    sponsor: "ACME Rentals",
    url: "https://acme-sxm.example",
    image: "/ads/acme-1200x300.jpg", // repo path or any https URL; optional
    alt:      { fr: "ACME — voitures dès 30€/j", en: "ACME — cars from $32/day" },
    headline: { fr: "Louez une voiture à SXM",   en: "Rent a car in SXM" },
    text:     { fr: "Retrait aéroport, assurance incluse.", en: "Airport pickup, insurance included." },
    cta:      { fr: "Voir les offres",           en: "See deals" }
  }
]
```

- Put creative images in a new `/ads/` folder in the repo and commit them, or
  point `image` at the advertiser's hosted URL (must be `https`).
- Leave `image` out for a text-only ad (headline + text + CTA).
- When `end` passes, the campaign stops showing automatically. Delete old
  entries when convenient.
- Clicks and views fire a `bst:ad` event and a GA4 event (`ad_click` /
  `ad_impression`) if GA4 is on — that's your proof-of-delivery for advertisers.

Suggested launch rate card: sell `desktop-leaderboard` + `home-top` as one
"island banner" package, monthly, flat fee. Keep `feed` for AdSense.

---

## Path B — Google AdSense (passive, needs approval)

### 1. Apply
- Create an account at <https://adsense.google.com> with the site
  `buyselltradesxm.com`.
- **Reality check:** AdSense usually rejects sites with little traffic or thin
  content ("low value content"). Improve your odds first: real listings from
  real users, steady visitors for a few weeks, and the `privacy.html` page
  linked in the footer (it is). If rejected, either resubmit later or use a
  network with a lower bar (Media.net, Ezoic) — the config below is
  AdSense-shaped but the same slots apply.

### 2. Add the verification snippet
AdSense gives you a `ca-pub-XXXXXXXXXXXXXXXX` id. Put it in `ads-config.js`:

```js
adsense: {
  client: "ca-pub-XXXXXXXXXXXXXXXX",
  slots: { "desktop-leaderboard": "", "home-top": "", "sticky-bottom": "", "feed": "" },
  pageLevel: false
}
```

With `client` set and `slots` still empty, the loader script is added site-wide
(enough for AdSense to verify the site) and every slot keeps showing a house
promo until you give it a unit id.

### 3. Create ad units
In AdSense → **Ads → By ad unit → Display ads**, create one unit per slot
(responsive). Copy each unit's `data-ad-slot` number into the matching key:

```js
slots: {
  "desktop-leaderboard": "1234567890",
  "home-top":            "2345678901",
  "feed":                "3456789012"
}
```

### 4. ads.txt (required to get paid)
Edit **`ads.txt`** in the repo root — replace `pub-0000000000000000` with your
real publisher id (the part after `ca-`). Commit and deploy. Verify at
<https://buyselltradesxm.com/ads.txt>.

### 5. CSP
The `Content-Security-Policy` meta tag in `index.html` and `marketplace.html`
already allows the core Google ad domains. If ads still don't render, open the
browser console: a `Refused to load … Content Security Policy` line tells you
which host to add to `script-src` / `frame-src` / `connect-src`. Common extras:
`https://ep1.adtrafficquality.google`, `https://www.google.com`.

If AdSense returns no ad for a slot, the code automatically falls back to a
house promo — a slot is never left blank.

---

## Traffic measurement (GA4) — optional but recommended

Ad revenue optimisation and AdSense review both want traffic data. Create a
GA4 property, then in `ads-config.js`:

```js
analytics: { ga4: "G-XXXXXXXXXX" }
```

That's it — the tag loads with IP anonymisation on. Leave it `""` to keep GA off.

---

## Not done here / needs you

- **AdSense account + approval** — only you can do this.
- **`ads.txt` publisher id** — placeholder until you have it.
- **`sticky-bottom` slot** is hidden by CSS (`.mobile-sticky-ad{display:none}`).
  It's wired and ready; ask to enable it if you want that inventory (note:
  anchored/sticky ads have extra AdSense policy rules).
- **Selling the direct slots** — outreach to local businesses.
