-- Owner control center: authenticated admin operations, public notice and a server-side publishing gate.
begin;
create or replace function public.public_console_settings()
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'notice_enabled',coalesce((value->>'notice_enabled')::boolean,false),
  'notice_fr',coalesce(value->>'notice_fr',''), 'notice_en',coalesce(value->>'notice_en',''),
  'posting_paused',coalesce((value->>'posting_paused')::boolean,false),
  'revision',coalesce((value->>'revision')::bigint,0))
 from (select coalesce((select value from public.admin_settings where key='site_console'),'{}'::jsonb) as value) s;
$$;
revoke all on function public.public_console_settings() from public,anon,authenticated;
grant execute on function public.public_console_settings() to anon,authenticated,service_role;

create or replace function public.site_publication_open()
returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or not coalesce((public.public_console_settings()->>'posting_paused')::boolean,false);
$$;
revoke all on function public.site_publication_open() from public,anon,authenticated;
grant execute on function public.site_publication_open() to authenticated,service_role;
drop policy if exists "listings: console publication gate" on public.listings;
create policy "listings: console publication gate" on public.listings as restrictive
 for insert to authenticated with check (public.site_publication_open());

create or replace function public.admin_console_save_settings(payload jsonb, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous jsonb; saved jsonb; revision bigint;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'admin only' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload->'notice_enabled') is distinct from 'boolean'
    or jsonb_typeof(payload->'posting_paused') is distinct from 'boolean'
    or jsonb_typeof(payload->'notice_fr') is distinct from 'string'
    or jsonb_typeof(payload->'notice_en') is distinct from 'string'
    or length(payload->>'notice_fr') > 280 or length(payload->>'notice_en') > 280
    or ((payload->>'notice_enabled')::boolean and (btrim(payload->>'notice_fr')='' or btrim(payload->>'notice_en')='')) then
  raise exception 'invalid settings' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(72841129);
 select value into previous from public.admin_settings where key='site_console' for update;
 revision := coalesce((previous->>'revision')::bigint,0);
 if expected_revision is distinct from revision then raise exception 'settings changed; refresh before saving' using errcode='40001'; end if;
 saved := jsonb_build_object('notice_enabled',(payload->>'notice_enabled')::boolean,
   'posting_paused',(payload->>'posting_paused')::boolean,
   'notice_fr',btrim(payload->>'notice_fr'),'notice_en',btrim(payload->>'notice_en'),'revision',revision+1);
 insert into public.admin_settings(key,value,updated_by,updated_at) values('site_console',saved,auth.uid(),now())
  on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.admin_events(admin_id,action,target_type,target_id,metadata)
  values(auth.uid(),'console_settings_saved','admin_settings','site_console',jsonb_build_object('before',previous,'after',saved));
 return saved;
end;
$$;
revoke all on function public.admin_console_save_settings(jsonb,bigint) from public,anon,authenticated;
grant execute on function public.admin_console_save_settings(jsonb,bigint) to authenticated;

create or replace function public.admin_console_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'admin only' using errcode='42501'; end if;
 select jsonb_build_object(
  'checked_at',now(), 'settings',public.public_console_settings(),
  'stats',jsonb_build_object(
   'listings',(select count(*) from public.listings where seller_id is not null),
   'active',(select count(*) from public.listings where seller_id is not null and coalesce(status,'active')='active' and coalesce(moderation_status,'approved')='approved'),
   'pending',(select count(*) from public.listings where seller_id is not null and moderation_status='pending'),
   'reports',(select count(*) from public.reports where coalesce(status,'open')<>'resolved'),
   'users',(select count(*) from public.profiles),
   'admins',(select count(*) from public.profiles where role='admin'),
   'banned',(select count(*) from public.banned_users),
   'photos',(select count(*) from storage.objects where bucket_id in ('listing-photos','avatars'))),
  'health',public.ops_health(),
  'activity',coalesce((select jsonb_agg(to_jsonb(events)) from (
    select e.id,e.action,e.target_type,e.target_id,e.created_at,
           coalesce(p.name,p.business_name,'Administrateur') as actor
    from public.admin_events e left join public.profiles p on p.id=e.admin_id
    order by e.id desc limit 50) events),'[]'::jsonb)
 ) into result;
 return result;
end;
$$;
revoke all on function public.admin_console_snapshot() from public,anon,authenticated;
grant execute on function public.admin_console_snapshot() to authenticated;
commit;
