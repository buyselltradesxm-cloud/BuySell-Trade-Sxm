-- ============================================================
--  Buy Sell Trade Sxm — Supabase Advisor fixes (2026-11-24)
--  Idempotent — safe to re-run. Same access rules, faster and tidier.
--
--  1. protect_profile_billing() is a trigger function: nobody should be
--     able to call it through /rest/v1/rpc.
--  2. auth_rls_initplan: policies calling auth.uid()/auth.role()/auth.jwt()
--     re-run it for every row. Wrapping it as (select auth.uid()) makes
--     Postgres compute it once per query. Same rule, same result.
--  3. unindexed_foreign_keys: index every single-column foreign key in
--     public that has no index starting with that column.
--
--  Left as is on purpose (see advisor report):
--   - other SECURITY DEFINER RPCs: they are the app's public/admin API and
--     check the caller themselves (is_admin(), secret, token). is_admin()
--     must stay executable by anon because read policies call it.
--   - multiple_permissive_policies: admin + owner policies; merging them
--     buys nothing at this scale and risks changing who sees what.
--   - rls_enabled_no_policy: server-only tables (service role / definer).
--   - leaked password protection: dashboard setting, paid plans only.
-- ============================================================

revoke execute on function public.protect_profile_billing() from public, anon, authenticated;

do $$
declare
  r record;
  pat constant text := '(?<!SELECT )auth\.(uid|role|jwt)\(\)';
  q text;
  c text;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ pat
  loop
    q := regexp_replace(r.qual, pat, '(select auth.\1())', 'g');
    c := regexp_replace(r.with_check, pat, '(select auth.\1())', 'g');
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if r.qual is not null then stmt := stmt || ' using (' || q || ')'; end if;
    if r.with_check is not null then stmt := stmt || ' with check (' || c || ')'; end if;
    execute stmt;
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and cardinality(c.conkey) = 1
      and not exists (select 1 from pg_index i
                      where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
  loop
    execute format('create index if not exists %I on %s (%I)', left(r.conname, 59) || '_idx', r.tbl, r.col);
  end loop;
end $$;
