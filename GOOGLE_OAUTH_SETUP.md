# Google Login Setup

Google login is configured for the production Supabase project and enabled in the app config.

Current production setup:

```text
Google Cloud account: korekdigitalmarketing@gmail.com
Supabase account/organization: buyselltradesxm-cloud's Org
Supabase project ref: szhaxlmronirhnntlwyb
Website origin: https://buyselltradesxm.com
Supabase OAuth callback: https://szhaxlmronirhnntlwyb.supabase.co/auth/v1/callback
```

Do not store the Google OAuth client secret in this repository.

## Recreate Or Rotate Credentials

Use this only if the OAuth client is deleted, rotated, or moved to another Google Cloud project.

## Google Cloud

Open Google Cloud:

```text
https://console.cloud.google.com/apis/credentials
```

Create an OAuth client:

```text
Application type: Web application
Name: Buy Sell Trade SXM Web
```

Use these exact URLs:

```text
Authorized JavaScript origins:
https://buyselltradesxm.com
```

```text
Authorized redirect URIs:
https://szhaxlmronirhnntlwyb.supabase.co/auth/v1/callback
```

Copy the generated:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

## Supabase

Create a Supabase access token from an Owner account in the `buyselltradesxm-cloud` organization that owns project:

```text
szhaxlmronirhnntlwyb
```

The token needs auth config write permissions.

Then run:

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
npm run supabase:enable-google-auth
```

The command updates Supabase Auth and changes `google: false` to `google: true` in `supabase-config.js`.

If Google is already enabled manually in Supabase and you only need the website button enabled locally, run:

```powershell
$env:GOOGLE_CLIENT_ID="already-enabled"
npm run supabase:enable-google-auth-local
```
