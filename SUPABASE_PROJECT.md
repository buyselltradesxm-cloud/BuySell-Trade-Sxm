# Supabase Project

The production Supabase project for Buy Sell Trade SXM is owned by the
`buyselltradesxm-cloud` organization.

Current project:

```text
Organization: buyselltradesxm-cloud's Org
Organization id: mykgcmefitqivyamutzg
Project name: Buy Sell Trade SXM
Project ref: szhaxlmronirhnntlwyb
Project URL: https://szhaxlmronirhnntlwyb.supabase.co
Region: eu-west-1
Dashboard: https://supabase.com/dashboard/project/szhaxlmronirhnntlwyb
```

The previous organization, `tchalaplus1's Org` (id
`wyuaphqrdonzkaylkxpa`), still holds an older inactive project named
`buyselltradesxm` (ref `npjkbhkmyfppmosforls`, eu-central-1). That inactive
project is not used by the app.

## Supabase CLI login

The CLI keeps one login per machine. Logging in for another project (for
example `mijahhair`) replaces this one, and every `db query --linked` or
`functions deploy` then fails with a 403. Check before any database or deploy
work:

```powershell
npx supabase projects list   # must list szhaxlmronirhnntlwyb with "linked": true
```

If it is missing, sign in as an organization member in a real terminal (the
login needs an interactive TTY). The previous project owner's account has the
Developer role in the destination organization; use an Owner account for
organization or project settings that Developer cannot change.

```powershell
npx supabase logout
npx supabase login
npx supabase link --project-ref szhaxlmronirhnntlwyb
```

Never commit the CLI access token (`sbp_...`) or any `supabase secrets` value.
This repository is public; the token grants full control of every project in
the account. The CLI stores it outside the repo, and `supabase/.temp/` is
ignored.

Do not use the old inactive project ref for this app.

Frontend files must use:

```text
SUPABASE_URL=https://szhaxlmronirhnntlwyb.supabase.co
```

The public publishable key is stored in `supabase-config.js`. Never put the Supabase `service_role` key in frontend files.

## Production readiness check (2026-10-05)

The existing project is active and healthy, linked to this checkout, and is
already serving the web app. The app's URL and publishable key point to this
project. Its auth configuration in `supabase/config.toml` uses the production
site URL, email confirmations, secure password changes, and the Resend SMTP
secret reference. Google and Apple OAuth are enabled in the frontend config;
their provider credentials and redirect settings must remain configured in
the Supabase dashboard.

The following Edge Functions were present in production during the check:
`send-email-queue`, `send-push`, `admin-delete-user`, `delete-my-account`,
`apple-purchases`, `apple-notifications`, `request-password-reset`,
`billing-portal`, `create-checkout`, `stripe-webhook`, and `ops-health`.
Production secrets are configured there; do not copy their values into this
repository.

### Migration tracking gap

There is no `supabase/migrations/` directory, and the linked production
database has no `supabase_migrations.schema_migrations` table. The schema is
currently represented by standalone SQL files in `supabase/`, which means the
CLI cannot tell which files were applied or reliably reproduce the database.
Do not run `supabase db push` against production until a schema baseline has
been captured, reviewed, and marked as already applied. Do not run
`supabase/setup.sql` or `supabase/seed.sql` against production as a substitute
for that baseline.

The schema-only dump was attempted on 2026-10-05 but could not run because the
Supabase CLI's `db dump` requires Docker and Docker Desktop is not installed in
the current workstation environment. Install/start Docker or use an approved
Postgres client connection, then capture and review the remote schema before
creating and marking the baseline migration as applied. No production schema
or migration history was changed by this attempt.

### Security advisor review (2026-10-05)

`npx supabase db advisors --linked --type security --level info` returned 17
WARN findings and 9 INFO notices:

- 4 anonymous-role `SECURITY DEFINER` RPC warnings: `is_admin`,
  `log_client_error`, `track_site_view`, and `unsubscribe_renewal_by_token`.
  The checked-in SQL indicates these are intentionally callable for public
  listing RLS, bounded client telemetry, and token-based unsubscribe. Keep
  those use cases working when reviewing grants; do not blanket-revoke them.
- 13 authenticated-role `SECURITY DEFINER` RPC warnings: `admin_daily_counts`,
  `admin_delete_listing`, `admin_set_listing_status`, `admin_site_stats`,
  `can_publish_listing`, `confirm_listing_available`, `is_admin`, `is_banned`,
  `is_blocked_between`, `log_client_error`, `mark_message_read`,
  `track_site_view`, and `unsubscribe_renewal_by_token`. These have different
  intended callers and authorization checks. Review each function body and
  the app's RPC use before changing grants; an advisor warning alone does not
  establish that a function is exploitable.
- Leaked-password protection is disabled. Supabase currently requires Pro or
  above for this feature; the destination organization is on Free. Enabling it
  would require a paid-plan change, which has not been made. If upgraded,
  enable it in Auth password settings and confirm signup/password-change flows.
- The 9 no-policy notices are on `apple_purchase_intents`,
  `apple_purchase_rate_limits`, `apple_transactions`, `client_errors`,
  `payment_webhook_events`, `security_events`, `security_rate_limits`,
  `site_daily_stats`, and `stripe_boost_purchases`. These appear intended for
  service-role or server-side access; verify table grants are also restricted.

No advisor findings were auto-fixed. Existing scripts document some intended
access patterns, but a complete production schema snapshot and per-function
grant verification are prerequisites to safely resolving the warnings.

### Ownership and transfer

The existing production project was transferred into `buyselltradesxm-cloud's
Org` (id `mykgcmefitqivyamutzg`) on 2026-10-05. Its project ref, URL, region,
database, and deployment configuration stayed the same. The CLI confirms the
project is `ACTIVE_HEALTHY` and remains linked to this checkout.

The previous project owner's account accepted a Developer invitation to enable
the transfer and retains Developer access in the destination organization.
Developer access includes deleting project data, users, files, and Edge
Functions. The destination account is Owner. Review whether the previous
account still needs access; removing it is a separate organization permission
change. Both accounts showed MFA disabled during the transfer; each account
owner must complete MFA enrollment in their own account security settings.

The destination Free organization now has two active projects: its existing
project and this production project. This reaches Supabase's two-project
Free-plan limit. No plan or billing changes were made.
