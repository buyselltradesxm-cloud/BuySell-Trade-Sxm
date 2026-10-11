-- ============================================================
--  Message query tuning — run once against the live project.
--  À coller dans : Supabase → SQL Editor → New query → Run
--
--  messages_parties_idx (sender_id, recipient_id) only helps an equality
--  lookup on both columns at once. The real read pattern is "my messages
--  (as sender OR recipient), newest first" (fetchInbox / fetchMessages in
--  supabase-api.js) — these two indexes match that instead.
-- ============================================================

drop index if exists messages_parties_idx;
create index if not exists messages_sender_created_idx on messages (sender_id, created_at desc);
create index if not exists messages_recipient_created_idx on messages (recipient_id, created_at desc);
