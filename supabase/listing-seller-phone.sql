-- Optional public contact phone number attached to an individual listing.
-- Users explicitly choose whether to enter a number when publishing.
alter table public.listings
  add column if not exists seller_phone text;
