# Teste une cle API Anthropic AVANT de l'enregistrer comme secret Supabase ANTHROPIC_API_KEY.
# Lance :  pwsh scripts/check-anthropic-key.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
$ref = "szhaxlmronirhnntlwyb"

$secure = Read-Host "Collez la cle API Anthropic (sk-ant-...)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$key  = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
$key = $key.Trim()

if ($key -notmatch '^sk-ant-[A-Za-z0-9_-]{20,}$') {
  Write-Host "Format invalide : une cle commence par sk-ant-. Rien enregistre." ; exit 1
}
Write-Host ("Cle recue : {0} caracteres, debut '{1}'." -f $key.Length, $key.Substring(0, 12))

# Test d'authentification : on n'enregistre que si Anthropic accepte la cle.
$headers = @{ "x-api-key" = $key; "anthropic-version" = "2023-06-01"; "content-type" = "application/json" }
$body = @{ model = "claude-haiku-5-5"; max_tokens = 4; messages = @(@{ role = "user"; content = "hi" }) } | ConvertTo-Json
$valid = $false
try {
  Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" -Method Post -Headers $headers -Body $body | Out-Null
  $valid = $true
} catch {
  $status = $null
  try { $status = [int]$_.Exception.Response.StatusCode } catch {}
  if ($status -eq 401) {
    Write-Host "CLE REFUSEE (401 invalid x-api-key) -> RIEN enregistre. Recopiez la cle depuis console.anthropic.com (bouton Copy)."
    Write-Host $_.ErrorDetails.Message
    exit 1
  }
  # Un 400 (ex. modele) signifie quand meme que la cle est authentifiee.
  Write-Host ("Cle authentifiee (reponse {0}, non-401)." -f $status)
  $valid = $true
}

if (-not $valid) { Write-Host "Echec inattendu, rien enregistre." ; exit 1 }

$envFile = New-TemporaryFile
try {
  [IO.File]::WriteAllText($envFile, "ANTHROPIC_API_KEY=$key")
  npx -y supabase secrets set --project-ref $ref --env-file $envFile | Out-Null
  if ($LASTEXITCODE) { throw "supabase secrets set a echoue" }
} finally { Remove-Item $envFile -Force -ErrorAction SilentlyContinue; $key = $null }
Write-Host "FAIT : cle VALIDE enregistree dans Supabase. Dites a l'assistant : ok"
