# Bilingual listing titles — 16 November 2026

User reported that 1.0.4 worked well on their phone, but seller titles did not follow FR/EN. This is internal feedback, not proof of every acceptance flow.

## Implementation

- Keep `listings.title` as the original editable seller text. Server-generated `title_fr` and `title_en` are independent display values.
- Extend the existing keyword-generation service and its existing daily request guard; no client API key or per-view AI call.
- Trigger clears translations when the original title changes. Secret-protected atomic save compares the title and description snapshots to reject stale generation. Client writes cannot replace machine translations.
- Website cards, detail, showcase and existing localized title consumers select the active language. Search indexes both languages. Native cards, detail, sharing and cached saved listings use the same language selection; native inbox listing titles use the localized bridge data.
- Missing translations fall back to the original title. Generation is asynchronous; publishing is not blocked by an unavailable translation service.

## Deployment and checks

- Migration `supabase/listing-title-translations.sql` applied and `listing-keywords` deployed.
- All 17 currently public seller listings have both translated titles, checked directly in the database.
- Commit `503ff510cafa52089d414628467158d9bbf74927`.
- Website deployment 43865795140 succeeded; live release `1907f26b90d31f0a` verified byte for byte.
- Tests passed: listing-title service auth, bilingual output, invalid output, stale/racing writes; both web routes, both title directions, original preservation and fallback; native workflow and browser checks; search words; listing editing; 324 UI translation keys per locale; Swift syntax parse.
- Live browser test confirmed the same real listing changes title with FR/EN on both routes.
- Signed native run 43865795356 succeeded: 1.0.5 (1) compiled, signed and uploaded; exported binary contains title_fr/title_en. Processing completed and SXM Internal Testing assignment verified directly in App Store Connect. Device acceptance is in progress with the owner.
- Android native browsing/detail/saved title support committed in `5b2920f`; production build/upload run 43866774140 succeeded. Google Play Publishing overview directly confirms **Changes in review → Production → 1.0.5 → Start full rollout**. Managed publishing is off. Automated checks precede review; this is not proof of approval or public availability.
- App-open ads were already configured for both platforms. User subsequently prioritized Apple acceptance and deferred further ad changes; no new advertising behavior was introduced.
- Latest Apple message rechecked: reply with evidence before resubmitting. Follow-up draft is `apple-followup-1.0.5-draft.md`, with device and external feedback still pending.

## Acceptance still needed

Update to 1.0.5 (1), test one French-written and one English-written listing with both language choices, including saved listings and detail. Confirm seller editing still shows the original text. No App Store resubmission or external distribution is authorized by automated test success alone.
