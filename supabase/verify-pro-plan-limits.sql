-- Verify that the live Supabase database is enforcing the current plan rules.
-- Expected:
-- 1) function_has_monthly_personal_limit = true
-- 2) exactly one INSERT policy on listings
-- 3) that policy with_check contains can_publish_listing(auth.uid())

select
  pg_get_functiondef('public.can_publish_listing(uuid)'::regprocedure)
    like '%date_trunc(''month'', now())%' as function_has_monthly_personal_limit;

select
  policyname,
  cmd,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'listings'
  and cmd = 'INSERT'
order by policyname;
