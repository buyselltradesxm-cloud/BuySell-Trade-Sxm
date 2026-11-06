---
version: alpha
colors:
  primary: '#0B6E7F'
  ink: '#132A2E'
  surface: '#FBF7EF'
  accent: '#F2B705'
  muted: '#5C6B6A'
typography:
  display:
    fontFamily: 'Space Grotesk, sans-serif'
  body:
    fontFamily: 'Manrope, sans-serif'
omitted:
  - section: spacing
    reason: Existing page CSS owns component spacing.
  - section: rounded
    reason: Existing page CSS owns component radii.
---
# Buy Sell Trade SXM

## Overview
A bilingual local marketplace connecting customers with island businesses. Pro showcases advertise offers and lead to listing conversations. They do not reserve inventory, confirm availability, or take bookings.

## Colors
The existing root CSS variables in index.html and marketplace.html are canonical. Primary maps to --sea, ink to --ink, surface to --paper, accent to --sun, muted to --mute. Keep both route shells synchronized.

## Typography
Reuse the existing display and body fonts; locale is French or English through state.lang.

## Layout
Business catalogue uses two photo-led columns on desktop and one below 620px. Existing detail dialog owns scrolling. A teal business masthead groups the name, activity tags and shareable address.

## Components
Pro workspace contains activity-specific shortcuts into the existing listing form. Public showcase uses public listing data only. Existing profile, modal, event delegation, toast and listing contact flows remain canonical.

## Do's and Don'ts
Use semantic buttons, visible focus and escaped user content. Do not fetch private profile fields for storefronts. Keep existing subscription gates. Restaurant profiles hide prices; food products retain prices. Rental vehicle prices are daily rates.

## Island Market direction (2026-11-05)

The user selected the second generated concept, “Island Market: Discover SXM”.
`market-design.css` is the shared route-level skin: warm ivory, teal actions,
large square listing photographs, compact category shortcuts and five mobile tabs.
Keep authentic listing photos and live prices; the concept's example inventory is not production data.
Use existing bundled Instrument Sans / Space Grotesk on web, system fonts and SF Symbols on iOS.
Keep the featured carousel's left/right buttons and its reduced-motion behavior.
The native photo gallery also has labelled 44-point previous/next controls.
Native navigation is Discover, Saved, Post, Messages, Profile; alerts remain available via the home bell.
Builds advertising `nativeWorkflows` use SXMWorkflows.swift for posting and messages.
Native Forms, Pickers, Lists and navigation retain the established system-font/teal treatment.
The authenticated data adapter reuses the web Supabase client and the shared publication schema;
account, payment and alert screens remain in the web bridge. Older builds retain their existing workflows.
An Xcode build and device acceptance tests remain necessary before App Review submission.
See design-qa.md and scripts/appstore-review-2026-11-05.md for verification boundaries.
