-- Keeps the new Supabase project aligned with the production admin email.
-- Run this after setup.sql when migrating to a fresh project.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'rxmarketing09@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do update
  set name = coalesce(public.profiles.name, excluded.name),
      role = case
        when lower(new.email) = 'rxmarketing09@gmail.com' then 'admin'
        else public.profiles.role
      end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, name, role)
select
  id,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'admin'
from auth.users
where lower(email) = 'rxmarketing09@gmail.com'
on conflict (id) do update
set role = 'admin',
    name = coalesce(public.profiles.name, excluded.name);
