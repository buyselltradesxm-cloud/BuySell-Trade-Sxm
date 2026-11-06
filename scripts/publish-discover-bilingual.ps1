$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repo = 'buyselltradesxm-cloud/BuySell-Trade-Sxm'
$sourceBranch = 'codex/android-inline-admob-20261106'
$releaseBranch = 'codex/android-discover-bilingual-20261106'
function Check([string]$message) { if ($LASTEXITCODE -ne 0) { throw $message } }
$currentBranch = git branch --show-current
if ($currentBranch -ne $sourceBranch -and $currentBranch -ne $releaseBranch) {
  throw "Start on $sourceBranch or $releaseBranch."
}
gh auth status
Check 'GitHub login required.'
node scripts/version-assets.js --check
Check 'Asset verification failed.'
node scripts/native-workflows-check.js
Check 'Marketplace workflow verification failed.'
node --check app-index.js
Check 'Index JavaScript syntax failed.'
node --check app-marketplace.js
Check 'Marketplace JavaScript syntax failed.'

$files = @(
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/MainActivity.java',
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMBrowseScreen.java',
  'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMLayoutPlugin.java',
  'app-index.js', 'app-marketplace.js', 'auth-callback.html', 'index.html',
  'marketplace.html', 'sw.js', 'scripts/publish-discover-bilingual.ps1'
)
if ($currentBranch -eq $sourceBranch) {
  git add -- @files
  Check 'Could not stage Discover redesign.'
  git diff --cached --check
  Check 'Staged changes contain whitespace errors.'
  git diff --cached --quiet -- @files
  if ($LASTEXITCODE -ne 1) { throw 'No Discover changes were staged, or Git could not inspect them.' }
  git commit -m 'Refine Android Discover and synchronize French and English' -- @files
  Check 'Could not commit Discover changes.'
  $sourceCommit = git rev-parse HEAD

  # The preceding AdMob PR was squash-merged. Carry only this feature to main.
  git fetch origin main
  Check 'Could not fetch main.'
  git switch -c $releaseBranch origin/main
  Check 'Could not create release branch from main.'
  git cherry-pick -X theirs $sourceCommit
  Check 'Could not apply Discover commit to current main. Review conflicts before publishing.'
}
node scripts/version-assets.js --check
Check 'Asset versions need review after cherry-pick.'
git push -u origin $releaseBranch
Check 'Could not push release branch.'

$prs = @(gh pr list --repo $repo --head $releaseBranch --base main --state open --json number | ConvertFrom-Json)
Check 'Could not inspect the pull request.'
if (!$prs) {
  gh pr create --repo $repo --base main --head $releaseBranch --title 'Refine bilingual Android Discover' --body 'Add a compact marketplace introduction, clearer search and district filters, readable two-column cards, and a FR/EN selector that synchronizes native navigation with the web pages. Android debug build, JavaScript syntax, asset and marketplace checks passed.'
  Check 'Could not create pull request.'
  $prs = @(gh pr list --repo $repo --head $releaseBranch --base main --state open --json number | ConvertFrom-Json)
  Check 'Could not inspect the created pull request.'
}
if (!$prs) { throw 'Pull request was not found.' }
$prNumber = $prs[0].number
$headSha = git rev-parse HEAD
gh pr merge $prNumber --repo $repo --squash --match-head-commit $headSha
Check 'Merge failed. Check the pull request before continuing.'
$merged = gh pr view $prNumber --repo $repo --json state,mergeCommit | ConvertFrom-Json
Check 'Could not verify merge.'
if ($merged.state -ne 'MERGED') { throw 'Pull request is not merged.' }
$mergeSha = $merged.mergeCommit.oid
$runId = $null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  $runs = @(gh run list --repo $repo --workflow deploy-pages.yml --commit $mergeSha --json databaseId --limit 1 | ConvertFrom-Json)
  Check 'Could not inspect website deployment.'
  if ($runs) { $runId = $runs[0].databaseId; break }
  Start-Sleep -Seconds 10
}
if (!$runId) { throw 'Website deployment did not start. Android publication was not requested.' }
gh run watch $runId --repo $repo --exit-status
Check 'Website deployment failed. Android publication was not requested.'
gh workflow run mobile-android-cloud.yml --repo $repo --ref main -f track=production -f version_name=1.0.8
Check 'Could not start Android 1.0.8 production workflow.'
Write-Host "Discover changes merged in PR #$prNumber. Website deployed. Android 1.0.8 production build requested."
Write-Host 'https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/mobile-android-cloud.yml'
Write-Host 'Check the workflow and Google Play review before considering this version live.'
