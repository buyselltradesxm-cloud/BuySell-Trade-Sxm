-- Optional saved-search emails. Run after the existing marketplace schema.
-- No existing user is enrolled. No provider request is made by this migration.
begin;
create table if not exists public.search_digest_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en' check (language in ('en','fr')),
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.saved_search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (length(category) between 1 and 40),
  subcategory text not null default '' check (length(subcategory)<=80),
  keywords text not null default '' check (length(keywords)<=120),
  area text not null default '' check (length(area)<=80),
  currency text not null default 'eur' check (currency in ('eur','usd')),
  min_price numeric check (min_price>=0 and min_price<=1000000000),
  max_price numeric check (max_price>=0 and max_price<=1000000000),
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  enabled_at timestamptz not null default now(),
  check (min_price is null or max_price is null or min_price<=max_price)
);
create index if not exists saved_search_alerts_owner_idx on public.saved_search_alerts(user_id);
create table if not exists public.search_digest_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','cancelled','uncertain')),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  reserved_at timestamptz,
  cutoff_at timestamptz,
  recipient_email text,
  payload jsonb,
  provider_id text,
  last_error text
);
create unique index if not exists search_digest_jobs_one_waiting on public.search_digest_jobs(user_id)
  where status in ('pending','sending','uncertain');
create index if not exists search_digest_jobs_waiting on public.search_digest_jobs(created_at) where status='pending';
-- Reservations count attempts, including failed requests: a conservative spending ceiling.
create table if not exists public.search_digest_reservations (
  id bigint generated always as identity primary key,
  job_id uuid references public.search_digest_jobs(id) on delete set null,
  reserved_at timestamptz not null default now()
);
create index if not exists search_digest_reservations_date on public.search_digest_reservations(reserved_at);
create table if not exists public.search_digest_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  primary key(user_id,listing_id)
);
create table if not exists public.search_digest_settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  daily_limit integer not null default 70 check(daily_limit between 0 and 70),
  monthly_limit integer not null default 2000 check(monthly_limit between 0 and 2000)
);
insert into public.search_digest_settings(singleton) values(true) on conflict do nothing;

alter table public.search_digest_preferences enable row level security;
alter table public.saved_search_alerts enable row level security;
alter table public.search_digest_jobs enable row level security;
alter table public.search_digest_reservations enable row level security;
alter table public.search_digest_settings enable row level security;
alter table public.search_digest_seen enable row level security;
revoke all on public.search_digest_preferences,public.saved_search_alerts,public.search_digest_jobs,
  public.search_digest_reservations,public.search_digest_settings,public.search_digest_seen from public,anon,authenticated;
grant select on public.saved_search_alerts to authenticated;
drop policy if exists own_saved_search_alerts on public.saved_search_alerts;
create policy own_saved_search_alerts on public.saved_search_alerts for select to authenticated using(user_id=(select auth.uid()));
grant all on public.search_digest_preferences,public.saved_search_alerts,public.search_digest_jobs,
  public.search_digest_reservations,public.search_digest_settings,public.search_digest_seen to service_role;

create or replace function public.save_search_alert(criteria jsonb, consent boolean default false, locale text default 'en', alert_id uuid default null)
returns public.saved_search_alerts language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result public.saved_search_alerts; old public.saved_search_alerts;
begin
  if uid is null or criteria->>'owner_id' is distinct from uid::text or exists(select 1 from public.banned_users where user_id=uid) then raise exception 'AUTH_REQUIRED'; end if;
  -- Serialize per-owner writes, including the five-alert limit.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,71));
  if alert_id is null and nullif(criteria->>'request_id','') is not null then
    select * into result from public.saved_search_alerts where id=(criteria->>'request_id')::uuid;
    if found then
      if result.user_id<>uid then raise exception 'NOT_FOUND'; end if;
      return result; -- Lost create response: same request must not create a duplicate.
    end if;
  end if;
  if alert_id is not null then
    select * into old from public.saved_search_alerts where id=alert_id and user_id=uid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
  elsif (select count(*) from public.saved_search_alerts where user_id=uid)>=5 then raise exception 'ALERT_LIMIT'; end if;
  if criteria->>'category' not in ('all','voit','immo','elec','meub','mode','job','serv','pets','bat','gaming','beauty','scoot','locvoit','menag','dining','tourism','transport','food','lois','billet','pro','bonplan','autres')
    or criteria->>'category' is null then raise exception 'INVALID_CATEGORY'; end if;
  insert into public.search_digest_preferences(user_id,language) values(uid,case when locale='fr' then 'fr' else 'en' end)
    on conflict(user_id) do update set language=excluded.language;
  insert into public.saved_search_alerts(id,user_id,category,subcategory,keywords,area,currency,min_price,max_price,email_enabled,enabled_at)
  values(coalesce(alert_id,nullif(criteria->>'request_id','')::uuid,gen_random_uuid()),uid,criteria->>'category',coalesce(criteria->>'subcategory',''),
    trim(coalesce(criteria->>'keywords','')),coalesce(criteria->>'area',''),coalesce(criteria->>'currency','eur'),
    nullif(criteria->>'min_price','')::numeric,nullif(criteria->>'max_price','')::numeric,coalesce(consent,false),now())
  on conflict(id) do update set category=excluded.category,subcategory=excluded.subcategory,keywords=excluded.keywords,
    area=excluded.area,currency=excluded.currency,min_price=excluded.min_price,max_price=excluded.max_price,
    email_enabled=excluded.email_enabled,
    enabled_at=case when (not old.email_enabled and excluded.email_enabled) or
      (old.category,old.subcategory,old.keywords,old.area,old.currency,old.min_price,old.max_price) is distinct from
      (excluded.category,excluded.subcategory,excluded.keywords,excluded.area,excluded.currency,excluded.min_price,excluded.max_price)
      then now() else public.saved_search_alerts.enabled_at end
  returning * into result;
  return result;
