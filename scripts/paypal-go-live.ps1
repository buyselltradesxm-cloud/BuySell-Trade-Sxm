# Create PayPal monthly USD plans, subscribe the live webhook, set Supabase
# secrets using a short-lived temp file, then deploy the PayPal Edge Functions.
# Run this after applying supabase/paypal-billing.sql in Supabase SQL Editor.
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot
$ProjectRef = 'szhaxlmronirhnntlwyb'
$Api = 'https://api-m.paypal.com'
$WebhookUrl = "https://$ProjectRef.supabase.co/functions/v1/paypal-webhook"
$Plans = @(
  @{ key='PAYPAL_PLAN_PRO_STARTER'; name='Pro Starter'; price='24.99' },
  @{ key='PAYPAL_PLAN_PRO_BUSINESS'; name='Pro Business'; price='59.00' },
  @{ key='PAYPAL_PLAN_PRO_PREMIUM'; name='Pro Premium'; price='99.00' },
  @{ key='PAYPAL_PLAN_PRO_ELITE'; name='Pro Elite'; price='149.00' },
  @{ key='PAYPAL_PLAN_PRO_UNLIMITED'; name='Pro Unlimited'; price='199.00' }
)

# Fail before contacting PayPal if this script is run from a checkout that does
# not contain the Edge Function sources it will deploy.
foreach ($functionName in @('create-paypal-subscription', 'paypal-webhook', 'cancel-paypal-subscription')) {
  $entrypoint = Join-Path $RepoRoot "supabase/functions/$functionName/index.ts"
  if (-not (Test-Path -LiteralPath $entrypoint -PathType Leaf)) {
    throw "Missing Edge Function source: $entrypoint"
  }
}

function Invoke-PayPalApi([string]$Method, [string]$Path, $Body = $null, [string]$Token) {
  $headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
  if ($Body -ne $null) {
    $headers['Content-Type'] = 'application/json'
    $headers['PayPal-Request-Id'] = [guid]::NewGuid().ToString()
    return Invoke-RestMethod -Method $Method -Uri "$Api$Path" -Headers $headers -Body ($Body | ConvertTo-Json -Depth 15 -Compress)
  }
  return Invoke-RestMethod -Method $Method -Uri "$Api$Path" -Headers $headers
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { throw 'Supabase CLI is required. Install it, log in, then rerun this script.' }
$clientId = (Read-Host 'PayPal Live Client ID').Trim()
$secretSecure = Read-Host 'PayPal Live Secret (hidden; do not paste it into chat)' -AsSecureString
$secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
try { $clientSecret = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)).Trim() }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr) }
if (-not $clientId -or -not $clientSecret) { throw 'Both PayPal Live credentials are required.' }

$basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${clientId}:${clientSecret}"))
try {
  $tokenResponse = Invoke-RestMethod -Method Post -Uri "$Api/v1/oauth2/token" -Headers @{ Authorization="Basic $basic"; 'Content-Type'='application/x-www-form-urlencoded'; Accept='application/json' } -Body 'grant_type=client_credentials'
} catch {
  $errorText = [string]$_.ErrorDetails.Message
  if ($errorText -match 'invalid_client') {
    throw 'PayPal refused the credentials (invalid_client). Copy the Live Client ID and Secret key 1 from the same PayPal app, "Buy Sell Trade SXM Web". Do not use Sandbox credentials, account login password, or credentials from another app. No plans or webhooks were changed.'
  }
  throw "PayPal OAuth failed before any plans or webhooks were changed. $($_.Exception.Message)"
}
$token = $tokenResponse.access_token
if (-not $token) { throw 'PayPal did not return an access token.' }

# Reuse the dedicated product on a safe rerun; never alter unrelated catalog items.
$productList = Invoke-PayPalApi GET '/v1/catalogs/products?page_size=20&page=1' $null $token
$product = @($productList.products) | Where-Object { $_.name -eq 'Buy Sell Trade SXM Pro Subscription' } | Select-Object -First 1
if (-not $product) {
  $product = Invoke-PayPalApi POST '/v1/catalogs/products' @{ name='Buy Sell Trade SXM Pro Subscription'; description='Monthly Pro subscriptions for Buy Sell Trade SXM'; type='SERVICE'; category='SOFTWARE' } $token
}
if (-not $product.id) { throw 'Could not create or find the PayPal Pro product.' }

