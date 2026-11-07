# One-time setup of Android push notifications (Firebase). Run in PowerShell from the project folder:
#     pwsh scripts/setup-android-push.ps1
# It takes the two files Firebase downloaded into Downloads:
#   google-services.json                      -> GitHub secret FIREBASE_GOOGLE_SERVICES_JSON_BASE64 (used by the Android build)
#   buy-sell-trade-sxm-firebase-adminsdk-*.json -> Supabase secret FCM_SERVICE_ACCOUNT_JSON (used by send-push), then redeploys send-push
# Neither file is printed. Delete the adminsdk key file from Downloads afterwards.
param([string]$GoogleServices = "", [string]$KeyFile = "")
$ErrorActionPreference = "Stop"
$downloads = Join-Path $env:USERPROFILE "Downloads"
$repo = "buyselltradesxm-cloud/BuySell-Trade-Sxm"
$package = "com.korekdigitalmarketing.buyselltradesxm"
$project = "buy-sell-trade-sxm"

function Newest($filter) {
  Get-ChildItem -Path $downloads -Filter $filter -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

# 1. Firebase client config for the Android build.
if (-not $GoogleServices) { $f = Newest "google-services*.json"; if ($f) { $GoogleServices = $f.FullName } }
if (-not $GoogleServices) { throw "google-services.json not found in $downloads (Firebase > Add app > Android > Download google-services.json)." }
node scripts/check-google-services.js $GoogleServices $package
if ($LASTEXITCODE -ne 0) { throw "google-services.json does not match $package." }
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($GoogleServices))
$b64 | gh secret set FIREBASE_GOOGLE_SERVICES_JSON_BASE64 --repo $repo
if ($LASTEXITCODE -ne 0) { throw "Could not set the GitHub secret (is gh logged in?)." }
Write-Host "1/2 GitHub secret FIREBASE_GOOGLE_SERVICES_JSON_BASE64 set."

# 2. Sending key for the server.
if (-not $KeyFile) { $k = Newest "*firebase-adminsdk*.json"; if ($k) { $KeyFile = $k.FullName } }
if (-not $KeyFile) { throw "No *firebase-adminsdk*.json in $downloads (Firebase > Project settings > Service accounts > Generate new private key)." }
$json = Get-Content -Raw -Path $KeyFile | ConvertFrom-Json
if ($json.type -ne "service_account" -or -not $json.private_key -or -not $json.client_email) { throw "The adminsdk file is not a service account key." }
if ($json.project_id -ne $project) { throw "Key belongs to project '$($json.project_id)', expected '$project'." }
$compact = $json | ConvertTo-Json -Compress -Depth 5
$envFile = Join-Path $env:TEMP ("fcm-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  # Single quotes in the env file keep the JSON literal; the file is deleted right after.
  Set-Content -Path $envFile -Value ("FCM_SERVICE_ACCOUNT_JSON='" + $compact + "'") -NoNewline -Encoding utf8
  npx -y supabase secrets set --env-file $envFile
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set failed" }
} finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $envFile
}
npx -y supabase functions deploy send-push --no-verify-jwt
if ($LASTEXITCODE -ne 0) { throw "send-push deploy failed" }
Write-Host "2/2 Supabase secret FCM_SERVICE_ACCOUNT_JSON set and send-push redeployed."
Write-Host "Done. You can now delete this key file from Downloads: $KeyFile"
