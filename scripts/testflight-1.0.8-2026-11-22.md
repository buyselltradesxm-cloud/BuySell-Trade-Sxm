# TestFlight 1.0.8 preparation — 22 November 2026

The user requested a new TestFlight build before App Review submission.

## Saved in App Store Connect

- App Review notes now address the November 18 Profile loading rejection,
  give explicit signed-out/login/profile steps and distinguish WebKit checks
  from installed iPad acceptance. Removed stale 1.0.6/1.0.2 candidate wording.
- Both French and English descriptions and support URLs now use the independent
  legal/privacy page. Corrected the English promotional text, which was French.
- Both dedicated localized privacy-policy URLs now use that independent page.
- TestFlight test information: saved beta review instructions, app marketing URL
  and independent privacy URL in the existing French localization.
- Existing demo credentials and contact details remain populated; values are
  not copied to this file. Automatic release after eventual approval is set.
- Latest review message still dates to November 18, Guideline 2.1(a), concerning
  iPad Air 11-inch (M3), iPadOS 27.0.1, Profile content not loading.

These metadata saves did not submit the app to App Review. The distribution
version/build remains 1.0.6 (1) until the new candidate is ready for selection.

## Build

Workflow: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/45035667195

Inputs: app-store, upload_to_appstore=true, marketing_version=1.0.8,
smoke_test=false. Source: 26732cf982ee7b715206f5f46f9a6ebbd077eccf,
branch codex/large-inline-admob-20261116. Includes the existing large AdMob
placement and five-interstitial session cap. No app-code change was made here.

Local privacy/resource and asset consistency checks passed. Live domain resolved
publicly and home, terms and independent privacy page returned HTTP 200.
Four WebKit iPad-sized live cases passed again. This is not an installed-iPad
test. New candidate acceptance results must be recorded after TestFlight testing.

Signed archive, export, distribution-signature/entitlement checks and App Store
Connect upload succeeded. Downloaded IPA confirms version 1.0.8 (1), the correct
bundle identifier, device families 1 and 2 and the packaged privacy manifest.
App Store Connect directly shows 1.0.8 (1) processing, uploaded at 16:02 Paris
time. Build ID: 97822940-eba5-4d7a-85e2-7d9f5a04c687.
Apple processing completed. Saved the bilingual build-specific testing notes
from testflight-1.0.8-test-notes.txt and directly verified the saved indicator.
Assigned the build to SXM Internal Testing; the build detail now shows Groupe (1),
SXM Internal Testing, Internes, 1 tester. No external group was added.

Proof: scripts/artifacts/testflight-1.0.8-ready-2026-11-22.jpg.
Metadata proof: scripts/artifacts/apple-privacy-saved-2026-11-22.jpg.
Both screenshots are local ignored artifacts.

Next: owner installs 1.0.8 (1) from TestFlight and reports the actual results.
The App Store submission was not resubmitted or switched to this untested build.
