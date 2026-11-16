# App Store correction handoff — 5 November 2026

## November 16 follow-up

The rejected submission still targets **1.0.2 (3)**. The signed archive from
[GitHub run 43430787599](https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/runs/43430787599)
identifies the replacement candidate as **1.0.3 (3)** for iPhone and iPad.
Its executable contains the native Browse, Post and Messages views.
[TestFlight build 1.0.3 (3)](https://appstoreconnect.apple.com/teams/d813053b-d1e0-409c-8b4a-607fd670049e/apps/6809964445/testflight/ios/3ed6ee0f-6475-449d-8b4a-44f469323339)
is assigned to **SXM Internal Testing**. App Review still shows the November 16
developer reply with no newer Apple message.

### Draft follow-up for App Review

Thank you for reviewing Buy Sell Trade SXM. We would like to demonstrate the
native marketplace workflows in version 1.0.3, build 3. The app serves buyers
and sellers on both sides of Saint-Martin/Sint Maarten. Browse supports local
area filters, listing photos and saved listings. Post uses a native form with
the iOS camera and photo picker and saves drafts on the device. Messages
provides a native inbox and conversation screens.

To try these flows, sign in with the demo account in App Review Information.
In Browse, choose an area, open a listing and save it. In Post, enter a title
and select a photo, then leave and return to the tab to see the draft. To try
messaging, open another seller's listing and contact the seller or open an
existing conversation from Messages.

### Evidence to attach before sending

- Install **1.0.3 (3)** from TestFlight. Confirm the demo account can sign in.
  Record Browse, Post and Messages on that build, with credentials and personal
  messages outside the recording.
- On the same build, complete a sandbox Pro purchase and restore. Confirm the
  plan shows as active in Profile after each step.
- Add actual external tester feedback with the build number, reported issue,
  resulting change and retest outcome. The owner's signup retest is internal
  evidence. The external TestFlight group was assigned to 1.0.3 (1) at the last
  check.
- Add the verified evidence to the existing
  [App Review thread](https://appstoreconnect.apple.com/apps/6809964445/distribution/reviewsubmissions/details/4eff6f75-7c79-472d-ab49-4a688b5379a3)
  and follow Apple's direction on attaching the newer build.

## Original November 5 handoff

Status: implemented locally, NOT submitted, NOT deployed. Native compilation and
device acceptance remain unverified. No approval outcome is guaranteed.

## What changed

Shell 5 adds SwiftUI posting and messaging in SXMWorkflows.swift. Posting includes
native camera/photo-library selection, photo ordering/removal, category-aware
fields, and a protected, per-account draft on the device. Messaging includes an
inbox, paginated thread history, sending, foreground refresh, blocking and listing
reports. The existing Supabase authentication, tables, RLS, publication quotas and
message-limit triggers remain authoritative. Credentials are not copied to Swift.
Account, subscriptions and alerts use the existing Capacitor web bridge.

Older builds and ordinary browsers retain the existing posting and messaging UI.
The website must serve the new versioned adapter before a shell-5 binary is tested.

Both pricing and checkout expose Apple's standard EULA separately from the
marketplace Terms of Service. No custom license agreement was authored or selected.

## App Store description additions, ready to paste

English:

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://buyselltradesxm.com/privacy.html
Terms of Service: https://buyselltradesxm.com/terms.html

Français :

Conditions d'utilisation (EULA) : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Politique de confidentialité : https://buyselltradesxm.com/privacy.html
Conditions du service : https://buyselltradesxm.com/terms.html

These additions have NOT been entered into App Store Connect. Keep the localized
subscription title, one-month duration, StoreKit price, automatic-renewal disclosure,
restore and manage-subscriptions controls visible in the purchase journey.

## Draft reviewer notes — use after native acceptance passes

English:

We revised the iOS app with native marketplace workflows. The Post tab uses a
SwiftUI form with camera and system photo-library selection, photo management and
device-saved drafts. The Messages tab uses native inbox and conversation screens,
including paginated message history, sending, blocking and reporting. These screens
use the same authenticated marketplace account and backend as the website. Native
browsing, saved listings, listing photo galleries and the system tab bar are also
available. The account and subscription screens remain web-backed. Apple's standard
EULA and our privacy policy are linked in the subscription flow and app description.

Français :

Nous avons ajouté des parcours marketplace natifs à l'application iOS. L'onglet
Publier utilise un formulaire SwiftUI avec appareil photo, photothèque système,
gestion des photos et brouillons conservés sur l'appareil. L'onglet Messages utilise
des écrans natifs de conversations : historique paginé, envoi, blocage et signalement.
Ces écrans utilisent le même compte authentifié et les mêmes données que le site.
La navigation dans les annonces, les favoris, les galeries et la barre d'onglets
sont également natifs. Les écrans de compte et d'abonnement restent liés au site.
Les liens vers l'EULA standard Apple et la politique de confidentialité figurent
dans le parcours d'abonnement et la description de l'application.

## Required before resubmission

1. Publish the matching website assets and build the iOS project with Xcode or the
   existing Mobile iOS Cloud Build workflow (simulator first; signed upload separately).
2. On iPhone and iPad, sign in with a review account. Test Post, camera permission
   accept/deny, photo selection/reordering/removal, and French/English fields.
3. Save a draft, close/reopen the screen and app, and edit while disconnected. Check
   disk-full/locked-device errors. Switch accounts and confirm drafts stay separate.
4. Publish once on a test account; verify exactly one backend listing, its photos,
   category fields and profile count. Test quota and expired-business-plan rejection.
5. With two review accounts, send/read messages, load history beyond 50 messages,
   test the free-message cap, blocking, reporting, reconnect and account switching.
6. Interrupt a publish/send after dispatch. Verify the draft/text survives and the
   uncertain-write warning prevents an immediate duplicate. Check after killing the app.
7. Test navigation from signed-out Browse contact and sign-in, five tabs, shared
   listing links, alerts and Profile. Validate VoiceOver, large text and keyboard layout.
8. In StoreKit sandbox, verify localized price/renewal terms, EULA/privacy links,
   cancel/pending/success, restore, and subscription management. Add both localized
   description link blocks above in App Store Connect, then attach the new build.

## Checks completed locally

- Adapter fixture tests: authentication/identity isolation, required fields,
  categories, quotas, partial uploads, failed/uncertain writes, concurrent publish,
  free-message cap, blocks, reporting and cursor bounds. No production writes.
- Browser fixture tests: both route shells; native vs legacy workflow routing,
  signed-out sign-in, contact routing, Saved/Browse selection; 320/390/1280 widths
  and reduced-motion controls. Ad SDK calls are excluded from these tests.
- Step 7 browser fixtures additionally pass signed-out Messages and Profile,
  Profile after sign-in, opening/closing Alerts, and shared listing links on both
  routes. The native tab bar, VoiceOver, large text and keyboard still require
  simulator or physical-device testing.
- Browser tests serve fixture files through Playwright routing; host loopback
  network requests are restricted. These checks do not prove live delivery or native UI.
- Existing browse-controls, session-transition, listing-editor-race, translation
  and save-failure checks passed with local fixture routing. Image optimization
  checks passed 16/16. The broader web draft suite passed its storage checks but
  finished 14/16 because its two page-console checks attempted blocked Supabase
  WebSockets; this is not reported as a full draft-suite pass.
- The Windows Swift compiler cannot start (exit -1073741790); there is no successful
  Swift parse/typecheck/Xcode build from this session. Hardware camera, native layout,
  disk protection, authenticated delivery and StoreKit acceptance remain unverified.

Apple references:
- https://developer.apple.com/app-store/review/guidelines/#minimum-functionality
- https://developer.apple.com/app-store/review/guidelines/#subscriptions
- https://developer.apple.com/help/app-store-connect/manage-app-information/provide-a-custom-license-agreement/
