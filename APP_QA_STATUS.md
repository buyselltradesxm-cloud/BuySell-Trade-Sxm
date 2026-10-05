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

## Follow-up fixes on 2026-10-05

- Failed or disconnected chat requests preserve the draft and cannot become
  simulated local replies. Repeated clicks cannot submit the same pending draft;
  text typed during a request remains available for the next message.
- Reports and admin changes now require confirmation. Failed feature, status,
  deletion, moderation, report resolution, role, ban, category and ad requests
  preserve the previous state. Moderation and ad deletion adapters reject
  zero-row results rather than treating HTTP success as a saved change.
- Realtime messages are deduplicated, blocked senders are ignored, and unread
  counts decrease only after confirmed read requests. Partial read failures keep
  the remaining messages unread.
- Logout/account changes clear messages and notifications. Late responses from
  the previous account are ignored; a delayed profile cannot restore a signed-out
  identity. Real chat contents are no longer saved in production localStorage.
- Blocks now load after the authenticated identity is applied on first login.
- Signup, login and password recovery handle thrown network failures. Signup and
  recovery no longer promise that an email was sent after a failed request.
  Failed sign-out no longer claims the session ended.
- Notification removal previously waited forever for a service worker that might
  never register, preventing logout in blocked/private browsers. It now checks
  existing registration; other worker readiness waits have an eight-second limit.
  Notification setup also requires backend confirmation.
- Avatar replacement used an overwrite requiring a Storage UPDATE policy that
  is absent in production. New avatars now use unique filenames and INSERT,
  matching existing policies. Disconnected profile uploads preserve the old photo.
- Profile badges no longer invent fast-response history or trusted-member status.
  Verified email comes from Auth confirmation; a paid plan is labelled Pro account.
- The profile photo button had an undefined accessible label. It now has a
  translated label. All 324 keys referenced by app code and HTML translation
  attributes are checked in both languages on both routes.
- The service-worker cache now includes the generated asset release version.

### Release delivery correction

The canonical JavaScript URLs were served from an older four-hour CDN cache
after successful GitHub Pages deployments. This explained the outdated profile
labels still visible in the signed-in browser. All local JavaScript/CSS references
on the three app entry pages now carry a deterministic content version. The PWA
passes that same version to its worker registration and offline cache assets.
The new GitHub Pages workflow generates these versions for every deployment and
checks that backend/tooling files are excluded from the published artifact.
Scheduled listing-page builds also trigger website publication.

Deployment `37319148252` succeeded from commit `5ccbda2`. GitHub Pages is now
configured to publish through GitHub Actions. The live release check passed for
all three entry pages and all 21 referenced assets, including the service worker;
each versioned response matches the local source. The report, asset generator and
database schema return 404 on the production website. Public browsing and login
UI checks also passed on both app routes at desktop and mobile widths.

The existing Tchala session restored in a fresh browser tab after deployment.
The translated photo button and removal of unsupported trust badges are visible
in the real profile. A second already-signed-in account also survived a reload.
No listings, messages, reports or payments were created during these checks.

Public production hydration now hides database seed rows without a `seller_id`.
Those rows were labelled “Example” and had no real owner or messaging path.
They remain in the database for deliberate administrator cleanup, but customers
only see listings belonging to real accounts.

A read-only Supabase query confirmed a recent sign-in for
`tchalaplus@gmail.com` and a confirmed email. This confirms an existing account's
authentication, not new-account email delivery or the remaining paid journeys.

New local checks pass on both routes: messaging failures/session isolation
(32 assertions per route), admin/auth failures and avatar replacement
(56 per route), plus 14 push-client assertions. These are isolated fixtures;
they do not replace real authenticated acceptance tests.

Additional live, read-only checks confirmed custom SMTP is enabled with Resend;
messages are in the realtime publication with RLS and the read RPC grant present;
the INSERT policy enforces bans and blocks; all public tables have RLS enabled;
photo/avatar buckets have 5 MB and JPEG/PNG/WebP limits and own-folder upload rules.
These configuration checks do not establish actual email, upload or chat delivery.

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
- `npm run test:messaging-failures`: drafts, failures, realtime and account isolation.
- `npm run test:admin-auth-failures`: rejected admin/auth changes and avatar paths.
- `npm run test:push-client`: notification readiness and persistence failures.
- `npm run build:assets`: regenerate versioned asset references after app changes.
- `npm run test:assets`: check that the generated asset references are current.
- `npm run test:release`: compare the public versioned assets with local source
  and confirm that selected backend/tooling files are excluded from the site.
- `npm run test:launch-smoke`: isolated public browsing on the live site at desktop
  and mobile sizes; no accounts, listings, messages, reports, or payments created.
- `npm run test:backend`: public reads and explicit anonymous permission denials,
  using synthetic nonexistent listing IDs rather than real listings.
- `node scripts/pwa-check.js`: local PWA and functional offline checks.
- `node scripts/ios-review-check.js`: simulated native bridge checks.

Launch approval must be based on the remaining real acceptance tests, not just
the aggregate test exit code. This report is intentionally excluded from the
production website through `_config.yml`.
