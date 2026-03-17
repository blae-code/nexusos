<#
.SYNOPSIS
  Bump NexusOS version, update CHANGELOG.md, sync all versioning files, and commit the result.

.PARAMETER BumpType
  patch | minor | major

.PARAMETER Message
  Changelog entry text (also used as the commit message suffix).

.EXAMPLE
  .\version-bump.ps1 patch "Fix blueprint recipe partial quantity check"
  .\version-bump.ps1 minor "Add Industry Hub Materials tab with OCR upload"
  .\version-bump.ps1 major "NexusOS 1.0 — full launch build"
#>
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType,

    [Parameter(Mandatory = $true)]
    [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Read current version ──────────────────────────────────────────────────────

$versionFile = Join-Path $PSScriptRoot "version.json"
$v = Get-Content $versionFile -Raw | ConvertFrom-Json

$parts = $v.version -split '\.'
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

# ── Bump ──────────────────────────────────────────────────────────────────────

switch ($BumpType) {
    "patch" { $patch++ }
    "minor" { $minor++; $patch = 0 }
    "major" { $major++; $minor = 0; $patch = 0 }
}

$newVersion = "$major.$minor.$patch"
$newBuild   = $v.build + 1
$date       = (Get-Date -Format "yyyy-MM-dd")

# ── Write version.json ────────────────────────────────────────────────────────

$v.version = $newVersion
$v.full    = "NexusOS $newVersion (build $newBuild)"
$v.date    = $date
$v.build   = $newBuild

$v | ConvertTo-Json -Depth 5 | Set-Content $versionFile -Encoding UTF8

# ── Prepend to CHANGELOG.md ───────────────────────────────────────────────────

$changelogFile = Join-Path $PSScriptRoot "CHANGELOG.md"
$existing      = Get-Content $changelogFile -Raw

$entry = "## $newVersion — $date`n- $Message`n`n"
Set-Content $changelogFile -Value ($entry + $existing) -Encoding UTF8

# ── Sync generated versioning files ──────────────────────────────────────────

node (Join-Path $PSScriptRoot "scripts\versioning\sync-versioning.mjs")

# ── Git commit ────────────────────────────────────────────────────────────────

git add version.json CHANGELOG.md package.json package-lock.json docs/versioning.md src/core/data/generated/versioning.js
git commit -m "chore($BumpType): v$newVersion — $Message"

Write-Host ""
Write-Host "  Bumped to v$newVersion (build $newBuild)" -ForegroundColor Green
Write-Host "  $date · $Message" -ForegroundColor DarkGray
Write-Host ""
