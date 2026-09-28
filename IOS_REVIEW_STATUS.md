# iOS App Review Status

Last updated: 2026-09-23

## Completed

- Native iOS sign-in now uses `ASWebAuthenticationSession` through `SXMNativePlugin`, with the callback URL scheme `buyselltradesxm://auth/callback`.
- Native iOS purchases now use StoreKit 2 product lookup, purchase, restore, pending transaction, subscription management, and finish-after-server-verification flows.
- The web app now detects the native iOS bridge, routes Pro subscriptions and listing boosts through Apple IAP on iOS, and keeps web checkout behavior separate.
- Supabase Apple purchase verification and App Store Server Notification endpoints are present under `supabase/functions/apple-purchases` and `supabase/functions/apple-notifications`.
- App Store callback URLs are configured in `supabase/config.toml`.
- iOS review regression coverage is available with `npm run test:ios-review`.
- The App Store export workflow now strips stale embedded framework signatures before export and verifies the final signed IPA. GitHub Actions run `35791159831` completed successfully and uploaded the IPA to App Store Connect.
- The Paid Apps Agreement, banking, and tax items are active in App Store Connect.
- App Store Connect shows TestFlight build `1.0.1` as processed and ready to submit.
- All five subscription records have all countries or regions selected, current pricing, and English display metadata.
- All three consumable listing boost records have current pricing and English display metadata.

## App Store Connect Product Records

Subscription group: `Buy Sell Trade SXM Pro` (`22404743`)

| Tier | Product ID | Apple ID | App Store price |
| --- | --- | --- | --- |
| Starter | `com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly` | `6814996895` | `$29.99/month` |
| Business | `com.korekdigitalmarketing.buyselltradesxm.pro_business_monthly` | `6814996587` | `$59.99/month` |
| Premium | `com.korekdigitalmarketing.buyselltradesxm.pro_premium_monthly` | `6814996199` | `$99.99/month` |
| Elite | `com.korekdigitalmarketing.buyselltradesxm.pro_elite_monthly` | `6814995711` | `$149/month` |
| Unlimited | `com.korekdigitalmarketing.buyselltradesxm.pro_unlimited_monthly` | `6814844596` | `$199/month` |

Consumable listing boosts:

| Boost | Product ID | Apple ID | App Store price |
| --- | --- | --- | --- |
| 3 days | `com.korekdigitalmarketing.buyselltradesxm.boost_3_days` | `6814997109` | `$5.99` |
| 7 days | `com.korekdigitalmarketing.buyselltradesxm.boost_7_days` | `6814998133` | `$10.99` |
| 14 days | `com.korekdigitalmarketing.buyselltradesxm.boost_14_days` | `6814998216` | `$19.99` |

## Remaining Apple Review Work

App Store Connect still shows the subscription and consumable products as `Finaliser avant soumission`. The remaining blocker visible in App Store Connect is the required review screenshot for each product. After screenshots are attached, the products need to be added to the app version for review.

App Store Connect intermittently returned a generic localization save error, `Une erreur s'est produite. Veuillez réessayer ultérieurement.`, but retrying succeeded for the products configured during the 2026-09-23 audit.

## Review Notes

The private demo reviewer credentials are stored outside the repository at `C:/Users/PC/.codex/private/bst-app-review.json`.

The App Store Server Notifications V2 URL to configure in App Store Connect is:

`https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/apple-notifications`

Before resubmitting, verify the new TestFlight build on a real iOS device, attach purchase screenshots to each IAP product, enter the reviewer credentials in App Store Connect, add the products to the app version for review, and submit the updated app version.
