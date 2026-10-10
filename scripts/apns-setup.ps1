# Turns on iPhone push notifications on the server side.
#
# Run it yourself, in PowerShell 7, after downloading the Apple push key
# (developer.apple.com > Certificates, IDs & Profiles > Keys > "+" > tick
# "Apple Push Notifications service (APNs)" > Download):
#
#   pwsh scripts/apns-setup.ps1
#
# It finds the newest AuthKey_XXXXXXXXXX.p8 in your Downloads folder, then:
#   1. stores the key, its id and the team id as Supabase secrets,
#   2. deploys the send-push function, which delivers to iPhones through Apple.
# The key is never printed and never put on a command line.
#
# Pass -KeyFile to use a key stored somewhere else.
param(
  [string]$KeyFile,
  [string]$TeamId = "CJ7X9S5JDT",
  [string]$ProjectRef = "szhaxlmronirhnntlwyb"
)
$ErrorActionPreference = "Stop"

if (-not $KeyFile) {
  $found = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "AuthKey_*.p8" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($found) { $KeyFile = $found.FullName }
}
if (-not $KeyFile -or -not (Test-Path -LiteralPath $KeyFile)) {
  throw "No AuthKey_*.p8 file found in Downloads. Download the push key from developer.apple.com first, or pass -KeyFile."
}
$keyId = [regex]::Match((Split-Path $KeyFile -Leaf), '^AuthKey_([A-Z0-9]{10})\.p8$').Groups[1].Value
if (-not $keyId) { throw "The file name must look like AuthKey_ABC123DEFG.p8 (Apple's own name): the key id is read from it." }
$pem = (Get-Content -LiteralPath $KeyFile -Raw).Trim()
if ($pem -notmatch 'BEGIN PRIVATE KEY') { throw "$KeyFile does not look like an Apple .p8 key." }

Write-Host "Key id $keyId, team $TeamId, project $ProjectRef"

# --- 1. Secrets, through a file only this account can read ------------------
$envFile = Join-Path ([IO.Path]::GetTempPath()) ("apns-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  New-Item -ItemType File -Path $envFile | Out-Null
  if ($IsWindows) {
    icacls $envFile /inheritance:r /grant:r "$([Security.Principal.WindowsIdentity]::GetCurrent().Name):F" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "could not restrict the temporary secrets file" }
  } else { chmod 600 $envFile }
  # One line, with \n between the PEM lines; send-push accepts both forms.
  $oneLine = ($pem -split "`r?`n") -join '\n'
  @("APNS_KEY_ID=$keyId", "APNS_TEAM_ID=$TeamId", "APNS_PRIVATE_KEY=`"$oneLine`"") |
    Set-Content -Path $envFile -Encoding utf8NoBOM
  npx -y supabase secrets set --env-file $envFile --project-ref $ProjectRef | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set failed. Is the Supabase CLI signed in to the right account? (npx supabase projects list)" }
} finally {
  if (Test-Path $envFile) { Remove-Item $envFile -Force }
}
Write-Host "Secrets saved."

# --- 2. The sender ----------------------------------------------------------
npx -y supabase functions deploy send-push --no-verify-jwt --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw "The secrets are saved, but send-push was not deployed. Run again once the CLI can deploy functions." }

Write-Host ""
Write-Host "Done. iPhone push is ready on the server. It starts working for people who"
Write-Host "turn notifications on in a build of the app that includes push."
