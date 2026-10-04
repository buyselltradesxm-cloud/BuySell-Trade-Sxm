-- ============================================================
--  Buy Sell Trade Sxm — visit counts and JavaScript error reports
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run. Run AFTER admin-upgrade.sql.
--
--  WHY: there was no way to see how many people visit or whether the app
--  is throwing errors for them. telemetry.js sends both here; the admin
--  panel's Statistics tab reads them through admin_site_stats().
--
--  Nothing here identifies a visitor: visits are plain daily counters (no
--  cookie, no id, no IP), and an error report is the error text, the page
--  and the browser type. Both tables are closed to the public; the two
--  write functions are the only way in, and admins the only readers.
-- ============================================================

create table if not exists public.site_daily_stats (
  day     date not null,
  surface text not null,              -- 'web' | 'pwa' | 'android' | 'ios'
  views   integer not null default 0, -- page loads
  visits  integer not null default 0, -- first load of the day per browser
  primary key (day, surface)
);

create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message    text not null,
  source     text,
  line       integer,
  col        integer,
  stack      text,
  page       text,
  surface    text,
  user_agent text
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);

-- No policies on purpose: reads and writes only go through the functions below.
alter table public.site_daily_stats enable row level security;
alter table public.client_errors enable row level security;
revoke all on public.site_daily_stats, public.client_errors from anon, authenticated;
grant select on public.site_daily_stats, public.client_errors to service_role;

create or replace function public.track_site_view(surface text, new_visit boolean default false)
returns void language sql security definer set search_path = public as $$
  insert into public.site_daily_stats (day, surface, views, visits)
  values (current_date,
          case when surface in ('web', 'pwa', 'android', 'ios') then surface else 'web' end,
          1, case when new_visit then 1 else 0 end)
  on conflict (day, surface) do update
    set views = public.site_daily_stats.views + 1,
        visits = public.site_daily_stats.visits + excluded.visits;
$$;

-- Stores one error report. Anyone can call it, so every field is cut to a
-- fixed length, at most 300 reports are kept per hour, and reports older
-- than 30 days are dropped on the way in (no scheduled job needed).
create or replace function public.log_client_error(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p->>'message', '') = '' then return; end if;
  delete from public.client_errors where created_at < now() - interval '30 days';
  if (select count(*) from public.client_errors where created_at > now() - interval '1 hour') >= 300 then return; end if;
  insert into public.client_errors (message, source, line, col, stack, page, surface, user_agent)
  values (
    left(p->>'message', 500),
    left(p->>'source', 300),
    nullif(left(regexp_replace(coalesce(p->>'line', ''), '\D', '', 'g'), 9), '')::integer,
    nullif(left(regexp_replace(coalesce(p->>'col', ''), '\D', '', 'g'), 9), '')::integer,
    left(p->>'stack', 2000),
    left(p->>'page', 200),
    case when p->>'surface' in ('web', 'pwa', 'android', 'ios') then p->>'surface' else 'web' end,
    left(p->>'user_agent', 300)
  );
end;
$$;

-- Admin panel: daily visits/views and the errors of the same period,
-- grouped so one bug hitting many visitors shows as one line with a count.
create or replace function public.admin_site_stats(days integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since date := current_date - (greatest(days, 1) - 1);
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'visits', d.visits, 'views', d.views, 'app_views', d.app_views) order by d.day desc)
        from (select day, sum(visits) as visits, sum(views) as views,
                     sum(views) filter (where surface in ('android', 'ios', 'pwa')) as app_views
                from public.site_daily_stats where day >= since group by day) d), '[]'::jsonb),
    'errors', coalesce((
      select jsonb_agg(jsonb_build_object('message', e.message, 'source', e.source, 'line', e.line, 'count', e.n,
                                          'last_seen', e.last_seen, 'page', e.page, 'surface', e.surface) order by e.last_seen desc)
        from (select message, source, line, count(*) as n, max(created_at) as last_seen,
                     max(page) as page, max(surface) as surface
                from public.client_errors where created_at >= since
               group by message, source, line order by max(created_at) desc limit 30) e), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.track_site_view(text, boolean), public.log_client_error(jsonb), public.admin_site_stats(integer) from public;
grant execute on function public.track_site_view(text, boolean), public.log_client_error(jsonb) to anon, authenticated;
grant execute on function public.admin_site_stats(integer) to authenticated;
