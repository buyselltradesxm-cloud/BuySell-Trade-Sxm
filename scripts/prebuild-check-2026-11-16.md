# Pre-build check — 16 November 2026

Subsequent update: commit `3738d23` was pushed and deployed successfully in [run 43848540620](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43848540620); the live release check then passed. The deployment mismatch below is historical. Later purchase-recovery fixes and the verified 4.3 / 4.2.6 rejection are tracked in `scripts/release-remediation-2026-11-16.md`.

Decision: local regression checks pass. Align the intended source and live website before treating a new build as release-ready. No build, deployment, commit, or store submission was triggered during this check.

## Release alignment

- Local HEAD and GitHub main: `0c9a20f06bf2449b08b6785038cda8186453f587`.
- Working tree contains uncommitted account-screen changes. A GitHub workflow dispatched on main will not contain those changes.
- Local asset release: `7a95aace13ee9915`; `test:assets` passes.
- `test:release` fails because the live entry page still references `d98d4e5d03500f7d`. This is a deployment mismatch, not a local asset-generation failure.
- `capacitor.config.json` points the native shell to `https://buyselltradesxm.com`. Building an IPA does not publish the local website changes.
- Latest website workflow [43839162755](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43839162755) succeeded on current main, including its production-artifact check. The local `_site` directory is absent, so the local `test:site-secrets` check could not run against a generated site; the successful CI check applies to committed main only.

## Checks passed

26 automated suites passed: assets, native-workflows, native-workflows-browser, push, push-client, translations, pwa, password-reset-pkce, signup-auto-signin, signup-resume, session-transitions, listing-editor-races, listing-action-races, account-exit-races, browse-controls, search-words, messaging-failures, admin-auth-failures, draft, pro-studio, social-auth, pro-payment, deep-link, ios-review-check, store-catalog-check, and launch-smoke.

- Live smoke test: both entry pages at 390px and 1280px; 15 public listings; search, listing detail and login UI; no page errors.
- Additional local account navigation check: Free, Pro and Login targets receive focus and remain in view on both pages at 320px, 390px, 768px and 1280px.
- JavaScript syntax checks for both application scripts and `git diff --check` passed.
- Updated the payment fixture to verify the visible current free-account heading. It previously required a sentence intentionally removed by the account-screen redesign. Payment suite passed after the update.
- Initial connection-refused failures were resolved by starting the local test server and rerunning affected suites.

## Native build evidence and remaining acceptance

- [iOS run 43430787599](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43430787599) successfully archived, signed, verified distribution signatures and entitlements, and uploaded an IPA to App Store Connect on November 13, from `c17495c6843459b94cd28e9205575dd24c1799bf`. This is stronger evidence than the older simulator-only run referenced in earlier notes.
- Required App Store Connect secret names are present in GitHub. Their current validity was not exercised by a new signed build.
- No changes to `ios/`, Capacitor configuration, or dependency manifests exist between that signed commit and current HEAD. `native-ios.js` has changed; it is website-delivered bridge code.
- The November 16 handoff in `scripts/appstore-review-2026-11-05.md` identifies candidate 1.0.3 (3) and rejected submission 1.0.2 (3). App Store Connect state was not independently rechecked in this session.
- Physical-device authentication, camera/photo permissions, native posting/drafts/messaging, and StoreKit sandbox purchase/restore remain acceptance checks. Browser fixtures do not establish these outcomes.
- Confirm EULA/privacy metadata and the selected review build in App Store Connect before resubmission. Follow the evidence checklist in the November 16 handoff.

Next sequence: commit the intended changes, deploy matching web assets, pass `test:release`, build the intended committed revision, then complete device and sandbox acceptance before store submission.
