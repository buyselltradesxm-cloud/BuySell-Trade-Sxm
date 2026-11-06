$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$repo = 'buyselltradesxm-cloud/BuySell-Trade-Sxm'
$branch = 'codex/android-native-preview-20261105'
function Check([string]$message) { if ($LASTEXITCODE -ne 0) { throw $message } }
if ((git branch --show-current) -ne $branch) { throw "Switch to $branch before publishing." }
gh auth status
Check 'GitHub login required.'
node scripts/version-assets.js --check
Check 'Asset verification failed.'
node scripts/native-workflows-check.js
Check 'Marketplace workflow verification failed.'
node --check native-admob.js
Check 'AdMob JavaScript syntax check failed.'

$files = @(
  'android/app/build.gradle',
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/MainActivity.java',
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMBrowseScreen.java',
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMLayoutPlugin.java',
  'android/app/src/main/res/values/strings.xml',
  'auth-callback.html', 'index.html', 'marketplace.html', 'native-admob.js', 'sw.js',
  'scripts/publish-inline-admob.ps1'
)
git add -- @files
Check 'Could not stage AdMob changes.'
git diff --cached --check
Check 'Staged changes contain whitespace errors.'
git diff --cached --quiet -- @files
if ($LASTEXITCODE -eq 1) {
  git commit -m 'Display consented real AdMob banners in Android browse feed' -- @files
  Check 'Could not commit AdMob changes.'
} elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes.' }
git push -u origin $branch
Check 'Could not push AdMob changes.'

$headSha = git rev-parse HEAD
$prs = @(gh pr list --repo $repo --head $branch --base main --state open --json number | ConvertFrom-Json)
Check 'Could not inspect pull requests.'
if (!$prs) {
  gh pr create --repo $repo --base main --head $branch --title 'Display AdMob in Android marketplace feed' --body 'Load a consent-gated inline adaptive AdMob banner in native Android Browse. Hide it for Pro accounts and when no ad fills; use Google test inventory for debug and the configured real unit for release. Keep the WebView banner out of the native browse screen. Android debug build and native workflow checks passed.'
  Check 'Could not create pull request.'
  $prs = @(gh pr list --repo $repo --head $branch --base main --state open --json number | ConvertFrom-Json)
  Check 'Could not find the created pull request.'
}
if (!$prs) { throw 'Pull request was not found.' }
$prNumber = $prs[0].number
gh pr merge $prNumber --repo $repo --squash --match-head-commit $headSha
Check 'Pull request merge failed. Resolve its checks or conflicts before retrying.'
$merged = gh pr view $prNumber --repo $repo --json state,mergeCommit | ConvertFrom-Json
Check 'Could not verify the merge.'
if ($merged.state -ne 'MERGED') { throw 'The pull request is not merged.' }

$mergeSha = $merged.mergeCommit.oid
$runId = $null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  $runs = @(gh run list --repo $repo --workflow deploy-pages.yml --commit $mergeSha --json databaseId --limit 1 | ConvertFrom-Json)
  Check 'Could not inspect website deployment.'
  if ($runs) { $runId = $runs[0].databaseId; break }
  Start-Sleep -Seconds 10
}
if (!$runId) { throw 'Website deployment did not start; Android publication was not requested.' }
gh run watch $runId --repo $repo --exit-status
Check 'Website deployment failed; Android publication was not requested.'

gh workflow run mobile-android-cloud.yml --repo $repo --ref main -f track=production -f version_name=1.0.7
Check 'Could not start the Android production build.'
Write-Host "AdMob changes merged in PR #$prNumber. Website deployed. Android 1.0.7 build requested for Google Play."
Write-Host 'https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/mobile-android-cloud.yml'
Write-Host 'Check the workflow and Play Console review before considering this version live.'
