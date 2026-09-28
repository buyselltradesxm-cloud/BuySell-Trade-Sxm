# Security deployment checklist

The code changes in this repository are not active until the SQL migration,
Edge Functions, hosting configuration, and provider settings below are applied.
Do these steps in order and verify them in production before announcing a
security feature.

## 1. Database and privileged access

Run the migration once as the database owner:

```powershell
supabase db query --linked --file supabase/security-hardening-v2.sql
```

Before doing so, create a second, MFA-protected Supabase owner/admin account.
The migration deliberately stops automatic admin assignment based on an email
address. Grant the intended initial admin explicitly in the SQL editor, then
remove any compromised or obsolete admin role. Keep the list of database
admins short and review it quarterly.

The migration also removes dangerous *future default* table grants. Every new
table must have RLS enabled, deliberate policies, and deliberate grants before
it is exposed through the Data API.

## 2. Password reset and sessions

Deploy the reset endpoint after the SQL migration:

```powershell
supabase functions deploy request-password-reset
```

The app sends only a generic answer, caps resets at 3 per email hash per hour
and 10 per IP hash per hour, and records no raw email/IP/token in security
events. `supabase/config.toml` now sets 15-minute email OTP/recovery expiry,
60-second provider mail throttling, and secure password change.

In Supabase Dashboard, also enable CAPTCHA/Turnstile for Auth and set Auth
rate limits for sign-in, sign-up, and token refresh. Those settings are not
safe to emulate in browser JavaScript, and direct Auth API calls would bypass
any client-only lockout. Use the provider's login rate limits and CAPTCHA for
failed-login abuse instead of an unreliable local account lockout.

This browser app uses Supabase bearer tokens rather than application cookies.
That makes classic cookie-CSRF attacks inapplicable. Edge Functions enforce a
strict origin allow-list and bearer authentication where needed. If the app is
later moved to server-managed cookies, set `HttpOnly; Secure; SameSite=Lax` or
`Strict` server-side and add a server-validated CSRF token; JavaScript cannot
set an HttpOnly cookie.

## 3. Stripe: no client-authoritative billing

Set these Edge Function secrets; do not put any of them in browser files or
GitHub Actions logs:

```powershell
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
supabase secrets set STRIPE_PRICE_PRO_STARTER=price_...
supabase secrets set STRIPE_PRICE_PRO_BUSINESS=price_...
supabase secrets set STRIPE_PRICE_PRO_PREMIUM=price_...
supabase secrets set STRIPE_PRICE_PRO_ELITE=price_...
supabase secrets set STRIPE_PRICE_PRO_UNLIMITED=price_...
supabase secrets set SITE_URL=https://buyselltradesxm.com
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

Create the Stripe webhook endpoint at:

```text
https://szhaxlmronirhnntlwyb.supabase.co/functions/v1/stripe-webhook
```

Subscribe at least to `checkout.session.completed`,
`customer.subscription.updated`, and `customer.subscription.deleted`.
The webhook verifies Stripe's timestamped signature, rejects payloads larger
than 1 MB, deduplicates event IDs, fetches the subscription from Stripe, maps
only server-held Price IDs to plans, and then updates billing state. The
browser never supplies a price, subscription status, or entitlement.

## 4. Hosting headers, HSTS, CSP, CORS, and directory listings

GitHub Pages currently supplies basic HSTS but cannot be configured here with
the full response-header policy. Put the custom domain behind Cloudflare (or
an equivalent edge) and set these response headers there:

```text
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://*.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://adservice.google.com https://*.adtrafficquality.google https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googlesyndication.com https://*.g.doubleclick.net https://*.adtrafficquality.google https://www.google.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://www.google.com; frame-ancestors 'none'; upgrade-insecure-requests
```

Only enable HSTS preload after every present and planned subdomain supports
valid HTTPS. Disable directory indexing at the hosting/CDN origin; GitHub
Pages itself does not expose directory listings. The Edge Functions use an
explicit CORS allow-list and no wildcard credential policy.

## 5. Operations

- Enable Supabase daily backups/PITR and test one restore.
- Enable Supabase, Stripe, GitHub, DNS/hosting, and Resend billing/spend
  alerts; route them to at least two MFA-protected administrators.
- Send `security_events` to your monitored log platform with retention and
  alerting for reset rate limits, webhook verification failures, role changes,
  and admin actions. Never log passwords, tokens, card data, request bodies,
  or raw IP/email addresses.
- Keep AI credentials server-side. This app currently has no AI endpoint, so
  there is no AI quota to enforce. Before adding one, make it an authenticated
  Edge Function, use `consume_security_rate_limit` (or a dedicated per-user
  quota table) before calling the AI provider, and cap request body/tokens.
- Run `npm audit` in CI and deploy only a commit whose public asset hashes
  match the reviewed commit.
