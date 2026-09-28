# Supabase Project

The real production Supabase account for Buy Sell Trade SXM is now the `tchalaplus` / `tchalaplus1` account.

Current project:

```text
Organization: tchalaplus1's Org
Organization id: wyuaphqrdonzkaylkxpa
Project name: Buy Sell Trade SXM
Project ref: szhaxlmronirhnntlwyb
Project URL: https://szhaxlmronirhnntlwyb.supabase.co
Region: eu-west-1
Dashboard: https://supabase.com/dashboard/project/szhaxlmronirhnntlwyb
```

The same organization also holds an older project named `buyselltradesxm`
(ref `npjkbhkmyfppmosforls`, eu-central-1). It is not used by the app.

## Supabase CLI login

The CLI keeps one login per machine. Logging in for another project (for
example `mijahhair`) replaces this one, and every `db query --linked` or
`functions deploy` then fails with a 403. Check before any database or deploy
work:

```powershell
npx supabase projects list   # must list szhaxlmronirhnntlwyb with "linked": true
```

If it is missing, log in as the tchalaplus1 account in a real terminal (the
login needs an interactive TTY):

```powershell
npx supabase logout
npx supabase login
npx supabase link --project-ref szhaxlmronirhnntlwyb
```

Never commit the CLI access token (`sbp_...`) or any `supabase secrets` value.
This repository is public; the token grants full control of every project in
the account. The CLI stores it outside the repo, and `supabase/.temp/` is
ignored.

Do not use the old Supabase account or old project refs for this app.

Frontend files must use:

```text
SUPABASE_URL=https://szhaxlmronirhnntlwyb.supabase.co
```

The public publishable key is stored in `supabase-config.js`. Never put the Supabase `service_role` key in frontend files.
