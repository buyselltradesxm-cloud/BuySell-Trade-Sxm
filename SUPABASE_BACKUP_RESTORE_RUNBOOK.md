# Buy Sell Trade SXM — Supabase backup and restore runbook

Status: production logical export and listing-photos/avatars downloads completed on 2026-11-01. An isolated restore drill and a second encrypted copy remain pending.

## First export completed

The owner ran all three CLI exports successfully for the linked production project. A read-only local check confirmed nonempty files in `C:\Users\PC\Documents\SXM-Backups\2026-11-01-214635`:

- `roles.sql`: 370 bytes
- `schema.sql`: 106,803 bytes
- `data.sql`: 147,515 bytes

This confirms the export files exist, not that a restore succeeds. The files are outside the public repository. The owner also completed downloads of listing-photos and avatars. Encryption, a second copy, full object-inventory comparison, and an isolated restore drill have not been verified.

## Project scope

- Supabase project ref: `szhaxlmronirhnntlwyb` (confirm in the dashboard before every operation).
- Plan last recorded in the project notes: Free. Supabase's current documentation says Free projects do not receive automatic daily database backups. Recheck the plan before relying on any platform backup.
- The repository contains `supabase/schema.sql`, setup SQL, standalone SQL changes, and two files under `supabase/migrations/`. This is not yet proof that the repository alone can recreate the live database; compare its migration history and schema with production before relying on it.

## Backup policy while staying on Free

1. Make a backup at least weekly and immediately before any schema, security-policy, or billing change.
2. Save each dated backup to an encrypted location outside this Git repository and outside the Supabase project. Keep a second encrypted copy in a separate account or device. Never commit dumps, credentials, or customer data.
3. Retain at least four weekly sets. Restrict access to the project owner and one recovery administrator. Record the backup time, project ref, CLI version, file sizes, and SHA-256 hashes alongside each set.
4. Every quarter, restore a copy into a disposable local Supabase environment and check representative tables, row counts, RLS behavior, and application reads. Do not test restoration against production.

## Database export

Prerequisites: a verified project-owner login, the correct project ref, Docker Desktop running, and the database password available through a secure prompt. Do not paste a password or connection URL into chat, commit it, or save it in shell history. Use a private backup directory outside the repository.

The Supabase CLI guide's logical export consists of roles, schema, and data files. Run from this repository after confirming the linked project is `szhaxlmronirhnntlwyb`:

```powershell
$backupDir = 'REPLACE_WITH_ENCRYPTED_BACKUP_LOCATION\BuySellTradeSXM\YYYY-MM-DD'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

supabase db dump --linked --role-only --file (Join-Path $backupDir 'roles.sql')
supabase db dump --linked --file (Join-Path $backupDir 'schema.sql')
supabase db dump --linked --data-only --use-copy --file (Join-Path $backupDir 'data.sql')
```

Stop if the CLI says the project is not linked to the expected ref, any dump command fails, or a file is empty. Review the CLI output and generated files before treating the export as successful. Because this project has existing customizations around Supabase-managed `auth` and `storage` schemas, determine which custom triggers, policies, or other objects are excluded by the CLI dump and capture/recreate them from reviewed SQL migrations. Do not assume the three files are a complete account-and-file backup.

After export, calculate hashes and copy the complete set to the second encrypted location. Do not include the connection string or database password in the manifest.

## Other recovery material

- **Storage files:** database backups contain Storage metadata, not the underlying image/object bytes. Export each bucket's objects separately and record per-bucket object counts and total bytes. Preserve bucket settings and policies as reviewed SQL/configuration. Supabase supports bulk export using its Storage CLI or S3-compatible tools.
- **Application and database code:** the repository should contain the reviewed schema, SQL changes, Edge Function source, and deployment workflow. Confirm the production migration history matches these files; take a protected copy of the deployed functions if source differs.
- **Secrets and provider settings:** maintain a separate encrypted inventory of secret *names*, rotation/recovery instructions, OAuth provider configuration, SMTP/Resend, payment webhooks, scheduled jobs, and app URLs. Store secret values only in the approved secret manager; never in the repo or backup manifest.
- **Authentication users:** do not assume a logical CLI dump restores Supabase-managed Auth users or provider sessions. Verify a separate supported recovery path before calling the system fully recoverable; users may need password resets or provider reauthentication after a project rebuild.

## Restore drill (never run against production)

1. Create an isolated local Supabase instance or a disposable recovery project. Confirm its URL/ref is not production.
2. Configure required extensions and Webhooks before restore. Restore `roles.sql`, then `schema.sql`, then `data.sql` using Supabase's documented `psql` single-transaction procedure with `ON_ERROR_STOP=1`.
3. Recreate the reviewed customizations to `auth`/`storage`, required Realtime publications, bucket settings, Edge Functions, secrets, and provider configuration. Restore Storage object bytes separately.
4. Validate representative records and counts against the backup manifest; verify listing reads, a test account sign-in/reset, RLS-denied anonymous access, image retrieval, and Edge Function health.
5. Record duration, missing items, errors, and recovery point. Fix gaps and repeat until the drill succeeds. Do not point the production website at the recovery copy during the drill.

## Current blockers and completion evidence

- Supabase Dashboard was checked on 2026-11-01: project `szhaxlmronirhnntlwyb` is Healthy, the plan is Free, and the dashboard says **No backups** and **No migrations**. This confirms there is currently no platform backup to restore from. The local repository has two migration files, so production migration history still needs reconciliation.
- Docker Desktop is installed but its daemon is stopped; the Supabase CLI therefore cannot run its dump container yet.
- The Supabase CLI is installed, but no CLI access token is available to this shell. No database command ran and no production data changed.
- No encrypted off-repository backup location has been selected, and no export, hash manifest, or restore drill exists yet.

Mark this procedure complete only after a full export is stored in two encrypted locations and a restore drill passes in an isolated environment.

## Supabase references

- [Database backups and Free-plan guidance](https://supabase.com/docs/guides/platform/backups)
- [Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Download Storage objects](https://supabase.com/docs/guides/storage/management/download-objects)
