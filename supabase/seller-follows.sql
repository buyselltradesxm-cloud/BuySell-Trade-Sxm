-- Buy Sell Trade SXM — follow a seller ("Suivre") + phone notification when
-- a followed seller publishes a new listing.
-- Run after schema.sql, admin-upgrade.sql and push-notifications.sql:
--   supabase db query --linked --file supabase/seller-follows.sql
-- Reuses the send-push Edge Function and the PROJECT_URL / PUSH_FUNCTION_SECRET
-- vault secrets already used for message notifications. Safe to re-run.
begin;

create table if not exists public.seller_follows (
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  seller_id   uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);
create index if not exists seller_follows_seller_idx on public.seller_follows (seller_id);

alter table public.seller_follows enable row level security;

-- Each user sees and changes only their own follows. Nobody can list a
-- seller's followers (the trigger below reads them as the table owner).
drop policy if exists "follows: lecture les siens" on public.seller_follows;
create policy "follows: lecture les siens" on public.seller_follows
  for select to authenticated using (follower_id = auth.uid());

drop policy if exists "follows: ajouter les siens" on public.seller_follows;
create policy "follows: ajouter les siens" on public.seller_follows
  for insert to authenticated
  with check (
    follower_id = auth.uid()
    and (select count(*) from public.seller_follows f where f.follower_id = auth.uid()) < 200
  );

drop policy if exists "follows: supprimer les siens" on public.seller_follows;
create policy "follows: supprimer les siens" on public.seller_follows
  for delete to authenticated using (follower_id = auth.uid());

revoke all on public.seller_follows from public, anon;
grant select, insert, delete on public.seller_follows to authenticated;
grant all on public.seller_follows to service_role;

-- "Vendeurs suivis" list. Names come from listings.seller_name, which is
-- already public, so this exposes nothing from profiles.
create or replace function public.my_followed_sellers()
returns table (seller_id uuid, seller_name text, active_listings bigint, followed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.seller_id,
         coalesce((select nullif(l.seller_name, '') from public.listings l
                    where l.seller_id = f.seller_id order by l.created_at desc limit 1), '—'),
         (select count(*) from public.listings l
           where l.seller_id = f.seller_id
             and coalesce(l.status, 'active') in ('active', 'reserved')
             and coalesce(l.moderation_status, 'approved') = 'approved'),
         f.created_at
    from public.seller_follows f
   where f.follower_id = auth.uid()
   order by f.created_at desc
   limit 200;
$$;
revoke execute on function public.my_followed_sellers() from public, anon;
grant execute on function public.my_followed_sellers() to authenticated;

-- Notify followers once a listing is publicly visible: on insert when it is
-- approved straight away, or when moderation later approves a recent one.
create or replace function public.notify_followers_on_listing()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text;
  fn_secret text;
  who text;
  f record;
begin
  if new.seller_id is null
     or coalesce(new.moderation_status, 'approved') <> 'approved'
     or coalesce(new.status, 'active') <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and (coalesce(old.moderation_status, 'approved') = 'approved'
     or new.created_at < now() - interval '3 days') then
    return new;
  end if;

  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'PROJECT_URL' limit 1;
  select decrypted_secret into fn_secret
    from vault.decrypted_secrets where name = 'PUSH_FUNCTION_SECRET' limit 1;
  if fn_url is null or fn_secret is null then
    return new;
  end if;

  who := coalesce(nullif(new.seller_name, ''), 'Buy Sell Trade Sxm');
  -- shortcut: one send-push call per follower, capped at 500; batch user_ids in send-push if a seller passes that.
  for f in select follower_id from public.seller_follows where seller_id = new.seller_id limit 500 loop
    perform net.http_post(
      url := fn_url || '/functions/v1/send-push',
      headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', fn_secret),
      body := jsonb_build_object(
        'user_id', f.follower_id,
        'title', who,
        'body', left('Nouvelle annonce · New listing: ' || coalesce(new.title, ''), 140),
        'url', '/marketplace.html?src=push&listing=' || new.id,
        'tag', 'follow:' || new.id
      )
    );
  end loop;
  return new;
exception when others then
  -- Never let a notification failure roll back the listing.
  return new;
end;
$$;

drop trigger if exists trg_notify_followers_on_listing on public.listings;
create trigger trg_notify_followers_on_listing
  after insert or update of moderation_status on public.listings
  for each row execute function public.notify_followers_on_listing();

revoke execute on function public.notify_followers_on_listing() from public;

commit;
