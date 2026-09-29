-- Buy Sell Trade SXM -- security hardening v2
-- Run once with a database-owner/service-role connection:
--   supabase db query --linked --file supabase/security-hardening-v2.sql
-- This file is intentionally additive/idempotent. Review it before running.

-- Never make future tables readable by anon/authenticated roles by default.
-- Every new table must receive deliberate grants and explicit RLS policies.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on sequences from authenticated;

-- New users are always ordinary users. Admin assignment must be an explicit,
-- audited owner action; never derive privileged access from an email address.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  )
  on conflict (id) do update
  set name = coalesce(public.profiles.name, excluded.name),
      email = excluded.email,
      role = public.profiles.role;
  return new;
end;
$$;

-- Strict server-side Storage limits. MIME types are enforced by Storage and
-- direct uploads still remain bound to the authenticated user's own folder.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('listing-photos', 'avatars');

-- Reject oversized/bogus listing payloads even if a caller bypasses the UI.
alter table public.listings
  drop constraint if exists listings_title_length,
  drop constraint if exists listings_description_length,
  drop constraint if exists listings_photos_count,
  drop constraint if exists listings_vehicle_object,
  drop constraint if exists listings_vehicle_no_prototype_keys;
alter table public.listings
  add constraint listings_title_length check (char_length(title) between 1 and 140),
  add constraint listings_description_length check (description is null or char_length(description) <= 10000),
  add constraint listings_photos_count check (cardinality(photos) <= 8),
  add constraint listings_vehicle_object check (vehicle is null or jsonb_typeof(vehicle) = 'object'),
  add constraint listings_vehicle_no_prototype_keys check (
    vehicle is null or vehicle::text !~ '"(__proto__|prototype|constructor)"'
  );

-- Store normalized text, not browser-provided control characters or padding.
-- HTML is encoded at render time; do not store rendered/escaped variants.
create or replace function public.sanitize_listing_input()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.title := left(btrim(regexp_replace(coalesce(new.title, ''), '[[:cntrl:]]', '', 'g')), 140);
  new.description := nullif(left(btrim(regexp_replace(coalesce(new.description, ''), '[[:cntrl:]]', '', 'g')), 10000), '');
  new.seller_name := nullif(left(btrim(regexp_replace(coalesce(new.seller_name, ''), '[[:cntrl:]]', '', 'g')), 120), '');
  return new;
end;
$$;
drop trigger if exists sanitize_listing_input_trigger on public.listings;
create trigger sanitize_listing_input_trigger
  before insert or update on public.listings
  for each row execute function public.sanitize_listing_input();
revoke all on function public.sanitize_listing_input() from public;

create or replace function public.sanitize_message_input()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.body := left(btrim(regexp_replace(coalesce(new.body, ''), '[[:cntrl:]]', '', 'g')), 4000);
  return new;
end;
$$;
drop trigger if exists sanitize_message_input_trigger on public.messages;
create trigger sanitize_message_input_trigger
  before insert or update on public.messages
  for each row execute function public.sanitize_message_input();
revoke all on function public.sanitize_message_input() from public;

-- Security events never contain passwords, bearer tokens, card data, raw
-- emails, or full request bodies. Only server-side workers may write them.
create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type ~ '^[a-z0-9_.-]{1,80}$'),
  actor_id uuid references auth.users(id) on delete set null,
  subject_hash text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb
);
alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;

-- Fixed-window limiter used only by trusted Edge Functions. Keys are SHA-256
-- hashes, never raw emails, IPs, session IDs, or tokens.
create table if not exists public.security_rate_limits (
  bucket text primary key,
  window_started timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;

create or replace function public.consume_security_rate_limit(
  bucket_key text,
  max_attempts integer,
  window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if length(bucket_key) < 32 or max_attempts < 1 or max_attempts > 1000
     or window_seconds < 1 or window_seconds > 86400 then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into public.security_rate_limits as r (bucket, window_started, attempts)
  values (bucket_key, now(), 1)
  on conflict (bucket) do update
    set window_started = case
          when r.window_started <= now() - make_interval(secs => window_seconds) then now()
          else r.window_started
        end,
        attempts = case
          when r.window_started <= now() - make_interval(secs => window_seconds) then 1
          else r.attempts + 1
        end
  returning attempts <= max_attempts into allowed;

  return coalesce(allowed, false);
end;
$$;
revoke all on function public.consume_security_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, integer, integer) to service_role;

-- Stripe event IDs are unique, making webhook processing replay-safe.
create table if not exists public.payment_webhook_events (
  stripe_event_id text primary key,
  received_at timestamptz not null default now(),
  event_type text not null,
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error_code text
);
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from public, anon, authenticated;

-- The default-privilege revokes above leave new tables with no DML grants at
-- all, so the Edge Functions' service_role must be granted explicitly.
-- security_rate_limits needs none: only the security-definer RPC touches it.
grant insert on public.security_events to service_role;
grant select, insert, update on public.payment_webhook_events to service_role;
