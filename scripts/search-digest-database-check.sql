-- Executed together with the migration inside a transaction that ALWAYS rolls back.
create or replace function pg_temp.check_digest(ok boolean, label text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'Digest regression failed: %',label; end if; end $$;
select pg_temp.check_digest(not exists(select 1 from auth.users where id in
 ('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003')),'fixture owners are unused');
select pg_temp.check_digest(not exists(select 1 from public.listings where id between 91000001 and 91000030),'fixture listings are unused');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001','digest-buyer@example.invalid',now(),'{}'),
 ('a1000000-0000-4000-8000-000000000002','digest-seller@example.invalid',now(),'{}'),
 ('a1000000-0000-4000-8000-000000000003','digest-other@example.invalid',now(),'{}');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select public.save_search_alert('{"owner_id":"a1000000-0000-4000-8000-000000000001","category":"immo","subcategory":"rent-apartment","area":"Marigot","currency":"eur","max_price":900}',true,'fr');
do $$ declare criteria jsonb:='{"owner_id":"a1000000-0000-4000-8000-000000000001","request_id":"a1000000-0000-4000-8000-000000000004","category":"all"}'; begin
  perform public.save_search_alert(criteria);
  perform public.save_search_alert(criteria);
  perform pg_temp.check_digest((select count(*) from public.saved_search_alerts where user_id=auth.uid())=2,'idempotent create');
  perform pg_temp.check_digest(not (select email_enabled from public.saved_search_alerts where id='a1000000-0000-4000-8000-000000000004'),'email opt-in defaults off');
  for i in 1..3 loop perform public.save_search_alert('{"owner_id":"a1000000-0000-4000-8000-000000000001","category":"all"}'); end loop;
  begin
    perform public.save_search_alert('{"owner_id":"a1000000-0000-4000-8000-000000000001","category":"all"}');
    raise exception 'Expected alert limit failure';
  exception when others then if sqlerrm<>'ALERT_LIMIT' then raise; end if; end;
  begin
    perform public.save_search_alert('{"owner_id":"a1000000-0000-4000-8000-000000000002","category":"all"}');
    raise exception 'Expected stale account failure';
  exception when others then if sqlerrm<>'AUTH_REQUIRED' then raise; end if; end;
end $$;
delete from public.saved_search_alerts where user_id='a1000000-0000-4000-8000-000000000001' and not email_enabled;
update public.search_digest_preferences set language='fr' where user_id='a1000000-0000-4000-8000-000000000001';
-- Backdate only the test alert so same-transaction listings count as newer.
update public.saved_search_alerts set enabled_at=now()-interval '1 day' where user_id='a1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','',true);
insert into public.listings(id,seller_id,title,category,subcategory,area,price_eur,price_usd,status,moderation_status,created_at,expires_at)
 select 91000000+n,'a1000000-0000-4000-8000-000000000002','Digest QA apartment '||n,'immo','rent-apartment','Marigot',800,900,'active','approved',now()-interval '1 hour',now()+interval '30 days'
 from generate_series(1,25) n;
