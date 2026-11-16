# Release remediation — 16 November 2026

## Fixed in source

1. Failed iOS transaction-listener registration marked the listener active permanently. Subsequent purchase recovery skipped registration. The listener is now marked active only after registration succeeds. A regression fixture reproduced the original failure (one attempt instead of two) and now passes, including protection against duplicate successful listeners.
2. Apple and Google Play verification requests had no deadline. A stalled preparation or verification could keep the purchase flow locked indefinitely. Both paths now abort after 30 seconds, release the lock, clear the timer and explain recovery through Restore Purchases. Unverified Apple transactions remain unfinished. Tests cover stalled preparation and verification followed by successful retry on both platforms.
3. Added `npm run test:store-recovery` to the website deployment gate so catalog, listener and request recovery regressions block publishing.

These are website-delivered bridge changes. They do not change native Swift source and do not themselves require a new binary to reach an existing compatible TestFlight build.

## Verified in App Store Connect

- Latest Apple message: November 13, 20:51 (displayed local time), **4.3 Spam / 4.2.6 App Generation Services**. This supersedes the earlier assumption that the current rejection was only 4.2 / EULA.
- Apple asks for substantive answers to nine questions and beta-feedback examples. A developer reply on November 16 already addresses these questions and states that external beta validation will precede resubmission. No further message was sent.
- French and English descriptions contain Apple's Standard EULA, marketplace Terms and Privacy Policy links. The French Privacy Policy field is correct. No metadata edits were necessary for those links.
- Rejected submission: **1.0.2 (3)**. Replacement candidate: **1.0.3 (3)**, internal group only, one invitation and no installation/session/feedback counts displayed.
- External group `test externe bst` is associated with **1.0.3 (1)**: two installations, 30 sessions, no feedback count displayed. Those metrics cannot be attributed to the replacement build.
- Group assignments, review build selection and store submission were not changed. Assigning a new external build may require beta review and may notify testers; the current candidate still needs internal device acceptance first.

## Verification and limits

Passed: store recovery fixtures (iOS and Android); existing iOS OAuth/purchase/restore browser fixtures on both pages; native/legacy routing and 320/390/1280px layout checks; asset-version consistency; syntax and diff checks.

A direct API check of the saved reviewer credentials returned `captcha_failed` for both accounts. That endpoint requires the application's CAPTCHA flow; this result does not establish invalid credentials. Complete a real UI login on the review device. No CAPTCHA bypass, credential reset, account changes or purchase was performed.

Browser fixtures cannot establish real camera permissions, physical-device stability or StoreKit sandbox delivery. Use `scripts/beta-acceptance-2026-11-16.md` to record real results. Product differentiation and genuine external feedback remain unresolved review evidence; no claim of Apple approval or complete rejection remediation is made.

## Next release steps

1. Deploy the bridge fixes and pass the live release check.
2. Install the exact 1.0.3 (3) candidate on an iPhone/iPad and complete internal acceptance, including review-account login and sandbox purchase/restore.
3. Make the internally accepted candidate available to the intended external beta group through the applicable TestFlight review process. Collect actual feedback and record resulting fixes and retests.
4. Review the existing nine-question reply against verified product and ownership evidence. Supply the new beta evidence and any substantive product changes to Apple when ready; do not fabricate feedback or claim unrelated code changes solve 4.3.
