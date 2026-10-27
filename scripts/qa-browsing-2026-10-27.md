# Browsing review — 2026-10-27

Account-exit fixes were deployed first in commit `55ad536`, GitHub Pages run `40564621721`. All three live entry pages and 22 assets matched release `e65501e69c903d31`; desktop/mobile public browsing passed on both routes.

## Additional fixes

- Keyboard Enter/Space on a button inside a listing card no longer triggers the card's listing-open handler. Keyboard activation of the card itself remains supported.
- Favorite buttons on the featured board and main grid synchronize their state and accessible action labels.
- The favorites shortcut clears filters when they hide all saved listings, making saved items reachable.
- Search resets the category rail and subcategory panel to match its all-category results.
- Area selection updates both area controls consistently.
- Gallery/search QA stubs the external ad loader so navigation cancelling an ad request cannot cause a false feature failure. Gallery and search assertions remain intact.

## Validation

The initial browser reproduction failed seven assertions per viewport/route combination. The final new suite passes 36 checks across desktop/mobile and both routes. Run `npm run test:browse-controls` against a local server on port 5173; `APP_QA_BASE_URL` can target the deployed frontend. The suite uses isolated contexts and in-memory listings and performs no backend writes.

Additional passing checks: gallery/search, clickable sections, sharing, deep links, UUID listings, blocked users, category forms, monthly limits, editing, pricing/payment fixtures, subscription profiles, 334 translation keys per route, and 14 PWA/offline checks. Public backend health and anonymous access denial checks passed. JavaScript syntax, generated versions, and diff whitespace checks passed.

The browsing release asset version is `d5ed04c5528e2a5a`. Actual payment settlement, two-account production chat, email delivery, native-device behavior, and real account deletion remain outside this review's verified coverage. Passing these checks does not establish that every app feature is bug-free.
