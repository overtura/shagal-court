#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$BotRoot = $env:SELF_IMPROVING_BOT_HOME,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$Project = Get-Content -LiteralPath (Join-Path $RepoRoot "maintainer-bot\project.json") -Raw -Encoding utf8 | ConvertFrom-Json
if (-not $BotRoot) {
  $BotRoot = Join-Path $RepoRoot ([string]$Project.centralBotPath)
}
if (-not (Test-Path -LiteralPath (Join-Path $BotRoot "profiles\overtura") -PathType Container)) {
  throw "Central bot profiles directory not found. Set -BotRoot or SELF_IMPROVING_BOT_HOME. No repository will be cloned automatically."
}
$BotRoot = (Resolve-Path -LiteralPath $BotRoot).Path

foreach ($size in @("small", "major")) {
  $source = (Resolve-Path -LiteralPath (Join-Path $RepoRoot ([string]$Project.profiles.$size))).Path
  $profile = Get-Content -LiteralPath $source -Raw -Encoding utf8 | ConvertFrom-Json
  foreach ($field in @("repository", "defaultBranch", "scope", "improvementKind", "changeScale", "allowPaths", "denyPaths", "maxFiles", "maxLines", "autoMerge")) {
    if ($null -eq $profile.$field) { throw "Profile $source is missing required field: $field" }
  }
  $destination = Join-Path $BotRoot "profiles\overtura\shagal-court-$size.json"
  if ((Test-Path -LiteralPath $destination) -and -not $Force) { throw "Profile already exists: $destination. Use -Force to replace it." }
  if ($DryRun) { Write-Host "Validated: $source -> $destination"; continue }
  Copy-Item -LiteralPath $source -Destination $destination -Force:$Force
  Write-Host "Registered: $destination"
}
