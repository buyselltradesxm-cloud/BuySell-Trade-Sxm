# Large inline AdMob candidate — 17 November 2026

Source: bafcb41f60fb733bb7dab245a9570001c3f8d74a on codex/large-inline-admob-20261116. Draft PR: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/pull/8

- Android run 43960924217 succeeded. Signed version 1.0.7 AAB and side-by-side debug preview APK downloaded. APK signature and AAB jar signature verified. The preview reports 1.0-preview and uses Google sample ad units; the release bundle uses configured production units. No Google Play upload was requested (track=none).
- iOS run 43960931034 succeeded: full compilation, distribution signature/entitlement checks and App Store Connect upload. Downloaded IPA metadata confirms 1.0.7 (1), the correct bundle identifier and production AdMob application identifier.
- App Store Connect directly showed 1.0.7 build 1 processed (Ready to Submit). Assigned it to the existing SXM Internal Testing group; build detail showed that group and one existing tester. Build ID: be4e163d-e138-4567-89af-9094f6a3b3d7.
- Neither candidate was submitted for public release. The existing 1.0.6 (1) review build was not replaced.
- Actual device/ad-fill acceptance remains pending. Local browser fixtures, native workflow checks, Android Java compilation, Swift parsing, translations and asset-version checks passed. The general static UI audit timed out; the live byte-for-byte release check differed from this unpublished branch and no built website artifact existed for the website secrets gate.
- Optional bilingual TestFlight test-note entry was interrupted by a browser timeout; saving those notes was not verified. Internal group assignment was verified before the interruption.

AdMob is consent-gated, excluded for the existing Pro/Saved cases, allowed up to 300 points/dp high and uses its returned creative height. The large matching WebView slot never substitutes a house promotion, direct campaign or AdSense.
