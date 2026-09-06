-- Buy Sell Trade SXM - email queue worker helpers
-- A lancer dans Supabase SQL Editor ou via:
-- supabase db query --linked --file supabase/email-sending-workflow.sql

alter table public.email_queue add column if not exists locked_at timestamptz;
alter table public.email_queue add column if not exists provider text;
alter table public.email_queue add column if not exists provider_message_id text;

create index if not exists email_queue_pending_idx
  on public.email_queue (status, created_at)
  where status in ('pending', 'failed', 'processing');

create or replace function public.claim_email_queue(batch_size integer default 10)
returns setof public.email_queue
language sql
security definer
set search_path = public
as $$
  with picked as (
    select id
      from public.email_queue
     where (
       status = 'pending'
       or (status = 'failed' and attempts < 5)
       or (status = 'processing' and locked_at < now() - interval '15 minutes')
     )
     order by created_at asc
     limit greatest(batch_size, 1)
     for update skip locked
  )
  update public.email_queue q
     set status = 'processing',
         attempts = coalesce(q.attempts, 0) + 1,
         locked_at = now(),
         last_error = null
    from picked
   where q.id = picked.id
   returning q.*;
$$;

revoke execute on function public.claim_email_queue(integer) from public;
grant execute on function public.claim_email_queue(integer) to service_role;

create or replace function public.mark_email_sent(
  email_id uuid,
  provider_name text,
  provider_id text
)
returns public.email_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.email_queue;
begin
  update public.email_queue
     set status = 'sent',
         provider = provider_name,
         provider_message_id = provider_id,
         sent_at = now(),
         locked_at = null,
         last_error = null
   where id = email_id
   returning * into row;

  return row;
end;
$$;

revoke execute on function public.mark_email_sent(uuid, text, text) from public;
grant execute on function public.mark_email_sent(uuid, text, text) to service_role;

create or replace function public.mark_email_failed(
  email_id uuid,
  error_message text
)
returns public.email_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.email_queue;
begin
  update public.email_queue
     set status = case when attempts >= 5 then 'dead' else 'failed' end,
         locked_at = null,
         last_error = left(coalesce(error_message, 'unknown error'), 1000)
   where id = email_id
   returning * into row;

  return row;
end;
$$;

revoke execute on function public.mark_email_failed(uuid, text) from public;
grant execute on function public.mark_email_failed(uuid, text) to service_role;
