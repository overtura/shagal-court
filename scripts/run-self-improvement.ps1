#Requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$DryRun,
  [ValidateSet("small", "major")]
  [string]$ForceSize,
  [switch]$StatusOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ProjectPath = Join-Path $RepoRoot "maintainer-bot\project.json"
$StatePath = Join-Path $RepoRoot "maintainer-bot\cadence-state.json"
$Project = Get-Content -LiteralPath $ProjectPath -Raw -Encoding utf8 | ConvertFrom-Json

function Get-BotRoot {
  $candidates = @()
  if ($env:SELF_IMPROVING_BOT_HOME) { $candidates += $env:SELF_IMPROVING_BOT_HOME }
  $candidates += (Join-Path $RepoRoot "..\self-improving-maintainer-bot")
  if ($Project.centralBotPath) { $candidates += (Join-Path $RepoRoot ([string]$Project.centralBotPath)) }
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate "scripts\auto-improve-target-once.ps1") -PathType Leaf)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  throw "Central bot not found. Set SELF_IMPROVING_BOT_HOME or update maintainer-bot/project.json centralBotPath. The wrapper will not clone it automatically."
}

function Get-LabelNames($PullRequest) {
  return @($PullRequest.labels | ForEach-Object { [string]$_.name })
}

function Get-Cadence {
  try {
    $raw = & gh pr list --repo ([string]$Project.repository) --state merged --label self-improvement --limit 100 --json number,mergedAt,labels,isDraft,state 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($raw -join "`n") }
    $items = @($raw | Out-String | ConvertFrom-Json | Sort-Object mergedAt)
    $smallCount = 0
    $counted = @()
    foreach ($item in $items) {
      $labels = Get-LabelNames $item
      if ($labels -contains "cadence:override") { continue }
      if ($labels -contains "size:major") { $smallCount = 0; $counted += [int]$item.number; continue }
      if ($labels -contains "size:small") { $smallCount += 1; $counted += [int]$item.number }
    }
    $next = if ($smallCount -ge 4) { "major" } else { "small" }
    return [pscustomobject]@{ Source = "github"; NextSize = $next; SmallCount = $smallCount; Counted = $counted }
  }
  catch {
    $state = Get-Content -LiteralPath $StatePath -Raw -Encoding utf8 | ConvertFrom-Json
    Write-Warning "GitHub cadence lookup failed; using fallback state: $($_.Exception.Message)"
    return [pscustomobject]@{ Source = "fallback"; NextSize = [string]$state.nextSize; SmallCount = [int]$state.mergedSmallSinceMajor; Counted = @() }
  }
}

$cadence = Get-Cadence
$selected = if ($ForceSize) { $ForceSize } else { $cadence.NextSize }
$override = $ForceSize -eq "small" -and $cadence.NextSize -eq "major"
$reason = if ($override) { "Forced small override; this PR must receive cadence:override and must not advance cadence." } elseif ($selected -eq "major") { "Four small PRs have merged since the last major, so major remains due until merged." } else { "$($cadence.SmallCount) of 4 small PRs have merged in this cadence." }

Write-Host "Cadence source: $($cadence.Source)"
Write-Host "Selected size: $selected"
Write-Host "Reason: $reason"

if ($StatusOnly) { exit 0 }

$dirty = & git -C $RepoRoot status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect target worktree." }
if ($dirty) { throw "Target worktree must be clean before a self-improvement run." }

$botRoot = Get-BotRoot
$profileRelative = [string]$Project.profiles.$selected
$profilePath = (Resolve-Path -LiteralPath (Join-Path $RepoRoot $profileRelative)).Path
$runner = Join-Path $botRoot "scripts\auto-improve-target-once.ps1"
Write-Host "Central bot: $botRoot"
Write-Host "Profile: $profilePath"

& $runner -Profile $profilePath -AutoMerge -MergeMethod squash -MaxReviewResponses 3 -DryRun
if ($LASTEXITCODE -ne 0) { throw "Central bot dry-run failed." }
if ($DryRun) { exit 0 }

$startedAt = [DateTime]::UtcNow
& $runner -Profile $profilePath -AutoMerge -MergeMethod squash -MaxReviewResponses 3
if ($LASTEXITCODE -ne 0) { throw "Central bot run failed with exit code $LASTEXITCODE." }

$rawPrs = & gh pr list --repo ([string]$Project.repository) --state all --limit 50 --json number,createdAt,headRefName,state,mergedAt,url 2>&1
if ($LASTEXITCODE -ne 0) { throw "Unable to locate the generated pull request." }
$pullRequest = @($rawPrs | Out-String | ConvertFrom-Json | Where-Object {
  ([DateTime]$_.createdAt).ToUniversalTime() -ge $startedAt.AddMinutes(-1) -and ([string]$_.headRefName).StartsWith("codex/auto-improve")
} | Sort-Object createdAt -Descending | Select-Object -First 1)
if (-not $pullRequest) { throw "The central bot returned without a discoverable pull request." }

$labels = @("self-improvement", "size:$selected", $(if ($selected -eq "major") { "risk:r2" } else { "risk:r1" }), "auto-merge")
if ($override) { $labels += "cadence:override" }
& gh pr edit ([int]$pullRequest.number) --repo ([string]$Project.repository) --add-label ($labels -join ",") | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to apply cadence labels to PR #$($pullRequest.number)." }

$viewRaw = & gh pr view ([int]$pullRequest.number) --repo ([string]$Project.repository) --json state,mergedAt,url 2>&1
if ($LASTEXITCODE -ne 0) { throw "Unable to verify PR state." }
$view = $viewRaw | Out-String | ConvertFrom-Json
if ($view.mergedAt) {
  $fresh = Get-Cadence
  $state = [ordered]@{
    schemaVersion = 2
    source = "github"
    lastSyncedAt = [DateTime]::UtcNow.ToString("o")
    mergedSmallSinceMajor = $fresh.SmallCount
    nextSize = $fresh.NextSize
    lastMergedPullRequest = [int]$pullRequest.number
    note = "GitHub merged PR labels are authoritative whenever they are reachable."
  }
  $state | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
  Write-Host "Merged: $($view.url)"
}
else {
  Write-Host "Not merged; cadence remains unchanged: $($view.url)"
}
