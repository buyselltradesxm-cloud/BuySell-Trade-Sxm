# App QA and launch readiness

Checked: 2026-10-05. Repository: `buyselltradesxm-cloud/BuySell-Trade-Sxm`.

**Launch decision: not yet ready for public launch approval.** Local regression
checks pass, but the real authenticated and payment journeys still need acceptance
tests. A timeout, empty error log, active webhook, or simulated payment is not proof
that a customer can complete those journeys.

## Bugs fixed in this review

- Browser listing expiry and renewal used 14 days while the live Supabase renewal
  function uses 30. Browser behavior and success text now use 30 days.
- Rejected renewal, sold-status, and deletion requests changed local listings and
  showed success. These actions now require backend confirmation and preserve
  reminders, favorites, and retry links on failure or cancelled deletion.
- A failed new-listing request could fall back to a device-only listing and show
  it as published. Real Supabase accounts now keep their form and draft on failure.
- Partial photo uploads could still publish a listing. Saving now requires all
  selected photos to upload successfully.
- A rejected profile update could show a new avatar as saved. The avatar now
  requires confirmation of the profile update.
- Rejected automatic-boost updates consumed the displayed quota and advertised
  an unconfirmed boost. Only confirmed included boosts are applied and counted.
- The database adapter discarded listing status. Active, reserved, sold, and
  expired states are now preserved. The deletion fallback also checks that a row
  was actually deleted, rather than treating a zero-row RLS result as success.
- Apple renewal text used the website price despite a localized App Store price
  elsewhere in the same modal. The disclosure now uses the Apple catalog price.
- Offline navigation returned cached HTML without functioning app scripts. The
  service worker now precaches both app scripts and dependencies and serves
  precached assets from the app-shell cache. Offline functionality is explicitly
  asserted in the PWA check, instead of only checking the page's text.

Changes apply to both `index.html` and `marketplace.html` app bundles.

## Verification completed

Local browser checks passed for listing editing, messaging UI, notifications and
renewal links, blocking, web boost checkout UI, subscription profile, expired-plan
restrictions, automatic boosts, free signup and Pro purchase UI, personal monthly
limits, sharing, deep links, gallery/search, UUID listings, admin visibility,
category forms, clickable sections, and telemetry. These use demo data or stubs;
they do not establish production authentication or payment success.

Additional checks passed for image compression (9 checks), draft storage (16),
push cryptography (5), email template construction, and simulated iOS OAuth and
StoreKit cancelled, pending, rejected, and verified purchase paths. The PWA check
now also tests offline app execution, listing rendering, and draft availability.
The new `npm run test:save-failures` covers null, false, and thrown backend failures,
confirmed saves, stripped boost entitlements, incomplete uploads, database status
mapping, and zero-row deletion results on both app pages.

The strengthened PWA check passes 14/14 assertions, including both offline app
pages. Live public browsing, listing details, search and login UI pass at 1280px
and 390px on both routes, with 41 public listings returned by Supabase.

Live, read-only Supabase evidence from the destination owner's dashboard:

- Production project: `szhaxlmronirhnntlwyb`, organization
  `mykgcmefitqivyamutzg`, Free plan, status Healthy.
- Six Auth users and six profiles; zero seller-owned listings and zero messages.
  This does not prove successful listing creation or chat delivery.
- Six scheduled jobs active; no cron failures recorded in the last 24 hours.
- Renewal RPC exists and its live definition uses 30 days.
- Email queue empty; payment webhook event and Stripe boost purchase tables empty.
- No rows in the client-error table at the time of the check.
- Public listings read succeeds. Anonymous profile/report access and admin RPCs
  explicitly return permission denial (`401`, PostgreSQL code `42501`).

Live Stripe dashboard evidence:

- Account `acct_1RMcyaQplshpsW9H`, display name Korek Digital (Hostinger Ecommerce).
- Active destination `Buy Sell Trade SXM - Supabase webhook` points to
  `https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/stripe-webhook`.
- Subscribed events: `checkout.session.completed`,
  `customer.subscription.updated`, and `customer.subscription.deleted`.
- Dashboard shows no delivered events in the displayed week. Webhook signature
  matching and successful checkout-to-entitlement delivery remain unverified.

## Acceptance tests still required before launch

1. Two disposable real accounts: signup, confirmation email, login/logout,
   password recovery, Google/Apple authentication, and session restoration.
2. Real photo upload and listing creation; visibility in a second signed-out
   session; editing, renewal, sold state, deletion, and cleanup of QA data.
3. Two-account chat: send/receive, unread count, realtime updates, blocking and
   reporting; real browser notification delivery and reminder-email delivery.
4. Stripe test-mode checkout: subscription and boost delivery, correct account
   entitlements, rejected/cancelled checkout, duplicate-event safety, billing
   portal cancellation, and expiration. Do not create live charges as a test.
5. Real installed iOS/Android device checks for login callbacks, camera/photo
   selection, keyboard/navigation, network interruption, and native purchase
   restoration where supported. A stubbed native bridge is not a device test.
6. Verify a usable backup and restoration procedure while keeping the Free plan.

The headless live-flow test now fails when authentication times out; it no longer
reports an assumed CAPTCHA timeout as a successful test. A timed-out request may
still complete, so reconcile any previous QA accounts before retrying signup.

## Repeatable checks

Most existing UI scripts require a local server on port 5173. Start one bound to
`127.0.0.1`, then run the relevant `npm run test:*` commands. Stop only the server
process you started.

- `npm run test:save-failures`: local save/error regression checks.
- `npm run test:launch-smoke`: isolated public browsing on the live site at desktop
  and mobile sizes; no accounts, listings, messages, reports, or payments created.
- `npm run test:backend`: public reads and explicit anonymous permission denials,
  using synthetic nonexistent listing IDs rather than real listings.
- `node scripts/pwa-check.js`: local PWA and functional offline checks.
- `node scripts/ios-review-check.js`: simulated native bridge checks.

Launch approval must be based on the remaining real acceptance tests, not just
the aggregate test exit code. This report is intentionally excluded from the
production website through `_config.yml`.