end $$;

create or replace function public.delete_search_alert(alert_id uuid, owner_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  delete from public.saved_search_alerts where id=alert_id and user_id=auth.uid() and user_id=owner_id;
  return found;
end $$;

-- A random private token permits unsubscribe without login. Never accept a public user ID.
create or replace function public.unsubscribe_search_digests(token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
  select user_id into uid from public.search_digest_preferences where unsubscribe_token=token;
  if uid is null then return false; end if;
  update public.saved_search_alerts set email_enabled=false where user_id=uid;
  update public.search_digest_jobs set status='cancelled' where user_id=uid and status='pending';
  return true;
end $$;

-- Service-only matcher: current approved, unexpired, available listings only.
-- The timestamp watermark advances ONLY after a confirmed provider acceptance.
create or replace function public.search_digest_matches(owner_id uuid, cutoff timestamptz)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id desc),'[]'::jsonb) from (
    select l.id::text,l.title,l.title_fr,l.title_en,l.area,l.price_eur,l.price_usd,l.created_at
    from public.listings l
    where l.status='active' and l.moderation_status='approved' and l.seller_id is not null and l.seller_id<>owner_id
      and (l.expires_at is null or l.expires_at>now())
      and l.created_at<=cutoff
      and not exists(select 1 from public.search_digest_seen s where s.user_id=owner_id and s.listing_id=l.id)
      and not exists(select 1 from public.banned_users b where b.user_id in (l.seller_id,owner_id))
      and not exists(select 1 from public.user_blocks b where
        (b.blocker_id=owner_id and b.blocked_id=l.seller_id) or (b.blocker_id=l.seller_id and b.blocked_id=owner_id))
      and exists(select 1 from public.saved_search_alerts a join public.search_digest_preferences p on p.user_id=a.user_id
        where a.user_id=owner_id and a.email_enabled
          and l.created_at>a.enabled_at
          and (a.category='all' or a.category=l.category) and (a.subcategory='' or a.subcategory=l.subcategory)
          and (a.area='' or a.area=l.area)
          and (a.min_price is null or (case when a.currency='usd' then l.price_usd else l.price_eur end)>=a.min_price)
          and (a.max_price is null or (case when a.currency='usd' then l.price_usd else l.price_eur end)<=a.max_price)
          and not exists(select 1 from regexp_split_to_table(lower(a.keywords),'\s+') word where word<>''
            and position(word in lower(concat_ws(' ',l.title,l.title_fr,l.title_en,l.description)))=0))
    order by l.created_at asc,l.id asc limit 20
  ) m;
$$;

