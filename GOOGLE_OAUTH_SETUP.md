# Google Login Setup

This project is ready for Google login, but Google and Supabase both need OAuth settings before the button can work.

## Google Cloud

Open:

```text
https://console.cloud.google.com/apis/credentials?project=project-adc2412a-82f5-406e-b1b&authuser=3
```

Create an OAuth client:

```text
Application type: Web application
Name: Buy Sell Trade SXM
```

Use these exact URLs:

```text
Authorized JavaScript origins:
https://buyselltradesxm.com
```

```text
Authorized redirect URIs:
https://ujykgiitlcuqiiepsyiz.supabase.co/auth/v1/callback
```

Copy the generated:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

## Supabase

Create a Supabase access token from the account that owns project:

```text
ujykgiitlcuqiiepsyiz
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
