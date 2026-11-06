# Marketplace interaction ownership

The authoritative product scope is advertising and connecting customers to sellers. No transaction or booking confirmation is introduced.

| Capability | Canonical owner | Variant |
|---|---|---|
| Forms | buildPostForm, applyPostFieldProfile, createListing | Pro activity shortcuts select existing categories and retain publication limits |
| Select/Listbox | native select in post form | OS-owned dropdown behavior |
| Overlays | openModal, closeModal, existing history and event delegation | Business showcase reuses detailModal |
| Feedback | showToast | No new feedback provider |
| Contact | openListing, chatHTML, sellerPhoneHTML | Catalogue opens chosen listing and existing contact tools |
| Catalogue | public L entries scoped to seller ID and active/reserved state | No private profile fetch, drafts and other sellers excluded |
| Locale | state.lang, existing FR/EN vocabulary | Every new label has both languages |
| Styling | root CSS variables in both HTML route shells | .business-* and .pro-* rules |

A business showcase link uses ?business=<seller-id>. A listing link uses ?listing=<listing-id>. Closing the detail removes either parameter. Read-only business pages may load signed out. Creating an offer uses existing account, subscription and publication-limit guards.

Verification: scripts/business-showcase-check.js exercises storefront filtering, mobile layout route, navigation, activity presets, and inactive-plan guard. Category and listing editor checks cover the canonical forms.

## Native iOS workflows (shell 5)

| Capability | Canonical owner | Native variant | Verification |
|---|---|---|---|
| Posting schema and limits | postFieldProfile, listingLimitFor, publicationUsageCountFor | native-workflows.js exposes the same category fields and rejects inactive business plans | scripts/native-workflows-check.js |
| Authentication and persistence API | SB in supabase-api.js; server RLS and triggers | Swift calls the adapter in the trusted main WKWebView; no session token is copied | adapter session-switch and expected-user checks |
| Forms and selections | SXMPostView, shared web schema | SwiftUI Form/Picker/TextEditor; existing web editor remains canonical for edits | browser entry tests; Xcode/device verification pending |
| Drafts | SXMPostDraft and SXMWorkflowModel | one file per authenticated owner, protected and excluded from backup; autosave, restore, confirmed discard | device/offline checks pending |
| Posting completion | confirmed SB.insertListing response | failed/partial uploads retain draft; uncertain write locks resubmission and asks for profile verification | adapter uncertain-write and upload checks |
| Messaging | SB.sendMessage / fetchInbox; server message quota and block policies | native inbox/thread, paged history, foreground polling, block/report | adapter and browser fixture checks; device tests pending |
| Feedback and navigation | SXMWorkflowView and workflow error state | native persistent status/errors, system confirmation dialogs, five-tab shell | browser tests cover routing and legacy fallback |

Navigation preserves autosaved listing drafts. A pending publish keeps its snapshot marked
uncertain on disk until confirmed or rejected, including when the process is killed.
Messages are held in memory only; changing accounts clears native conversation content.
Native controls own keyboard, focus, safe-area layout, and Dynamic Type behavior; these
platform behaviors still require iPhone/iPad acceptance testing.
