# Switches the marketplace's Stripe billing from TEST to LIVE in one go.
#
# Run it yourself in a real PowerShell 7 terminal (never through an assistant):
#   pwsh scripts/stripe-go-live.ps1
#
# It asks for the LIVE secret key with hidden input, then:
#   1. checks the key belongs to the Korek Digital marketplace account,
#   2. finds the five live monthly Pro prices by amount,
#   3. replaces the webhook endpoint (a new one = a new signing secret),
#   4. writes all seven secrets to Supabase together,
#   5. removes the old webhook endpoint(s).
# Nothing secret is printed, and nothing is changed before step 3.

$ErrorActionPreference = "Stop"

$ProjectRef  = "szhaxlmronirhnntlwyb"
$AccountTag  = "51RMcyaQplshpsW9H"   # Korek Digital (marketplace) — not the other Stripe accounts
$WebhookUrl  = "https://$ProjectRef.supabase.co/functions/v1/stripe-webhook"
$StripeApi   = "https://api.stripe.com/v1"
$DefaultEvents = @(
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted"
)
# Monthly USD amount in cents -> Supabase secret name. Keep in step with
# ACCOUNT_PLANS in the app and account_listing_limit() in the database.
$SecretByAmount = [ordered]@{
  2900  = "STRIPE_PRICE_PRO_STARTER"
  5900  = "STRIPE_PRICE_PRO_BUSINESS"
  9900  = "STRIPE_PRICE_PRO_PREMIUM"
  14900 = "STRIPE_PRICE_PRO_ELITE"
  19900 = "STRIPE_PRICE_PRO_UNLIMITED"
}

$key = Read-Host "Stripe LIVE secret key (sk_live_... or rk_live_..., input hidden)" -AsSecureString
$plain = ConvertFrom-SecureString $key -AsPlainText
if ($plain -notmatch '^(sk|rk)_live_') { throw "That is not a live secret key (a pk_ key or a test key cannot be used here)." }
if ($plain -notmatch "^(sk|rk)_live_$AccountTag") { throw "This key belongs to a different Stripe account. Nothing was changed." }

function Stripe($Method, $Path, $Body) {
  Invoke-RestMethod -Method $Method -Uri "$StripeApi/$Path" -Authentication Bearer -Token $key -Body $Body
}

# --- 1+2. Read-only: prices -------------------------------------------------
$prices = (Stripe Get "prices?active=true&type=recurring&limit=100").data |
  Where-Object { $_.livemode -and $_.currency -eq "usd" -and $_.recurring.interval -eq "month" -and $_.recurring.interval_count -eq 1 }
$secrets = [ordered]@{}
foreach ($amount in $SecretByAmount.Keys) {
  $match = @($prices | Where-Object { $_.unit_amount -eq $amount })
  if ($match.Count -ne 1) { throw "Expected exactly one active live monthly USD price of $($amount / 100) USD, found $($match.Count). Nothing was changed." }
  $secrets[$SecretByAmount[$amount]] = $match[0].id
  Write-Host ("  {0,-28} {1}" -f $SecretByAmount[$amount], $match[0].id)
}

$old = @((Stripe Get "webhook_endpoints?limit=100").data | Where-Object { $_.url -like "*.supabase.co/functions/v1/stripe-webhook" })   # also catches a mistyped project ref
foreach ($endpoint in $old) { Write-Host "  existing endpoint: $($endpoint.url)$(if ($endpoint.url -ne $WebhookUrl) { '   <-- WRONG URL, never reached this project' })" }
# Keep whatever the current endpoint listens to, and make sure the events the
# webhook needs (Pro subscriptions and one-time boost payments) are all there.
$events = @(@($old | ForEach-Object { $_.enabled_events }) + $DefaultEvents | Where-Object { $_ -and $_ -ne "*" } | Select-Object -Unique)
if ($old | Where-Object { $_.enabled_events -contains "*" }) { $events = @("*") }
Write-Host "Webhook: $($old.Count) existing endpoint(s) will be replaced; events: $($events -join ', ')"
if ((Read-Host "Type LIVE to switch production billing to live mode") -cne "LIVE") { Write-Host "Cancelled. Nothing was changed."; return }

# --- 3. New webhook endpoint (its signing secret is only returned here) -----
$body = @{ url = $WebhookUrl; description = "Buy Sell Trade SXM - Supabase stripe-webhook" }
for ($i = 0; $i -lt $events.Count; $i++) { $body["enabled_events[$i]"] = $events[$i] }
$created = Stripe Post "webhook_endpoints" $body
$secrets["STRIPE_SECRET_KEY"] = $plain
$secrets["STRIPE_WEBHOOK_SECRET"] = $created.secret

# --- 4. All seven Supabase secrets in one call ------------------------------
$envFile = Join-Path ([IO.Path]::GetTempPath()) ("stripe-live-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  # Create the file empty and make it owner-only before any secret goes in.
  New-Item -ItemType File -Path $envFile | Out-Null
  if ($IsWindows) {
    icacls $envFile /inheritance:r /grant:r "$([Security.Principal.WindowsIdentity]::GetCurrent().Name):F" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "could not restrict the temporary secrets file" }
  } else { chmod 600 $envFile }
  ($secrets.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) | Set-Content -Path $envFile -Encoding utf8NoBOM
  npx -y supabase secrets set --env-file $envFile --project-ref $ProjectRef | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set failed" }
} catch {
  # Leave the old endpoint in place and drop the new one: back to the state before.
  Stripe Delete "webhook_endpoints/$($created.id)" | Out-Null
  throw "Supabase secrets were NOT updated ($($_.Exception.Message)). The new webhook endpoint was removed; billing is unchanged."
} finally {
  Remove-Item $envFile -Force -ErrorAction SilentlyContinue
}

# --- 5. Retire the old endpoint(s) and their signing secret -----------------
foreach ($endpoint in $old) { Stripe Delete "webhook_endpoints/$($endpoint.id)" | Out-Null }

Write-Host "Done. Stripe is LIVE: secret key, 5 price IDs and webhook secret are set; $($old.Count) old endpoint(s) removed."
Write-Host "Next: buy the cheapest plan with a real card, check the profile shows Pro, then cancel from Profile > Manage / cancel."