$planSecrets = @()
$planList = Invoke-PayPalApi GET "/v1/billing/plans?product_id=$($product.id)&page_size=20&page=1" $null $token
foreach ($plan in $Plans) {
  $existing = @($planList.plans) | Where-Object { $_.name -eq $plan.name -and $_.status -eq 'ACTIVE' } | Select-Object -First 1
  if ($existing) {
    $currentAmount = [string]$existing.billing_cycles[0].pricing_scheme.fixed_price.value
    $currentCurrency = [string]$existing.billing_cycles[0].pricing_scheme.fixed_price.currency_code
    if ($currentAmount -ne $plan.price -or $currentCurrency -ne 'USD') { throw "Existing active plan '$($plan.name)' has a different price. Nothing was changed to that plan." }
    $planId = $existing.id
  } else {
    $created = Invoke-PayPalApi POST '/v1/billing/plans' @{
      product_id=$product.id; name=$plan.name; description="$($plan.name) monthly subscription";
      billing_cycles=@(@{ frequency=@{ interval_unit='MONTH'; interval_count=1 }; tenure_type='REGULAR'; sequence=1; total_cycles=0; pricing_scheme=@{ fixed_price=@{ value=$plan.price; currency_code='USD' } } });
      payment_preferences=@{ auto_bill_outstanding=$true; payment_failure_threshold=1 }
    } $token
    if (-not $created.id) { throw "PayPal failed to create plan '$($plan.name)'." }
    $planId = $created.id
    if ($created.status -ne 'ACTIVE') { [void](Invoke-PayPalApi POST "/v1/billing/plans/$planId/activate" @{} $token) }
  }
  $planSecrets += "$($plan.key)=$planId"
  Write-Host ("  {0,-28} {1} USD/month" -f $plan.name, $plan.price)
}

# Configure only this app's dedicated webhook URL. If it already exists, reuse
# it rather than creating duplicate notifications or disturbing other endpoints.
$webhooks = Invoke-PayPalApi GET '/v1/notifications/webhooks?page_size=20&page=1' $null $token
$hook = @($webhooks.webhooks) | Where-Object { $_.url -eq $WebhookUrl } | Select-Object -First 1
if (-not $hook) {
  $events = @(
    'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED',
    'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    'PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'
  ) | ForEach-Object { @{ name=$_ } }
  $hook = Invoke-PayPalApi POST '/v1/notifications/webhooks' @{ url=$WebhookUrl; event_types=$events } $token
}
if (-not $hook.id) { throw 'Could not create or find the PayPal webhook.' }
Write-Host "  Webhook configured: $WebhookUrl"

$tempEnv = Join-Path ([IO.Path]::GetTempPath()) ("paypal-live-" + [guid]::NewGuid().ToString('N') + '.env')
try {
  $envLines = @("PAYPAL_CLIENT_ID=$clientId", "PAYPAL_CLIENT_SECRET=$clientSecret", "PAYPAL_WEBHOOK_ID=$($hook.id)") + @($planSecrets)
  $envLines | Set-Content -LiteralPath $tempEnv -Encoding utf8NoBOM
  supabase secrets set --project-ref $ProjectRef --env-file $tempEnv
  if ($LASTEXITCODE -ne 0) { throw 'Supabase secret upload failed. PayPal plans/webhook exist, but application secrets were not confirmed.' }
  supabase functions deploy create-paypal-subscription --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw 'Deploying create-paypal-subscription failed.' }
  supabase functions deploy paypal-webhook --project-ref $ProjectRef --no-verify-jwt
  if ($LASTEXITCODE -ne 0) { throw 'Deploying paypal-webhook failed.' }
  supabase functions deploy cancel-paypal-subscription --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw 'Deploying cancel-paypal-subscription failed.' }
  Write-Host 'PayPal Live configuration and functions are deployed.'
} finally {
  Remove-Item -LiteralPath $tempEnv -Force -ErrorAction SilentlyContinue
  $clientSecret = $null; $basic = $null; $token = $null
}
