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
