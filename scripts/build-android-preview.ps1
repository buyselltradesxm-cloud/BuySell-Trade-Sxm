$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root

$branch = 'codex/android-native-preview-20261105'
$current = git branch --show-current
if ($current -ne 'codex/ios-simulator-check-20261105' -and $current -ne $branch) {
    throw 'Open the iOS design branch (codex/ios-simulator-check-20261105) before running this script.'
}
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Sign in to GitHub CLI with gh auth login.' }

if ($current -ne $branch) {
    git switch -c $branch
    if ($LASTEXITCODE -ne 0) { throw 'Could not create Android preview branch.' }
}
git add -- app-index.js app-marketplace.js android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMSharePlugin.java android/app/src/main/res/drawable/tab_home.xml android/app/src/main/res/drawable/tab_saved.xml android/app/src/main/res/drawable/tab_post.xml android/app/src/main/res/drawable/tab_messages.xml android/app/src/main/res/drawable/tab_profile.xml android/app/src/main/res/values/styles.xml market-design.css native-admob.js index.html marketplace.html auth-callback.html sw.js android/app/build.gradle android/app/src/main/AndroidManifest.xml android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/MainActivity.java android/app/src/main/java/com/korekdigitalmarketing/buyselltradesxm/SXMBrowseScreen.java .github/workflows/mobile-android-cloud.yml scripts/build-android-preview.ps1
if ($LASTEXITCODE -ne 0) { throw 'Could not stage Android preview files.' }
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m 'Add Android marketplace preview and installable build'
    if ($LASTEXITCODE -ne 0) { throw 'Could not commit Android preview.' }
}
git push -u origin $branch
if ($LASTEXITCODE -ne 0) { throw 'Could not push Android preview branch.' }
gh workflow run mobile-android-cloud.yml --ref $branch -f track=none
if ($LASTEXITCODE -ne 0) { throw 'Could not start the Android build.' }

Write-Host ''
Write-Host 'Android preview build started. Google Play publishing is disabled (track=none).'
Write-Host 'Build status: https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/mobile-android-cloud.yml'
Write-Host 'After it finishes, download the BuySellTradeSXM-android-preview-apk artifact to install on a phone.'
