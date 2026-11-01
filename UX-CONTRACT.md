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
