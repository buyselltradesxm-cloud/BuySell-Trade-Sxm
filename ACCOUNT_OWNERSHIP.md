# Account and production ownership

Verified on 2026-10-05.

## GitHub

```text
Repository: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm
Owner: buyselltradesxm-cloud
Default branch: main
Visibility: public
Remote: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm.git
```

The local checkout uses the destination repository as both its fetch and push
remote. The latest verified commit is on `main`:

```text
91acc2d Finalize destination account and production setup docs
```

The commit author is `buyselltradesxm@gmail.com`. GitHub ownership is attached
to the `buyselltradesxm-cloud` account; GitHub usernames and email addresses
are separate account attributes.

## Supabase

```text
Organization: buyselltradesxm-cloud's Org
Organization id: mykgcmefitqivyamutzg
Project: Buy Sell Trade SXM
Project ref: szhaxlmronirhnntlwyb
Project URL: https://szhaxlmronirhnntlwyb.supabase.co
Region: eu-west-1
Plan: Free
Owner account: buyselltradesxm@gmail.com
Dashboard: https://supabase.com/dashboard/project/szhaxlmronirhnntlwyb
```

The project was verified as `ACTIVE_HEALTHY` and linked to this checkout. The
live website loads the Supabase configuration and API bridge, and a read-only
request using the deployed publishable key returned HTTP 200 from the
`listings` API with 41 rows at verification time.

## Legacy account and project

The old Supabase organization and its paused project were removed in the
account cleanup after confirming they were separate from production. The old
account is not needed for this application. Keep the production project above;
do not use the old project reference in any deployment or local configuration.

## Security and secrets

This file intentionally contains no Supabase access tokens, service-role keys,
database passwords, OAuth secrets, Stripe secrets, SMTP keys, or GitHub
credentials. Keep those values in Supabase/GitHub secret storage and outside
the public repository.

