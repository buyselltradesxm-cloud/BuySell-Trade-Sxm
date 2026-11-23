# Optional search email digests

Users manage up to five searches from the home bell → My search alerts. Email consent
is unchecked on new searches. The visible criteria are category, type, keywords, area,
currency and min/max budget. Keywords all have to occur in the listing text; there is
no paid AI recommendation service. Searches sync to the account rather than localStorage.

The worker uses existing Supabase and Resend credentials. No new paid service is added.
Migration `supabase/search-digests.sql` installs the schema with delivery **disabled**.
Deploy `send-search-digests` and `search-digest-unsubscribe`, then apply
`supabase/search-digests-cron.sql` to enable the existing pg_cron/pg_net infrastructure.
Deploy the web assets so users can opt in. Do not enroll existing users automatically.

## Budget and reliability

- At most 70 provider attempts per UTC day and 2,000 per UTC month for these digests.
- The database reserves budget under a lock, including overlapping worker invocations.
- At most one digest per account per 24 hours, containing at most 20 new matches.
- Extra matches and jobs over budget remain for later; oldest pending jobs go first.
- Availability, moderation, expiry, blocked sellers, verified email and consent are
  checked at claim time immediately before dispatch.
- Only confirmed provider acceptance records listings as delivered. This is not proof
  of inbox delivery; email spam filtering and bounces still apply.
- Provider quota/rate-limit errors postpone a job. A timeout or uncertain acceptance
  holds it as `uncertain`. Check Resend before manually resolving it: provider
  idempotency expires after 24 hours, so blind retries could send duplicates.
- Unsubscribe works without login using a private random token. Page GET does not
  change preferences. Explicit page confirmation or the mail client's one-click POST
  disables all search emails. Message notifications remain unchanged.

Limits cover this feature only. Authentication emails (Supabase SMTP), renewal emails,
and other sending with the same Resend account also consume the provider's allowance.
Keep the Resend account on its Free plan and leave paid overages disabled; application
code cannot control provider billing settings or guarantee free hosting at any scale.
No settings or changes in this implementation purchase or upgrade a service.

## Operations

Inspect aggregate queue counts, not private email payloads:

```sql
select status,count(*) from public.search_digest_jobs group by status;
select * from public.search_digest_settings;
select count(*) from public.search_digest_reservations
 where reserved_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
```

Pause without deleting user searches:

```sql
update public.search_digest_settings set enabled=false where singleton;
```

Raising free-launch ceilings requires a deliberate schema change; settings constraints
prevent accidental increases above 70/2,000. Re-evaluate hosting and provider plans when
revenue and usage justify it. Never put service keys or private unsubscribe tokens in
public analytics/logs. Tests must not send real emails to users.

Validation: `npm run test:search-digests` runs isolated browser and worker fixtures.
`npm run test:search-digests-db` runs the SQL migration and fixtures in a hosted
transaction that rolls back. It persists no test accounts/listings or sent emails.
