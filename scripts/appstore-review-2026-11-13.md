# Apple rejection follow-up — 13 November 2026

Changes are local, not deployed or submitted.

## Findings
- Apple reported 4.2 (browser-like experience) and 3.1.2(c) (missing EULA metadata). Fixing the description alone cannot resolve 4.2.
- Current source already includes SwiftUI browsing, saved listings, posting with photo selection and protected drafts, and native messaging. These are prior changes, not newly implemented in this session.
- GitHub run 42592824174 successfully compiled and smoke-tested a simulator build at 7565413 on November 9. Its signed IPA job was skipped. This does not establish App Store submission.
- Run 38458807691 uploaded a signed build at 70e68f4 on October 13. That commit is an ancestor of main; native browsing and workflow additions appear later. It is a candidate for the October review, NOT a verified match: the reviewed build number remains unavailable.
- App Store Connect redirected to login; browser access subsequently became unavailable. The full review thread, selected build, localizations and current metadata could not be verified.

## Fixes made
- An empty native store product response no longer remains cached permanently. Opening pricing again retries the store request; successful catalogs remain cached.
- Isolated the iOS authentication/StoreKit regression fixture from the AdMob SDK, which overwrote its synthetic Capacitor bridge. The observed authentication test failure was a fixture issue, not evidence that production sign-in was broken.
- Regenerated versioned web assets and service-worker release identifier.

## Validation
Passed: store-catalog recovery regression; native workflow adapter tests; native/legacy browser workflow routing and responsive layouts on both pages; iOS OAuth and Apple sign-in fixtures, cancelled/pending purchases, failed/successful delivery, localized price disclosures and restore controls on both pages; password-reset PKCE; signup auto-signin; push encryption (5/5); asset version consistency.
These fixtures do not prove real StoreKit purchases, camera permissions, native authenticated messaging, or physical-device acceptance. No new native build was triggered.

## Required to finish
1. Restore App Store Connect access and identify the exact rejected build and its CI commit.
2. Add the following to EVERY localized App Description (or verify a custom EULA is configured):
   Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
   French: Conditions d’utilisation (EULA) : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
3. Verify Privacy Policy field: https://buyselltradesxm.com/privacy.html
4. Deploy the matching web changes, validate a signed native build on iPhone/iPad and StoreKit sandbox, and record the native posting/draft/messaging and subscription/legal-link flows Apple requested.
5. Attach the verified build and recording, update Review Notes, then resubmit. Existing draft notes and recording checklist are in scripts/appstore-review-2026-11-05.md; update their stale build status before use.

Apple retains discretion under 4.2; no approval guarantee or exhaustive bug-free claim is made.
