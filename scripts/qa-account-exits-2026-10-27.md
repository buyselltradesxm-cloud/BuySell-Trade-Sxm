# Account exit review — 2026-10-27

These additional fixes are local, following the website deployment of commit `c9d7b81`. They have not yet been deployed. Local asset version: `e65501e69c903d31`.

## Reproduced and fixed

Both app routes now guard logout and account deletion against session changes at asynchronous boundaries. Previously, delayed push cleanup or deletion responses could trigger a sign-out for a newly selected account; delayed sign-out responses could clear its local session or show a misleading success notice. A newer session for the same account is also protected.

A shared per-session lock prevents repeated logout/deletion requests and prevents logout from overlapping an account deletion. Locks are released after failures so users can retry. Normal completion still closes the profile when the authentication callback clears the user before the request returns.

## Verification

- The initial reproduction failed 16 assertions per route before the fix.
- Final account-exit regression: 23 assertions per route, 46 total, passing. Run `npm run test:account-exit-races` with the local app served on port 5173. Included in `test:qa`.
- Existing admin/auth failures, session transitions, listing editor races, listing action races, push client, and messaging failure suites pass.
- Translation coverage passes for 334 keys per route in French and English.
- All 14 PWA/offline checks pass after rebuilding assets.
- Public browsing against the updated local frontend passes at 1280px and 390px on both routes: listing reads, search, detail display, login UI, no horizontal overflow or page errors.
- JavaScript syntax, asset-version verification, and `git diff --check` pass.

Account deletion, sign-out, and push cleanup in the new regression use fixtures. No real accounts were deleted. These guards prevent further actions and UI changes after a session changes; they cannot retract a request already accepted by the authentication service. Native device behavior and real deletion acceptance remain untested.
