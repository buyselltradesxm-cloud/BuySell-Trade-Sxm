# Second pre-build review — 16 November 2026

Decision: hold App Store resubmission. No native build, TestFlight upload, group reassignment or review submission was triggered. Local technical checks pass; native runtime acceptance and Apple's product/beta-evidence request remain open.

## English-first behavior

- New visits to both web entry pages default to English, including on French-language devices. Initial page text, title/social metadata, startup page and offline heading are English.
- The FR control remains available. A saved language preference is respected across reloads and both entry pages; an existing saved French preference is retained.
- iOS source now defaults the native shell/workflow fallback to English and remembers the selected native language. Android source defaults to English rather than the device locale. These native startup changes require a future binary; no claim is made that editing Swift/Java updates installed binaries.
- `npm run test:default-language` covers 12 browser-fixture combinations: two entry pages, English/French device locales and web/iOS/Android environments. It verifies first-visit English, French switching, French tagline preservation, reload persistence and shared preference across routes. Native bridge fixtures are not real device runs.

## Additional issues fixed locally

1. **Unreadable native draft could block posting indefinitely.** A failed restore left `restored` false, disabling both Publish and Discard. Closing/reopening could hit the same unreadable file again. Added a retry action, enabled confirmed discard after restore failure, and reset recovery state after discard. Also added a retry action for a failed draft save. No existing draft was deleted during this review.
2. **Missing app-level required-reason declaration.** Native source directly accesses `UserDefaults` for local settings, cached listings and saved items, but the app target had no `PrivacyInfo.xcprivacy`. Added the app-local UserDefaults reason `CA92.1`, wired the manifest into Xcode resources, and added a read-only gate to both native workflow jobs. Signed export will also lint the manifest actually bundled in the IPA. This addresses an additional upload/compliance risk; Apple did not identify it as the cause of the current rejection.

Reference: [Apple TN3183](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest).

The initial suspicion about the `published` flag preventing a second draft was ruled out: the existing success screen's **Create another listing** action resets it. No fix was applied for that non-issue.

## Validation

- Expanded existing regression batch after changing language defaults: **39 suites passed**. Results and per-suite logs are under ignored `scripts/artifacts/prebuild-english-2026-11-16/`.
- Additional passing checks: default-language scenarios; iOS OAuth/purchase/restore browser fixtures on both pages; 324 translation keys in both languages on each page; French payment fixture; native/legacy entry routing and responsive layout; privacy declaration/resource gate; native property-list and Xcode project lint; unique Xcode object IDs; JavaScript syntax and asset-version consistency.
- `swiftc -frontend -parse` passed for the modified native Swift files. This checks syntax only; it does not type-check against the iOS SDK, compile the app, or establish device behavior.
- The previous committed release passed live public browsing and byte-for-byte release checks before the new English changes. Repeat those checks after deploying this change.
- No production signups, messages, listings, real payments or account deletions were submitted by these checks.

## Apple's current review blocker

App Store Connect was rechecked: the rejected submission is still **1.0.2 (3)** under **4.3.0 Design: Spam**. The latest Apple message concerns **4.3 and 4.2.6** and requests detailed product, ownership/shared-code and beta-feedback evidence. The November 16 developer reply is still the latest response; no newer Apple message was displayed.

The legal-link metadata was previously verified in both descriptions and the privacy-policy field. The blocker cannot be closed by passing unit/browser fixtures or by changing the displayed version number. Keep the device and external-feedback record in `scripts/beta-acceptance-2026-11-16.md` factual.

Before App Store submission, verify review-account UI login/CAPTCHA, camera permission allow/deny, native draft recovery, publishing, two-account messaging/report/block, and real StoreKit sandbox purchase/restore on the intended signed build. Record iPhone/iPad device details and actual feedback with fixes/retests. A future build must compile and pass those checks; this review does not guarantee Apple approval.
