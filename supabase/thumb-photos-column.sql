-- ============================================================
--  Thumbnail column for listings — run once against the live project.
--  À coller dans : Supabase → SQL Editor → New query → Run
--
--  Grid/card views should load a small thumbnail instead of the full
--  ~1600px photo. This column stores those thumbnail URLs, same order as
--  `photos`. Nullable/empty for listings posted before this existed — the
--  app falls back to the full photo per-index when a thumbnail is missing,
--  so this is safe to run without any backfill.
-- ============================================================

alter table listings add column if not exists thumb_photos text[] default '{}';
