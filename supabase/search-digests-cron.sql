-- Requires search-digests.sql and the two deployed Edge Functions.
-- Reuses the existing EMAIL_QUEUE_SECRET; no new subscription or paid job service.
begin;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='EMAIL_QUEUE_SECRET') then
    raise exception 'Existing EMAIL_QUEUE_SECRET must be configured in Vault first';
  end if;
  if exists(select 1 from cron.job where jobname='bstsxm-search-digests') then
    perform cron.unschedule('bstsxm-search-digests');
  end if;
end $$;
select cron.schedule('bstsxm-search-digests','7,22,37,52 * * * *',$cron$
  select net.http_post(
    url:='https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/send-search-digests',
    headers:=jsonb_build_object('Content-Type','application/json','x-email-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='EMAIL_QUEUE_SECRET' limit 1)),
    body:='{}'::jsonb
  );
$cron$);
update public.search_digest_settings set enabled=true where singleton;
commit;
