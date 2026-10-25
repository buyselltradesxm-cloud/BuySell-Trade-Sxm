# App bug review — 2026-10-25

Changes are in the local checkout; they have not been deployed or submitted to either app store.

## Verified bugs fixed

Both `app-index.js` and `app-marketplace.js` received the same fixes.

| Problem | Reproduction | Fix |
| --- | --- | --- |
| Drafts followed the user into another conversation | Type in conversation A, then open B. A's text remains in B's composer and could be sent to the wrong recipient. | Keep drafts in memory by conversation and restore the matching draft when switching or returning from the inbox rail. |
| A delayed send erased another conversation's draft | Send in A, switch to B, type the same text, then finish A's request. | Only clear the active composer if it still belongs to A; clear A's saved draft separately. |
| Private draft remained after account cleanup | Type a private message, then sign out or change accounts. | Clear the composer and all conversation drafts with account messaging state. Ignore send results from a previous session revision. |
| Profile save crashed after logout | Save a profile, delay the seller-name synchronization request, sign out, then resolve it. | Recheck the account after the second network wait before rendering or changing local listings. |
| Rapid modal transitions corrupted Back navigation | Close a modal, reopen another while `history.back()` is pending, then close again. The existing clickable-sections test left the app and lost its JavaScript context. | Defer new overlay history entries until traversal finishes and restore a newly opened listing's URL afterward. |

The new session-transition regression reproduced seven failed assertions per route before the fixes. It now passes ten assertions per route, including real Back traversal after the pending-navigation reproduction.

Also corrected a test defect: the pricing test required the English word “Login” while intentionally running the app in French. It now checks the current translation.

## Validation

Passed local checks:

- Session transitions: 20 assertions across both routes.
- Messaging failures: 64 assertions; admin/authentication failures: 114 assertions.
- Failed listing/avatar saves, listing editing, category forms, monthly listing limits, subscription profiles, blocked users, inbox UI, notifications, automatic boosts, and website boost checkout fixtures.
- Clickable profile/pricing sections, shared links, backend-loaded listing deep links, and pricing/free-signup fixtures.
- Password-reset PKCE, signup auto-signin, signup resume, push encryption, and push client fixtures.
- Translation coverage: 334 keys per route in French and English.
- Draft storage: 16 checks; PWA/offline app shell: 14 checks, repeated after rebuilding asset versions.
- JavaScript syntax, generated asset version verification, and `git diff --check`.
- Updated local app at 1280px and 390px on both routes: search, listing detail, login UI, and no horizontal overflow.

Live public browsing also passed on `/` and `/marketplace.html` at desktop (1280px) and mobile (390px): listing fetch, search, listing details, login UI, and horizontal overflow. This checks the currently deployed version, not deployment of these changes.

## Coverage limits

Authenticated writes and payment flows were exercised with local fixtures, not real customer accounts or charges. Actual email delivery, OAuth provider completion, payment settlement/webhooks, native Android/iOS purchases, push delivery to devices, and app-store releases still need acceptance testing. This review does not establish that every app feature is bug-free.

Run the new regression with `npm run test:session-transitions` while the app is served on port 5173. It is also included in `test:qa`.
