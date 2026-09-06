-- Active les tâches automatiques quotidiennes pour les annonces.
-- 08:00 UTC: crée la notification/email_queue pour les annonces arrivées à 30 jours.
-- 09:00 UTC: expire les annonces sans réponse après 5 jours.

create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bstsxm-renewal-reminders') then
    perform cron.unschedule('bstsxm-renewal-reminders');
  end if;

  if exists (select 1 from cron.job where jobname = 'bstsxm-expire-unconfirmed') then
    perform cron.unschedule('bstsxm-expire-unconfirmed');
  end if;
end;
$$;

select cron.schedule(
  'bstsxm-renewal-reminders',
  '0 8 * * *',
  'select public.enqueue_listing_renewal_reminders();'
);

select cron.schedule(
  'bstsxm-expire-unconfirmed',
  '0 9 * * *',
  'select public.expire_unconfirmed_listings(5);'
);