update public.listings set moderation_status='approved' where id between 91000001 and 91000025;
update public.listings set price_eur=1000 where id=91000021;
update public.listings set status='sold' where id=91000022;
update public.listings set area='Maho' where id=91000023;
update public.profiles set role='admin' where id='a1000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
update public.listings set moderation_status='rejected' where id=91000024;
select set_config('request.jwt.claim.sub','',true);
update public.listings set expires_at=now()-interval '1 day' where id=91000025;
select pg_temp.check_digest(jsonb_array_length(public.search_digest_matches('a1000000-0000-4000-8000-000000000001',now()))=20,'budget area moderation sold expiry matching');
select pg_temp.check_digest(not (select enabled from public.search_digest_settings),'disabled by default');
select pg_temp.check_digest(public.enqueue_search_digests()=0,'disabled service queues nothing');
update public.search_digest_settings set enabled=true;
select pg_temp.check_digest(public.enqueue_search_digests()=1,'queue one digest');
select pg_temp.check_digest(public.enqueue_search_digests()=0,'deduplicate pending job');
-- Refresh deferred content at claim time, not when the job was queued.
update public.listings set status='sold' where id=91000001;
create temporary table digest_claim as select * from public.claim_search_digests(5);
select pg_temp.check_digest((select count(*) from digest_claim)=1,'claim one job');
select pg_temp.check_digest((select jsonb_array_length(payload->'items') from digest_claim)=19,'remove sold listing at send time');
select pg_temp.check_digest((select payload->>'language'='fr' from digest_claim),'locale');
select pg_temp.check_digest((select count(*) from public.claim_search_digests(5))=0,'no overlapping worker duplicate');
select public.finish_search_digest(id,'sent','qa-provider-id') from digest_claim;
select pg_temp.check_digest((select count(*) from public.search_digest_seen where user_id='a1000000-0000-4000-8000-000000000001')=19,'only confirmed items recorded');
select pg_temp.check_digest(public.enqueue_search_digests()=0,'at most one email per UTC day');
-- More than 20 matches remain eligible for a future digest, without repeats.
update public.search_digest_preferences set last_sent_at=now()-interval '2 days' where user_id='a1000000-0000-4000-8000-000000000001';
update public.listings set price_eur=800 where id=91000021;
select pg_temp.check_digest(jsonb_array_length(public.search_digest_matches('a1000000-0000-4000-8000-000000000001',now()))=1,'unshown matches retained, delivered matches excluded');
select pg_temp.check_digest(public.enqueue_search_digests()=1,'queue remaining match');
insert into public.search_digest_reservations(reserved_at) select now() from generate_series(1,70);
select pg_temp.check_digest((select count(*) from public.claim_search_digests(5))=0,'daily cap defers without dropping pending job');
select pg_temp.check_digest(exists(select 1 from public.search_digest_jobs where status='pending'),'pending job retained at ceiling');
delete from public.search_digest_reservations;
insert into public.search_digest_reservations(reserved_at) select now()-interval '1 hour' from generate_series(1,2000);
select pg_temp.check_digest((select count(*) from public.claim_search_digests(5))=0,'monthly cap');
delete from public.search_digest_reservations;
-- Reset today's sent marker to simulate a later day for remaining fixtures.
update public.search_digest_jobs set reserved_at=now()-interval '2 days' where status='sent';
insert into public.user_blocks(blocker_id,blocked_id) values('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002');
select pg_temp.check_digest(jsonb_array_length(public.search_digest_matches('a1000000-0000-4000-8000-000000000001',now()))=0,'blocked seller excluded');
delete from public.user_blocks where blocker_id='a1000000-0000-4000-8000-000000000001';
select public.unsubscribe_search_digests(unsubscribe_token) from public.search_digest_preferences where user_id='a1000000-0000-4000-8000-000000000001';
select pg_temp.check_digest(not exists(select 1 from public.saved_search_alerts where user_id='a1000000-0000-4000-8000-000000000001' and email_enabled),'unsubscribe disables all search emails');
select pg_temp.check_digest((select count(*) from public.claim_search_digests(5))=0,'unsubscribe cancels queued email');
update public.saved_search_alerts set email_enabled=true where user_id='a1000000-0000-4000-8000-000000000001';
select public.enqueue_search_digests();
create temporary table quota_claim as select * from public.claim_search_digests(1);
select pg_temp.check_digest((select count(*) from quota_claim)=1,'reserve remaining listing');
select public.finish_search_digest(id,'daily_quota_exceeded') from quota_claim;
select pg_temp.check_digest(exists(select 1 from public.search_digest_jobs where status='pending' and available_at>now()),'provider quota postpones');
select pg_temp.check_digest((select count(*) from public.search_digest_seen where user_id='a1000000-0000-4000-8000-000000000001')=19,'provider failure never marks matching listings delivered');
update public.search_digest_jobs set available_at=now() where id in (select id from quota_claim);
create temporary table uncertain_claim as select * from public.claim_search_digests(1);
select public.finish_search_digest(id,'Timeout; verify provider') from uncertain_claim;
select pg_temp.check_digest(exists(select 1 from public.search_digest_jobs where id in(select id from uncertain_claim) and status='uncertain'),'uncertain delivery held for manual verification');
select pg_temp.check_digest((select count(*) from public.claim_search_digests(5))=0,'uncertain delivery never automatically retried');
-- Actual authenticated role, not just administrator reads: verify ownership.
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.check_digest((select count(*) from public.saved_search_alerts)=0,'RLS isolates saved searches');
select pg_temp.check_digest(not public.delete_search_alert((select id from public.saved_search_alerts limit 1),'a1000000-0000-4000-8000-000000000001'),'cannot delete another account alert');
reset role;
select pg_temp.check_digest(not has_function_privilege('anon','public.claim_search_digests(integer)','EXECUTE'),'anonymous cannot claim');
select pg_temp.check_digest(not has_function_privilege('authenticated','public.finish_search_digest(uuid,text,text)','EXECUTE'),'authenticated cannot mark email sent');
select pg_temp.check_digest(not has_table_privilege('authenticated','public.search_digest_preferences','SELECT'),'private unsubscribe tokens are not exposed');
select 'Search digest database regression passed; all fixtures rolled back' as result;
