$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repo = 'buyselltradesxm-cloud/BuySell-Trade-Sxm'
$branch = 'codex/android-native-preview-20261105'
function Check([string]$message) { if ($LASTEXITCODE -ne 0) { throw $message } }
if ((git branch --show-current) -ne $branch) { throw "Please switch to $branch first." }
gh auth status
Check 'GitHub login required.'
node scripts/version-assets.js --check
Check 'Asset verification failed.'
node scripts/native-workflows-check.js
Check 'Workflow verification failed.'
$files = @(
 'android/app/src/main/AndroidManifest.xml',
 'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/MainActivity.java',
 'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMBrowseScreen.java',
 'android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMSharePlugin.java',
 'android/app/src/main/res/values/styles.xml',
 'android/app/src/main/res/drawable/tab_home.xml',
 'android/app/src/main/res/drawable/tab_messages.xml',
 'android/app/src/main/res/drawable/tab_post.xml',
 'android/app/src/main/res/drawable/tab_profile.xml',
 'android/app/src/main/res/drawable/tab_saved.xml',
 'app-index.js','app-marketplace.js','auth-callback.html','index.html',
 'market-design.css','marketplace.html','native-admob.js','sw.js',
 'scripts/build-android-preview.ps1','scripts/publish-android-ui-fix.ps1'
)
git add -- @files
Check 'Could not stage corrections.'
git diff --cached --quiet -- @files
if ($LASTEXITCODE -eq 1) {
 git commit --only -m 'Fix Android navigation, area search and native sharing; compact mobile hero' -- @files
 Check 'Could not commit corrections.'
} elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged corrections.' }
git push origin $branch
Check 'Could not push corrections.'
$headSha = git rev-parse HEAD
$prs = @(gh pr list --repo $repo --head $branch --base main --state open --json number | ConvertFrom-Json)
Check 'Could not inspect pull requests.'
if ($prs.Count -eq 0) {
 gh pr create --repo $repo --base main --head $branch --title 'Fix Android navigation, sharing and marketplace layout' --body 'Improve tab contrast and system insets, add side and district filtering, use native listing sharing, compact the mobile hero, and retry failed AdMob banner requests. Android debug compilation and targeted sharing/browser checks passed. Physical-device ad delivery remains unverified.'
 Check 'Could not create pull request.'
 $prs = @(gh pr list --repo $repo --head $branch --base main --state open --json number | ConvertFrom-Json)
 Check 'Could not find new pull request.'
}
$prNumber = $prs[0].number
gh pr merge $prNumber --repo $repo --squash --match-head-commit $headSha
Check 'Merge failed. Resolve the reported checks or conflicts before continuing.'
$merged = gh pr view $prNumber --repo $repo --json state,mergeCommit | ConvertFrom-Json
Check 'Could not verify merge.'
if ($merged.state -ne 'MERGED') { throw 'Pull request is not merged yet.' }
$mergeSha = $merged.mergeCommit.oid
$runId = $null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
 $runs = @(gh run list --repo $repo --workflow deploy-pages.yml --commit $mergeSha --json databaseId --limit 1 | ConvertFrom-Json)
 Check 'Could not inspect website deployment.'
 if ($runs.Count -gt 0) { $runId = $runs[0].databaseId; break }
 Start-Sleep -Seconds 10
}
if (!$runId) { throw 'Website deployment did not start. Check GitHub Actions.' }
gh run watch $runId --repo $repo --exit-status
Check 'Website deployment failed. Android production upload was not started.'
gh workflow run mobile-android-cloud.yml --repo $repo --ref main -f track=production -f version_name=1.0.5
Check 'Could not start Android production build.'
Write-Host 'Website deployment succeeded. Android 1.0.5 production build requested.'
Write-Host 'Check its Publish to Google Play step and Play Console review status before calling the app live.'
Write-Host 'https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/mobile-android-cloud.yml'
