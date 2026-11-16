# TestFlight candidate — 16 November 2026

User authorized preparation and upload of a new testing build. App Store resubmission remains on hold pending device acceptance and external feedback.

- Source revision: `7334a550f4cee7bbbfb44db7d6db09cd1358e5d8`.
- Signed IPA version: **1.0.4 (1)**, read from its bundled Info.plist. Bundle ID `com.korekdigitalmarketing.buyselltradesxm`; development region `en`.
- Live web release: `a32d4bc2d2eb558f`, verified against all three entry pages and 26 assets.
- Simulator compilation passed in [run 43856360433](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43856360433). The boot log spent over six minutes on iOS data migration/system app startup. The cancelled run produced `scripts/artifacts/testflight-simulator-2026-11-16/iphone1-launch.png`; inspection confirms English launch, native Discover navigation and visible listings. Tab-specific and iPad checks did not finish; full runtime acceptance remains incomplete.
- Signed build/upload: [run 43857510505](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43857510505) succeeded, including archive, signing, embedded distribution signature and entitlement verification, and upload. Apple upload log: `UPLOAD SUCCEEDED with no errors`, 11:28:34 UTC (12:28:34 Paris).
- TestFlight processing finished. [1.0.4 (1)](https://appstoreconnect.apple.com/teams/d813053b-d1e0-409c-8b4a-607fd670049e/apps/6809964445/testflight/ios/11094962-83b2-48f8-a6c6-be1d8ce262f8) is assigned to **SXM Internal Testing**, verified by the selected group and build row in App Store Connect. External group was not assigned; no external beta review or App Store resubmission was triggered.
- Signed IPA inspected locally: privacy manifest includes UserDefaults reason CA92.1; executable contains Browse, Post, Inbox and Thread native components. SHA256: `927fe49aa4f2327d5c3daf98ad3a68b90ef27580ddc8cb959c88fb6b46bf3280`.
- App Store Connect rechecked during preparation: 1.0.3 is the newest existing version; rejection still targets 1.0.2 (3). Review correspondence still has four messages, latest Apple message November 13 and developer response November 16. No newer response or submission was sent.

## Automated checks passed for this candidate

Asset consistency; native workflow schema, account isolation, upload and message guards; browser native/legacy routing and narrow/desktop layouts; English default and remembered French choice; store catalog/listener/verification recovery; iOS OAuth and purchase/restore browser fixtures; app privacy declaration and Xcode resource membership; byte-for-byte live release check.

## On-device acceptance — pending

Use the exact new TestFlight build, and record device model, iOS version and date. Automated checks do not fill these rows.

1. Launch in English on a fresh install; switch to French and verify it persists after relaunch.
2. Sign in through the actual reviewer-account flow. Test Apple/Google sign-in and cancellation.
3. Browse, filter by island side, save a listing and reopen its photos.
4. Post with camera/photo-library access allowed and denied; save and restore a draft; publish once and verify the listing.
5. Send and receive messages between test accounts. Verify report and block controls.
6. Use a sandbox Pro purchase, cancel another purchase, relaunch and restore; verify access and displayed terms.
7. Test account deletion only with an explicitly designated disposable account.
8. Check iPad layout, rotation, large text and core VoiceOver navigation.

Keep credentials, receipts and personal messages outside the repository. Record actual results in `beta-acceptance-2026-11-16.md` with the new build number.

## Reviewer evidence — pending

The user confirmed existing TestFlight testers are available. Assign the accepted candidate to the existing external group only after internal device acceptance and the applicable beta review. No tester invitation or message has been sent during preparation.

Record a short walkthrough of this exact build; use actual SXM filters, seller listings, saved listings, native posting/draft and messaging flows. Gather external testers' actual feedback, resulting fixes and retests. Update the existing nine-question reply with verified ownership/development facts and those results. Verify the latest Apple message before any submission. Do not send the existing draft with its obsolete 1.0.3 build number.
