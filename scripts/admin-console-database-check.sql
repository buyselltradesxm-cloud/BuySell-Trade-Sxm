-- Run after supabase/admin-console.sql. Every fixture and settings change is rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('ab4ea321-1f75-4466-899e-9858bd23c111','console-admin-fixture@example.invalid',now(),'{"name":"Console admin fixture"}');
update public.profiles set role='admin' where id='ab4ea321-1f75-4466-899e-9858bd23c111';
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
 values('d9d34491-2916-45ae-bf37-97a5b4507d17','console-fixture@example.invalid',now(),'{"name":"Console fixture"}');
select set_config('request.jwt.claims','{"sub":"ab4ea321-1f75-4466-899e-9858bd23c111","role":"authenticated"}',true);
set local role authenticated;
do $test$ declare current_settings jsonb; updated jsonb;
begin
 if public.admin_console_snapshot()->'stats'->>'users' is null then raise exception 'Admin snapshot unavailable'; end if;
 current_settings:=public.public_console_settings();
 updated:=public.admin_console_save_settings('{"notice_enabled":false,"notice_fr":"","notice_en":"","posting_paused":false}',(current_settings->>'revision')::bigint);
 begin perform public.admin_console_save_settings('{"notice_enabled":false,"notice_fr":"","notice_en":"","posting_paused":false}',(current_settings->>'revision')::bigint);raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 begin perform public.admin_console_save_settings('{"notice_enabled":true,"notice_fr":"","notice_en":"","posting_paused":false}',(updated->>'revision')::bigint);raise exception 'Empty notice accepted';exception when invalid_parameter_value then null;end;
end;$test$;
select set_config('request.jwt.claims','{"sub":"d9d34491-2916-45ae-bf37-97a5b4507d17","role":"authenticated"}',true);
do $test$ begin
 if not public.site_publication_open() then raise exception 'Default publishing should be open';end if;
 begin perform public.admin_console_snapshot();raise exception 'Non-admin accessed snapshot';exception when insufficient_privilege then null;end;
 begin perform public.admin_console_save_settings('{"notice_enabled":false,"notice_fr":"","notice_en":"","posting_paused":true}',0);raise exception 'Non-admin changed settings';exception when insufficient_privilege then null;end;
end;$test$;
insert into public.listings(seller_id,title,category,currency,price_usd,status)
 values('d9d34491-2916-45ae-bf37-97a5b4507d17','Console open fixture','elec','usd',10,'active');
select set_config('request.jwt.claims','{"sub":"ab4ea321-1f75-4466-899e-9858bd23c111","role":"authenticated"}',true);
select public.admin_console_save_settings('{"notice_enabled":false,"notice_fr":"","notice_en":"","posting_paused":true}',(public.public_console_settings()->>'revision')::bigint);
select set_config('request.jwt.claims','{"sub":"d9d34491-2916-45ae-bf37-97a5b4507d17","role":"authenticated"}',true);
do $test$ begin
 if public.site_publication_open() then raise exception 'Paused publishing allowed';end if;
 begin
  insert into public.listings(seller_id,title,category,currency,price_usd,status)
   values('d9d34491-2916-45ae-bf37-97a5b4507d17','Console paused fixture','elec','usd',10,'active');
  raise exception 'Paused listing insert accepted';
 exception when insufficient_privilege then null;end;
end;$test$;
select set_config('request.jwt.claims','{"sub":"ab4ea321-1f75-4466-899e-9858bd23c111","role":"authenticated"}',true);
do $test$ begin if not public.site_publication_open() then raise exception 'Admin publishing blocked';end if;end;$test$;
set local role anon;
do $test$ begin
 perform public.public_console_settings();
 begin perform public.admin_console_snapshot();raise exception 'Anonymous snapshot permitted';exception when insufficient_privilege then null;end;
end;$test$;
reset role;
rollback;
select 'PASS: admin-only snapshot/settings, optimistic concurrency, validation, public projection, actual RLS insert gate; all fixtures rolled back' as result;
