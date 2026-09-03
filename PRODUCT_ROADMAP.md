# Buy Sell Trade Sxm Product Roadmap

## Current Prototype

- Marketplace-first homepage with search, categories, filters, sort, grid/list views, listing detail, favorites, saved searches, posting flow, and messages preview.
- French, English, and Dutch interface copy.
- EUR/USD display and island-side filtering for Saint-Martin and Sint Maarten.
- Mobile app-style bottom navigation for core actions.

## Website Features To Build Next

- User accounts with email, phone, Google, or Apple login.
- Seller profiles with ratings, verification, active listings, and response time.
- Real listing creation with photo uploads, category-specific fields, drafts, edit, sold, reserved, and delete states.
- Listing detail pages with share links, report listing, seller safety tips, similar listings, and map/area context.
- Real chat with inbox, unread states, attachments, blocked users, and moderation reporting.
- Admin dashboard for reported listings, banned users, category management, and featured listings.
- SEO pages for categories and areas, for example `/vehicles`, `/electronics`, `/marigot`, and `/simpson-bay`.

## Mobile App Features

- Installable PWA first, then native app if needed.
- Push notifications for messages, saved-search matches, price drops, and listing status.
- Camera-first posting flow with image compression.
- Offline draft saving while taking photos.
- Bottom-tab navigation: Browse, Saved, Post, Messages, Profile.

## Suggested Technical Direction

- Convert the prototype to Next.js for the website and API routes.
- Use Supabase or Firebase for the first backend: auth, database, storage, and realtime chat.
- Use a PWA manifest early so the website can be installed like an app.
- Move to React Native or Expo only after the marketplace workflows are proven.
