-- Buy Sell Trade SXM — Web Push (RFC 8291 / VAPID) storage + message trigger.
-- Run after schema.sql, in the Supabase SQL editor or:
--   supabase db query --linked --file supabase/push-notifications.sql
--
-- Prereqs (once):
--   supabase secrets set VAPID_PUBLIC_KEY=...   VAPID_PRIVATE_KEY=...   VAPID_SUBJECT=mailto:admin@buyselltradesxm.com
--   select vault.create_secret('<service_role_or_shared_secret>', 'PUSH_FUNCTION_SECRET');
--   select vault.create_secret('https://<project-ref>.supabase.co', 'PROJECT_URL');
--   supabase functions deploy send-push --no-verify-jwt

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

-- ---------------------------------------------------------------------------
-- 1. Subscriptions: one row per browser/device a user has opted in from.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Each user manages only their own subscriptions. The Edge Function reads
-- across users with the service role, which bypasses RLS.
drop policy if exists "push: lecture la sienne" on public.push_subscriptions;
create policy "push: lecture la sienne"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push: insérer la sienne" on public.push_subscriptions;
create policy "push: insérer la sienne"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push: modifier la sienne" on public.push_subscriptions;
create policy "push: modifier la sienne"
  on public.push_subscriptions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push: supprimer la sienne" on public.push_subscriptions;
create policy "push: supprimer la sienne"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Fire a Web Push when a new message lands, so the recipient is notified
--    even with no tab open. Fully server-side — independent of the sender's
--    browser staying connected.
-- ---------------------------------------------------------------------------
create or replace function public.notify_push_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text;
  fn_secret text;
  sender_name text;
begin
  -- No point pushing to yourself.
  if new.recipient_id is null or new.recipient_id = new.sender_id then
    return new;
  end if;

  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'PROJECT_URL' limit 1;
  select decrypted_secret into fn_secret
    from vault.decrypted_secrets where name = 'PUSH_FUNCTION_SECRET' limit 1;
  if fn_url is null or fn_secret is null then
    return new;  -- not configured yet — stay silent, don't break inserts
  end if;

  select coalesce(business_name, name, 'Buy Sell Trade Sxm')
    into sender_name
    from public.profiles where id = new.sender_id;

  perform net.http_post(
    url := fn_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-push-secret', fn_secret
    ),
    body := jsonb_build_object(
      'user_id', new.recipient_id,
      'title', coalesce(sender_name, 'New message'),
      'body', left(new.body, 140),
      'url', '/marketplace.html?src=push&conv=' || coalesce(new.listing_id::text, '0') || ':' || new.sender_id,
      'tag', 'msg:' || coalesce(new.listing_id::text, '0') || ':' || new.sender_id
    )
  );
  return new;
exception when others then
  -- Never let a notification failure roll back the message insert.
  return new;
end;
$$;

drop trigger if exists trg_notify_push_on_message on public.messages;
create trigger trg_notify_push_on_message
  after insert on public.messages
  for each row execute function public.notify_push_on_message();

revoke execute on function public.notify_push_on_message() from public;
