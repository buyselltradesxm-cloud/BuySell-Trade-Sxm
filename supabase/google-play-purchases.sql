-- Apply once before deploying google-play-purchases.
-- The purchase token is written only by the authenticated server function.
alter table public.profiles add column if not exists google_play_purchase_token text;
alter table public.profiles add column if not exists google_play_product_id text;
create unique index if not exists profiles_google_play_purchase_token_idx
  on public.profiles (google_play_purchase_token)
  where google_play_purchase_token is not null;

create or replace function public.protect_google_play_billing_column()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.google_play_purchase_token := null;
    else new.google_play_purchase_token := old.google_play_purchase_token; end if;
    if tg_op = 'INSERT' then new.google_play_product_id := null;
    else new.google_play_product_id := old.google_play_product_id; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_google_play_billing_column on public.profiles;
create trigger protect_google_play_billing_column before insert or update on public.profiles
  for each row execute function public.protect_google_play_billing_column();

grant select, update on public.profiles to service_role;

create table if not exists public.google_play_purchase_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(), attempts integer not null default 1
);
alter table public.google_play_purchase_rate_limits enable row level security;
revoke all on public.google_play_purchase_rate_limits from public, anon, authenticated;
grant select, insert, update on public.google_play_purchase_rate_limits to service_role;
create or replace function public.consume_google_play_purchase_rate_limit(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare attempts_now integer;
begin
  insert into public.google_play_purchase_rate_limits(user_id) values(p_user)
  on conflict(user_id) do update set
    attempts = case when google_play_purchase_rate_limits.window_start < now() - interval '10 minutes' then 1 else google_play_purchase_rate_limits.attempts + 1 end,
    window_start = case when google_play_purchase_rate_limits.window_start < now() - interval '10 minutes' then now() else google_play_purchase_rate_limits.window_start end
  returning attempts into attempts_now;
  return attempts_now <= 30;
end;
$$;
revoke all on function public.consume_google_play_purchase_rate_limit(uuid) from public, anon, authenticated;
grant execute on function public.consume_google_play_purchase_rate_limit(uuid) to service_role;
