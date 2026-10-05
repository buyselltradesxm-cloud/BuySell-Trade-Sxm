# Stripe billing status

Snapshot of the Stripe / Supabase billing check done on 2026-10-05. Every
check was read-only; nothing was changed in Supabase or Stripe.

This repository is public. No secret value is written here, only names,
dates and results. Secret values live in Supabase Edge Function secrets and
in the Stripe dashboard.

## Verdict

The configuration is complete and looks correct, but the Stripe payment path
has **never been proven end to end**: the webhook has not recorded a single
event. Either nobody has paid through Stripe yet, or Stripe's events are not
reaching the function (wrong URL, wrong mode, or a different signing secret).

## Accounts and identifiers

```text
Stripe account:        Korek Digital (marketplace), account tag 51RMcyaQplshpsW9H
Supabase project:      Buy Sell Trade SXM, ref szhaxlmronirhnntlwyb (eu-west-1)
Webhook URL:           https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/stripe-webhook
Live publishable key:  pk_live_51RMcyaQplshpsW9HWxO8OnsWlySoYBVqEsjsb8TnnBX4bDxhQW5euiHO4oqt9r1fLu2pn59JPWGzXw18KjzaLu6E00JMNNfeiQ
```

The publishable key is public by design and is **not used anywhere** in this
project: checkout is created server-side by `create-checkout` and the browser
is redirected to the returned URL, so no page loads Stripe.js. It is recorded
here only because its account tag confirms the right Stripe account.

## Supabase secrets (names and dates only)

| Secret | Last updated (UTC) |
|---|---|
| `STRIPE_SECRET_KEY` | 2026-10-02 11:58 |
| `STRIPE_WEBHOOK_SECRET` | 2026-10-02 11:58 |
| `STRIPE_PRICE_PRO_STARTER` | 2026-10-02 10:42 |
| `STRIPE_PRICE_PRO_BUSINESS` | 2026-10-02 10:42 |
| `STRIPE_PRICE_PRO_PREMIUM` | 2026-10-02 10:42 |
| `STRIPE_PRICE_PRO_ELITE` | 2026-10-02 10:42 |
| `STRIPE_PRICE_PRO_UNLIMITED` | 2026-10-02 10:42 |

The webhook signing secret (`whsec_...`) supplied on 2026-10-05 was compared
by SHA-256 digest with the value stored in Supabase: **identical**, so it did
not need to be set again. That value was pasted in clear into an assistant
conversation; if it belongs to the live endpoint, roll it in Stripe
(Developers > Webhooks > the endpoint > Roll secret) and set the new value
with `supabase secrets set STRIPE_WEBHOOK_SECRET=...` in a real terminal.

Not known: whether `STRIPE_SECRET_KEY` is a live or a test key. Supabase
never shows secret values.

## Checks run

| Check | Result |
|---|---|
| Supabase CLI login and link | Correct project, `ACTIVE_HEALTHY`, linked |
| Edge functions | 11 deployed, all `ACTIVE`; `stripe-webhook` v5 deployed 2026-10-04 21:07 UTC, `create-checkout` v4 deployed 2026-09-29 |
| `stripe-webhook` GET | `405 method not allowed` (expected) |
| `stripe-webhook` unsigned POST | `400 invalid signature` (expected: secrets loaded, fakes rejected; `503` would mean a secret is missing) |
| `create-checkout` POST without login | `401` (expected) |
| `node backend-health-qa.js` | 5 of 6 pass; see below |
| Public site | Up, serves the hardened `supabase-api.js` |
| `payment_webhook_events` | **0 rows, ever** |
| Profiles linked to Stripe | **None** |

### Findings

- `backend-health-qa.js` fails "anon cannot read profiles" because it expects
  an empty `200`. Since hardening v3 the database refuses with `401`
  (`permission denied for table profiles`), which is stricter. The test is out
  of date, not the database.
- Profiles on 2026-10-05: 5 on `personal-free`, 1 on `pro-unlimited` /
  `active` until 2027-03-21. That Pro account has no Stripe customer or
  subscription ID, so it did not come from Stripe (Apple in-app purchase or a
  manual grant; not traced).
- `stripe-webhook` stores an event only after the signature is verified, so
  an empty table cannot tell "Stripe never sent" from "Stripe sent and was
  rejected". The Stripe dashboard's delivery list can.

## What is left to do

1. **Check the mode.** Log in on buyselltradesxm.com, start a Pro upgrade and
   read the Stripe page address: `cs_live_` means live, `cs_test_` means test.
   Close without paying. If it is test, switch with
   `pwsh scripts/stripe-go-live.ps1`, run by hand in a real terminal.
2. **Check Stripe's side.** Developers > Webhooks > the endpoint: the URL must
   be exactly the one above; the delivery list shows whether anything was sent
   and with which response code (`400` = signing secret mismatch).
3. **Prove it.** Buy the cheapest plan with a real card, confirm the profile
   shows Pro and a row appears in `payment_webhook_events`, then cancel from
   Profile > Manage / cancel.

## Re-running the checks

```powershell
npx supabase projects list
npx supabase secrets list --project-ref szhaxlmronirhnntlwyb
npx supabase functions list --project-ref szhaxlmronirhnntlwyb
npx supabase db query --linked "select received_at, event_type, status, error_code from payment_webhook_events order by received_at desc limit 20"
node backend-health-qa.js
```
