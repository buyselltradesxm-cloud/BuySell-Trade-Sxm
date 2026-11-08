# One-time setup of the bilingual search keywords (listing-keywords Edge Function).
# Run in PowerShell from any folder:   pwsh scripts/setup-listing-keywords.ps1
# 0. applies supabase/listing-search-keywords.sql (column + triggers; idempotent);
# 1. asks for the Anthropic API key (hidden input), stores it as the Supabase secret ANTHROPIC_API_KEY
#    through a temporary file that is deleted right away (the key is never printed or put on a command line);
# 2. deploys the listing-keywords function;
# 3. asks keywords for every listing that has none yet.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
$ref = "szhaxlmronirhnntlwyb"   # live Supabase project

npx -y supabase db query --linked -f supabase/listing-search-keywords.sql | Out-Null
if ($LASTEXITCODE) { throw "La modification de la base (listing-search-keywords.sql) a echoue" }
Write-Host "0/3 Base de donnees prete (colonne search_keywords + declencheurs)."

$secure = Read-Host "Collez la cle API Anthropic (elle commence par sk-ant-)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if ($key -notmatch '^sk-ant-[A-Za-z0-9_-]{20,}$') { throw "Ce n'est pas une cle API Anthropic (sk-ant-...). Rien n'a ete enregistre." }
$envFile = New-TemporaryFile
try {
  [IO.File]::WriteAllText($envFile, "ANTHROPIC_API_KEY=$key")
  npx -y supabase secrets set --project-ref $ref --env-file $envFile | Out-Null
  if ($LASTEXITCODE) { throw "supabase secrets set a echoue" }
} finally {
  Remove-Item $envFile -Force -ErrorAction SilentlyContinue
  $key = $null
}
Write-Host "1/3 Cle enregistree dans Supabase (ANTHROPIC_API_KEY)."

npx -y supabase functions deploy listing-keywords --project-ref $ref --no-verify-jwt
if ($LASTEXITCODE) { throw "Le deploiement de listing-keywords a echoue" }
Write-Host "2/3 Fonction listing-keywords deployee."

$sql = New-TemporaryFile
try {
  [IO.File]::WriteAllText($sql, "select count(*) as annonces from (select public.queue_listing_keywords(id) from public.listings where search_keywords is null and seller_id is not null) q;")
  npx -y supabase db query --linked -f $sql
  if ($LASTEXITCODE) { throw "La demande de mots-cles pour les annonces existantes a echoue" }
} finally { Remove-Item $sql -Force -ErrorAction SilentlyContinue }
Write-Host "3/3 Mots-cles demandes pour les annonces existantes (prets dans 1 minute environ)."