create or replace function public.enqueue_search_digests() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if not exists(select 1 from public.search_digest_settings where enabled) then return 0; end if;
  insert into public.search_digest_jobs(user_id)
    select p.user_id from public.search_digest_preferences p join auth.users u on u.id=p.user_id
    where u.email_confirmed_at is not null and u.email is not null
      and (p.last_sent_at is null or p.last_sent_at<=now()-interval '24 hours')
      and exists(select 1 from public.saved_search_alerts where user_id=p.user_id and email_enabled)
      and jsonb_array_length(public.search_digest_matches(p.user_id,now()))>0
    on conflict do nothing;
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.claim_search_digests(batch_size integer default 5)
returns setof public.search_digest_jobs language plpgsql security definer set search_path='' as $$
declare j public.search_digest_jobs; prefs public.search_digest_preferences; items jsonb;
  settings public.search_digest_settings; email text; claimed integer:=0; daily integer; monthly integer;
  today timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  month_start timestamptz:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
  -- All workers reserve under one lock; overlapping cron runs cannot exceed the ceiling.
  select * into settings from public.search_digest_settings where singleton for update;
  if not settings.enabled then return; end if;
  update public.search_digest_jobs set status='uncertain',last_error='Worker stopped; verify provider before retrying'
    where status='sending' and reserved_at<now()-interval '15 minutes';
  select count(*) into daily from public.search_digest_reservations where reserved_at>=today;
  select count(*) into monthly from public.search_digest_reservations where reserved_at>=month_start;
  for j in select * from public.search_digest_jobs where status='pending' and available_at<=now() order by created_at,id for update skip locked loop
    exit when claimed>=greatest(1,least(coalesce(batch_size,5),5)) or daily>=settings.daily_limit or monthly>=settings.monthly_limit;
    select * into prefs from public.search_digest_preferences where user_id=j.user_id;
    if prefs.last_sent_at>now()-interval '24 hours' or exists(select 1 from public.search_digest_jobs where user_id=j.user_id and status='sent' and reserved_at>now()-interval '24 hours') then
      update public.search_digest_jobs set available_at=now()+interval '1 hour' where id=j.id; continue;
    end if;
    select u.email into email from auth.users u where u.id=j.user_id and u.email_confirmed_at is not null;
    items:=public.search_digest_matches(j.user_id,now());
    if email is null or jsonb_array_length(items)=0 then
      update public.search_digest_jobs set status='cancelled' where id=j.id; continue;
    end if;
    insert into public.search_digest_reservations(job_id) values(j.id);
    update public.search_digest_jobs set status='sending',reserved_at=now(),cutoff_at=now(),recipient_email=email,
      payload=jsonb_build_object('language',prefs.language,'unsubscribe_token',prefs.unsubscribe_token,'items',items)
      where id=j.id returning * into j;
    daily:=daily+1; monthly:=monthly+1; claimed:=claimed+1;
    return next j;
  end loop;
end $$;

create or replace function public.finish_search_digest(job_id uuid, outcome text, provider_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.search_digest_jobs;
begin
  select * into j from public.search_digest_jobs where id=job_id and status='sending' for update;
  if not found then return false; end if;
  if outcome='sent' and provider_id is not null then
    update public.search_digest_jobs set status='sent',provider_id=finish_search_digest.provider_id where id=job_id;
    update public.search_digest_preferences set last_sent_at=j.cutoff_at where user_id=j.user_id;
    insert into public.search_digest_seen(user_id,listing_id)
      select j.user_id,l.id from jsonb_array_elements(j.payload->'items') item
      join public.listings l on l.id::text=item->>'id' on conflict do nothing;
  elsif outcome in ('daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded') then
    update public.search_digest_jobs set status='pending',available_at=case when outcome='monthly_quota_exceeded'
      then (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC'
      when outcome='daily_quota_exceeded' then (date_trunc('day',now() at time zone 'UTC')+interval '1 day') at time zone 'UTC'
      else now()+interval '1 hour' end,last_error=outcome where id=job_id;
  else
    -- Never auto-retry a timeout or uncertain acceptance: provider deduplication expires.
    update public.search_digest_jobs set status='uncertain',last_error=left(outcome,200) where id=job_id;
  end if;
  return true;
end $$;

revoke all on function public.save_search_alert(jsonb,boolean,text,uuid),public.delete_search_alert(uuid,uuid) from public,anon;
grant execute on function public.save_search_alert(jsonb,boolean,text,uuid),public.delete_search_alert(uuid,uuid) to authenticated;
revoke all on function public.unsubscribe_search_digests(uuid) from public;
grant execute on function public.unsubscribe_search_digests(uuid) to anon,authenticated;
revoke all on function public.search_digest_matches(uuid,timestamptz),public.enqueue_search_digests(),
  public.claim_search_digests(integer),public.finish_search_digest(uuid,text,text) from public,anon,authenticated;
grant execute on function public.search_digest_matches(uuid,timestamptz),public.enqueue_search_digests(),
  public.claim_search_digests(integer),public.finish_search_digest(uuid,text,text) to service_role;
commit;
