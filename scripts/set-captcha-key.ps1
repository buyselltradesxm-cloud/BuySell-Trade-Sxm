# Stores the Cloudflare Turnstile secret key as the signup function's secret,
# taking it from the clipboard so it never has to be typed or pasted into a
# command line (three attempts failed that way: stray brackets, a missing "=",
# the public site key pasted instead of the secret one).
#
# Run it yourself, after copying the key on the Cloudflare page:
#   pwsh scripts/set-captcha-key.ps1
#
# The key is never printed. The same key must also be saved in
# Supabase > Authentication > Attack Protection > Captcha secret, which only
# the dashboard can change.
param(
  [string]$TestValue,   # checks only: use this instead of the clipboard
  [switch]$DryRun       # checks only: stop before anything is sent
)

$ErrorActionPreference = "Stop"
$ProjectRef = "szhaxlmronirhnntlwyb"
$SiteKey    = "0x4AAAAAAFMae7Jlebc0gmUY"   # public, in captcha.js

$key = if ($PSBoundParameters.ContainsKey("TestValue")) { $TestValue } else { Get-Clipboard -Raw }
$key = "$key".Trim()

if (-not $key) {
  Write-Host "Rien n'est copie. Sur la page Cloudflare : Show, triple-clic sur la cle, Ctrl+C. Puis relancez."
  exit 1
}
if ($key -eq $SiteKey) {
  Write-Host "C'est la 'Site key' (la cle publique) qui est copiee. Il faut celle de la ligne du dessous : 'Secret key'."
  exit 1
}
if ($key -notmatch '^0x4[A-Za-z0-9_-]{28,44}$') {
  Write-Host "Ce qui est copie ne ressemble pas a la cle secrete ($($key.Length) caracteres). Elle commence par 0x4 et fait environ 35 caracteres, sans espace."
  exit 1
}

$sha = [Security.Cryptography.SHA256]::Create()
$digest = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key)) | ForEach-Object { $_.ToString("x2") })
Write-Host "Cle lue : $($key.Length) caracteres, forme correcte."
if ($DryRun) { Write-Host "Essai a blanc : rien n'a ete envoye."; exit 0 }

$envFile = Join-Path ([IO.Path]::GetTempPath()) ("captcha-" + [guid]::NewGuid().ToString("N") + ".env")
try {
  # Create the file empty and make it owner-only before the key goes in.
  New-Item -ItemType File -Path $envFile | Out-Null
  icacls $envFile /inheritance:r /grant:r "$([Security.Principal.WindowsIdentity]::GetCurrent().Name):F" | Out-Null
  [IO.File]::WriteAllText($envFile, "TURNSTILE_SECRET_KEY=$key`n", (New-Object Text.UTF8Encoding $false))
  npx -y supabase secrets set --env-file $envFile --project-ref $ProjectRef | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set a echoue" }
} finally {
  Remove-Item $envFile -Force -ErrorAction SilentlyContinue
}

# Supabase lists each secret by its SHA-256, so the stored value can be
# compared with the one just sent without reading it back.
$listed = npx -y supabase secrets list --project-ref $ProjectRef -o json | Out-String | ConvertFrom-Json
if ($listed -isnot [array]) { $listed = $listed.secrets }   # older CLIs wrap the list
$stored = (@($listed) | Where-Object { $_.name -eq "TURNSTILE_SECRET_KEY" }).value
Set-Clipboard -Value " "   # the key does not stay in the clipboard

if ($stored -eq $digest) {
  Write-Host "OK : la cle est enregistree pour l'inscription (verifiee). Le presse-papiers a ete vide."
} else {
  Write-Host "La cle a ete envoyee, mais la verification n'a pas pu la confirmer. Dites-le a l'assistant."
  exit 1
}
