# Apple readiness check — 22 November 2026

Decision: hold resubmission until the installed iPad Profile flow is verified.
No App Store submission, review reply, deployment or app-code change was made.

## Current authoritative rejection

Read directly in App Store Connect: the latest message is Apple's
18 November, 12:13 response under Guideline 2.1(a), App Completeness.
On iPad Air 11-inch (M3), iPadOS 27.0.1, with an active internet connection,
Discover displayed ads but Profile did not load its contents.
Version 1.0.6 (1) remains rejected; nine associated items are ready for review.
The resubmit button is disabled in the submission detail view.
This supersedes the earlier pending price-confirmation status.

Submission: https://appstoreconnect.apple.com/apps/6809964445/distribution/reviewsubmissions/details/4eff6f75-7c79-472d-ab49-4a688b5379a3

## Checks completed

- Live public browsing, listing details, search and login UI passed on both
  routes at 390, 1280, 820 and 1180 pixel widths; 17 public listings, no page errors.
  The last two viewports used 820x1180 and 1180x820 for tablet coverage.
- Current-source iOS bridge fixtures passed OAuth, cancelled/pending purchases,
  delivery failures, verified delivery, localized prices, restore controls and
  Profile tab assertions, including an 820x1180 run.
- Native workflow browser fixtures passed at a tablet viewport; tablet layout
  and reduced-motion checks passed at 820 and 1180 pixel widths on both routes.
- Store recovery, native workflow validation, app privacy/resource checks and
  asset-version consistency passed.
- Feed advertising checks passed after starting their required local server.
- Public backend reads and anonymous permission-denial checks passed.
- App home, terms and independent privacy host returned HTTP 200.
- Public DNS resolved the app domain through both 1.1.1.1 and 8.8.8.8.

## Important distinctions

The website release check failed because live assets advertise version
5dedca9ebf4ea533 while this branch advertises 2f0bf0cb9acc6bb8.
The checkout includes unpublished inline-ad changes. The live site and this
branch must not be described as the same release.

The latest successful signed iOS workflow is 43960931034, source bafcb41,
for the separate 1.0.7 candidate. The rejected 1.0.6 source is
1634002218002f59b817a6107bd2526cb5c335b8, workflow 43872414515.
The native root controller, plugin and native-ios.js have no diff between
that rejected source and the current checkout.

Browser fixtures simulate the native bridge; tablet viewport tests are Chromium
tests, not installed iPad/WebKit execution. No new signed build or Xcode test
was run in this session. Real authentication, payments, camera and push delivery
were not exercised. The earlier session recorded passing baseline bridge,
privacy, store recovery and native workflow checks against the rejected source.
This session also reran that exact rejected source's iOS bridge suite at
820x1180; both routes passed, including the simulated Profile flow.

The user has an iPhone only. An installed iPad test remains outstanding:
fresh install and upgrade, Discover to Profile, signed-out sign-in content,
signed-in profile, cold start, slow connection and retry after a load failure.
Record exact TestFlight version/build and device/OS with the result.

The earlier domain outage could explain the review failure, but current
reachability does not establish that historical cause or prove it fixed.

## iPad screen emulation follow-up

Set a visible Chrome preview to 820x1180 and verified the account screen opens.
Added repeatable `node scripts/ipad-screen-check.js`: Windows WebKit 26.6,
820x1180 portrait / 1180x820 landscape, screen matching the viewport, 2x
scale, iPad user agent and hasTouch enabled. Both live routes passed listing
and sign-in rendering, tap navigation, no horizontal overflow and no page errors.
Screenshots/results are in scripts/artifacts/ipad-air/ (ignored by Git).
The physical portrait screenshot is 1640x2360 pixels, matching Apple's M3 Air
11-inch display resolution: https://support.apple.com/en-us/122241

Limits: Windows WebKit reports navigator.maxTouchPoints as 0 even with hasTouch;
the tap actions passed. The existing native bridge fixture failed to initialize
SXM under this engine and is not counted as passing. No installed iPad result
or iPadOS 27.0.1 result is claimed. No app source was changed or submitted.
