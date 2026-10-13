# Configure only the Pro Starter live Stripe price for the marketplace.
# This intentionally leaves all other plan prices and the existing webhook untouched.
# Run from any directory with:
#   pwsh "C:\Users\PC\Desktop\Buy Sell Trade Sxm\scripts\stripe-starter-go-live.ps1"

$ErrorActionPreference = "Stop"
$ProjectRef = "szhaxlmronirhnntlwyb"
$ExpectedAccountId = "acct_1RMcyaQplshpsW9H"
$AccountTag = "51RMcyaQplshpsW9H"
$StarterPriceId = "price_1UPpawQplshpsW9HUONiLLkJ"
$StripeApi = "https://api.stripe.com/v1"

$key = Read-Host "Stripe LIVE secret key (hidden; do not paste it into chat)" -AsSecureString
$plain = ConvertFrom-SecureString $key -AsPlainText
if ($plain -notmatch "^(sk|rk)_live_$AccountTag") {
  throw "This is not a live secret key for the expected Stripe account. Nothing was changed."
}

function StripeGet($Path) {
  Invoke-RestMethod -Method Get -Uri "$StripeApi/$Path" -Authentication Bearer -Token $key
}

$account = StripeGet "account"
if ($account.id -ne $ExpectedAccountId) {
  throw "The key resolves to Stripe account $($account.id), not the expected account. Nothing was changed."
}
# Stripe's Account object has no livemode property. Verify live mode on the
# Price object below, which does expose livemode.
$price = StripeGet "prices/$StarterPriceId"
if (-not $price.active -or -not $price.livemode -or $price.currency -ne "usd" -or
    $price.unit_amount -ne 2499 -or $price.recurring.interval -ne "month" -or
    $price.recurring.interval_count -ne 1) {
  throw "The configured Starter price is not active at 24.99 USD per month in live mode. Nothing was changed."
}
$product = StripeGet "products/$($price.product)"
if (-not $product.active -or $product.name -ne "Buy Sell Trade SXM - Pro Starter") {
  throw "The price does not belong to the active Pro Starter product. Nothing was changed."
}

Write-Host "Verified: $($product.name), 24.99 USD/month, live account $ExpectedAccountId."
if ((Read-Host "Type STARTER to update only the live key and Starter price in Supabase") -cne "STARTER") {
  Write-Host "Cancelled. Nothing was changed."
  return
}

$envFile = Join-Path ([IO.Path]::GetTempPath()) ("stripe-starter-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  New-Item -ItemType File -Path $envFile | Out-Null
  if ($IsWindows) {
    icacls $envFile /inheritance:r /grant:r "$([Security.Principal.WindowsIdentity]::GetCurrent().Name):F" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not restrict the temporary secrets file." }
  } else { chmod 600 $envFile }
  @("STRIPE_SECRET_KEY=$plain", "STRIPE_PRICE_PRO_STARTER=$StarterPriceId") | Set-Content -Path $envFile -Encoding utf8NoBOM
  npx -y supabase secrets set --env-file $envFile --project-ref $ProjectRef | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Supabase did not confirm the secret update." }
  Write-Host "Done. Updated the live Stripe key and Pro Starter price. Other plans and the webhook were left unchanged."
} finally {
  Remove-Item $envFile -Force -ErrorAction SilentlyContinue
  $plain = $null
  $key = $null
}
