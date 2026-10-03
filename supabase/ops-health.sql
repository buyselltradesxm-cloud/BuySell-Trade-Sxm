-- Buy Sell Trade SXM -- operational health summary for monitoring (2026-10-03)
-- Run once: supabase db query --linked --file supabase/ops-health.sql
--
-- Called only by the ops-health Edge Function (service role), which the
-- scheduled GitHub Action polls. Returns counts and job names, never row data.
begin;

create or replace function public.ops_health()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- Every scheduled job whose most recent run failed, or that has not run
    -- for more than 26 hours (all jobs here run at least daily).
    'failing_jobs', coalesce((
      select jsonb_agg(jsonb_build_object('job', j.jobname, 'last_status', d.status, 'last_run', d.start_time))
        from cron.job j
        left join lateral (
          select status, start_time from cron.job_run_details r
           where r.jobid = j.jobid order by start_time desc limit 1
        ) d on true
       where j.active
         and (d.status is distinct from 'succeeded' or d.start_time < now() - interval '26 hours')
    ), '[]'::jsonb),
    'emails_failed_24h', (select count(*) from public.email_queue where status = 'failed' and created_at > now() - interval '24 hours'),
    'emails_stuck_pending', (select count(*) from public.email_queue where status = 'pending' and created_at < now() - interval '2 hours'),
    'stripe_events_failed_24h', (select count(*) from public.payment_webhook_events where status = 'failed' and received_at > now() - interval '24 hours'),
    'checked_at', now()
  );
$$;

revoke all on function public.ops_health() from public, anon, authenticated;
grant execute on function public.ops_health() to service_role;

commit;
