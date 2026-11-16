# Vehicle and rental categories — 16 November 2026

User requested Vans, automotive body repair, rental vehicle types and daily/weekly rates, with wording chosen for English/French users.

## Changes

- Vehicles: `van-sale` — Vans / Fourgons et fourgonnettes. Kept separate from Trucks.
- Services: `auto-body-repair` — Auto body repair / Carrosserie automobile, including the Studio Pro activity selector.
- Car Rentals: economy, compact, sedan, SUV/4×4, convertible, minivan (7+ seats), passenger van, luxury. Stable `rental-*` subcategory IDs are shared with the native posting schema.
- Daily headline rate and optional seller-entered weekly rate for seven days, in the listing currency. The regular form, Studio Pro and native iOS posting support weekly rates; website and native browsing/detail display them.
- Weekly values are preserved in listing details and drafts. Rental type is preserved during Studio edits. Invalid native weekly rates fail before uploads.

## Verification

Passed: new category/rate checks on both routes in English/French; 274 category/form combinations; native workflow validation including weekly rates; native/legacy browser entry points and responsive layouts; Studio multi-publish including SUV subtype and weekly amount; listing editing; 16 draft checks; Swift syntax parsing; JavaScript syntax and diff checks.

Commit: `1634002218002f59b817a6107bd2526cb5c335b8`.
Website deployment 43872375983 succeeded. Live release `615eda0a1c785c75` passed the byte-for-byte public release check.

iOS 1.0.6 (1) build/upload run 43872414515 succeeded, including full compilation, distribution signatures/entitlements and upload. Exported IPA metadata confirms version/build and native weekly-rate code. Processing completed; assignment to SXM Internal Testing and saved bilingual test instructions were verified directly. [Current candidate](https://appstoreconnect.apple.com/teams/d813053b-d1e0-409c-8b4a-607fd670049e/apps/6809964445/testflight/ios/5fbc249e-68fd-4713-a85d-687e65bf201e).
Android 1.0.6 production build/upload run 43872414505 succeeded. Play Console directly shows Production 1.0.6 under Changes in review, with quick checks preceding review; managed publishing is off. This does not establish approval or public availability.
Device acceptance and external beta evidence remain distinct from compilation/upload success. Do not send the older 1.0.5 Apple reply draft with an obsolete candidate number.
