# App discovery and measurement — 22 November 2026

## Website

English download page: https://buyselltradesxm.com/app.html

French download page: https://buyselltradesxm.com/app-fr.html

Google Play is publicly available. The iOS page deliberately says coming soon
while 1.0.8 (1) is Waiting for Review. Replace that label with the actual public
App Store link after approval; do not send visitors to TestFlight as a download.

## Measurement

GA4 property 563181887, web stream 16393951625, measurement ID G-SLB7ZS2GCR.
Enhanced measurement was disabled in the console. Explicit consent is required;
native app webviews are excluded. Query strings, fragments and referrers are
removed from reported page URLs. Advertising storage/signals remain denied.

Events: `app_download_page_view` and `app_store_click` (store, placement,
language), alongside page views. Website click-through rate is consenting
sessions with a store click / consenting download-page sessions. These events
are not install confirmations. Google Play's own acquisition/conversion reports
and App Store Connect Analytics measure actual store performance separately.
The Play link carries a fixed website campaign referrer.
`app_store_click` is configured as a GA4 key event, once per session, with
no invented monetary value. Live ingestion and install attribution are not
established by the code tests; check real consented traffic and store reports.

Google Play baseline shown for 23 October–19 November 2026: default listing
27 visitors, 29.6% conversion. Small samples are volatile. No improvement is
claimed before comparable post-release data exists.

## Store copy

Exact bilingual copy, subtitles and keywords: app-store-copy-2026-11-22.json.
Names <=30, Apple subtitles <=30, keywords <=100, Play short descriptions <=80,
and full descriptions <=4000 characters, verified locally.

Four Play changes (EN/FR short and full descriptions) were saved and sent for
review. Check Publishing overview for quick-check and review completion.
Apple allowed edits while Waiting for Review: EN/FR subtitles, descriptions
and keywords were saved in App Store Connect. Apple descriptions append the
standard Apple EULA link. The existing 1.0.8 submission was preserved.

## Next native build

Verified HTTPS links support existing `/?listing=ID`, `/l/ID.html` and
`/s/ID.html` URLs, with browser fallback when the app is absent. Android's
association fingerprint was copied from the app's Play signing page, not the
upload key. iOS uses verified team CJ7X9S5JDT and the existing bundle ID.

Native review requests follow at least two successful publishing actions over
at least seven days, with a 120-day cooldown. Native store dialogs alone are
used; no incentives, rating gating or custom review prompt. A request does not
prove that a dialog appeared or a review was submitted. Old app builds ignore
the new bridge method safely.

Play flags release 1.0.6 DEX obfuscation at 0%, deadline February 2027. R8 is
enabled for release builds with Capacitor bridge keep rules and line numbers.
Crash/ANR data is unavailable, not zero. Existing JS error reporting remains.

Native 1.0.9 validation builds succeeded: signed iOS run 45070529524 (upload
disabled) and signed Android run 45070507143 (track none). They do not replace
the current store build or prove installed-device
deep links, prompts or optimization percentages. Check signed build results,
verify association response MIME, and test actual devices before release.

## Live verification completed 23 November 2026

PR 13 merged as e8feca2b3a4616f4292eb2648902fd563a220f7a. PR 14 fixed the
Pages archive excluding dot directories and merged as
4bf6a8c51b97c2028f49bf3fd3c31db8dbe7ab20. Deployment 45071279385 succeeded.
Live asset release: c8c45181a1d03005. All 23 sitemap URLs return HTTP 200.
Both download pages expose correct language/canonical/store links.

Both association endpoints return HTTP 200 without redirects and parse as JSON.
Cloudflare response-header rule 9b77b24133d4494684e5036531aa691b sets
`Content-Type: application/json` only when URI Path equals
`/.well-known/apple-app-site-association`. This corrects GitHub Pages' default
application/octet-stream response for the extensionless file. Existing security
headers remain active. Android assetlinks.json already has the correct MIME.

Local evidence is in scripts/artifacts/: app-growth-ga-key-event-2026-11-22.jpg,
app-growth-play-review-2026-11-22.jpg, app-growth-link-rule-2026-11-23.jpg and
app-download-{390,1440}-{en,fr}.jpg. These ignored proof files remain local.

## TestFlight delivery completed 23 November 2026

Signed iOS 1.0.9 (1) uploaded successfully in workflow run 45141355298 from
8a2b7d0c65ce06811f41f141154f860c074d3462. App Store Connect processed the build
(UUID a6f122d8-f387-455f-8a9b-515acd40e364). Bilingual test notes were saved,
and the build was assigned to SXM Internal Testing, shown with one tester.
Local proof: scripts/artifacts/testflight-1.0.9-internal-2026-11-23.jpg.
Installed-device verification is still required; TestFlight does not display
the native App Store review prompt. The existing public submission 1.0.8 (1)
remains Waiting for Review and was not replaced.

Apple's successful-delivery email reports ITMS-90725: this build uses iOS 26.5
SDK, with iOS 27 SDK / Xcode 27 required starting April 2027. This is a future
requirement warning, not a rejected delivery. Current macos-latest selected
Xcode 26.6. GitHub's standard macOS 26 inventory lists Xcode 26.6 as default;
its Xcode 27 preview announcement still describes a beta toolchain. Before
April 2027, select a stable Xcode 27+ runner, rebuild, verify the actual SDK in
the build log, and test the resulting signed app before public submission.
Sources:
https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md
https://github.com/actions/runner-images/issues/14404

PR 15 merged the optional internal TestFlight API helper and its focused tests
as 5422a67ccb93e5442522b7e993bb3fb5854e095e. The helper was not run against Apple;
the group assignment and notes above were completed and verified in the UI.
