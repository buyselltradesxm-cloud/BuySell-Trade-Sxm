-- ============================================================
--  Buy Sell Trade Sxm — user blocking
--  Run in: Supabase Dashboard > SQL Editor > New query > paste all > Run
--  Idempotent — safe to re-run. Run AFTER admin-fix.sql.
--
--  WHY: the chat's "Bloquer / Block" button only showed a toast. Stores
--  (Apple guideline 1.2) and the site's own "Signaler et bloquer" promise
--  need a block that actually stops messages.
--
--  A block is one-sided to create (only the blocker sees and removes it)
--  but two-sided in effect: neither party can message the other while it
--  exists. Existing messages are kept; the app hides the conversation and
--  the blocked seller's listings for the blocker.
-- ============================================================

create table if not exists public.user_blocks (
  blocker_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id   uuid not null references auth.users(id) on delete cascade,
  -- Display name as the blocker saw it, so the "blocked users" list needs
  -- no read access to the other person's (private) profile.
  blocked_name text check (char_length(blocked_name) <= 80),
  created_at   timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks: voir les siens" on public.user_blocks;
create policy "user_blocks: voir les siens"
  on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "user_blocks: bloquer" on public.user_blocks;
create policy "user_blocks: bloquer"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "user_blocks: débloquer" on public.user_blocks;
create policy "user_blocks: débloquer"
  on public.user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, delete on public.user_blocks to service_role;

-- True when either of the two users has blocked the other. Security
-- definer so the message policy can see a block made by the OTHER party;
-- it only answers for pairs the caller belongs to, so it cannot be used to
-- find out who has blocked whom.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() in (a, b) and exists (
    select 1 from public.user_blocks
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

drop policy if exists "messages: envoyés par soi" on public.messages;
create policy "messages: envoyés par soi"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_banned()
    and not public.is_blocked_between(sender_id, recipient_id)
  );
