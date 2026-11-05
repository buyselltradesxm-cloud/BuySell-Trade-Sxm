$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoPath

if ((git branch --show-current) -ne 'main') { throw 'Expected the main branch. No changes were made.' }
if (git diff --cached --name-only) { throw 'There are already staged changes. No changes were made.' }
if ((git rev-parse HEAD) -ne 'bd3f4d6ba98fdb3fc42684308e97ca19a9473d4f') { throw 'The project has changed since the build was prepared. No changes were made.' }
gh auth status --active
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI sign-in could not be verified. No changes were made.' }

$branchName = 'codex/ios-simulator-check-20261105'
git show-ref --verify --quiet "refs/heads/$branchName"
if ($LASTEXITCODE -eq 0) { throw "Branch $branchName already exists. No changes were made." }

$taskPaths = @(
  '.github/workflows/deploy-pages.yml', 'DESIGN.md', 'UX-CONTRACT.md', 'design-qa.md',
  'app-index.js', 'app-marketplace.js', 'auth-callback.html', 'index.html', 'marketplace.html',
  'ios/App/App.xcodeproj/project.pbxproj', 'ios/App/App/SXMBrowseView.swift',
  'ios/App/App/SXMNativePlugin.swift', 'ios/App/App/SXMRootViewController.swift',
  'ios/App/App/SXMWorkflows.swift', 'ios/App/App/Assets.xcassets/MarketLogo.imageset',
  'icons/market', 'market-design.css', 'native-ios.js', 'native-workflows.js',
  'package.json', 'supabase-api.js', 'sw.js', 'scripts/appstore-review-2026-11-05.md',
  'scripts/native-workflows-browser-check.js', 'scripts/native-workflows-check.js',
  'scripts/start-ios-simulator-check.ps1'
)
foreach ($taskPath in $taskPaths) {
  if (-not (Test-Path -LiteralPath $taskPath)) { throw "Missing file: $taskPath. No changes were made." }
}

git switch -c $branchName
if ($LASTEXITCODE -ne 0) { throw 'Could not create the branch.' }
git add -- $taskPaths
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the selected files. The new branch and any staged files remain available for inspection.' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Staged changes failed the whitespace check. Nothing was committed.' }
git commit -m 'Add native iOS marketplace workflows for review'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. The branch and staged changes remain available for inspection.' }
git push -u origin $branchName
if ($LASTEXITCODE -ne 0) { throw 'Push failed. The local commit is preserved on the new branch.' }
gh workflow run mobile-ios-cloud.yml --ref $branchName -f build_type=simulator -f smoke_test=true -f upload_to_appstore=false
if ($LASTEXITCODE -ne 0) { throw 'The branch was pushed, but the simulator workflow could not be started.' }
Write-Host 'Simulator build requested. Open https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/mobile-ios-cloud.yml to view it.'
