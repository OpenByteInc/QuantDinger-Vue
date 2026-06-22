param(
  [switch]$FailOnDamaged
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$langDir = Join-Path $root 'src/locales/lang'
$basePath = Join-Path $langDir 'en-US.js'

function Get-LocaleKeys($path) {
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $matches = [regex]::Matches($text, "(?m)^\s*'([^']+)'\s*:")
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($match in $matches) {
    [void]$set.Add($match.Groups[1].Value)
  }
  return $set
}

function Get-DamagedLineCount($path) {
  $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  return ([regex]::Matches($text, [string][char]0xFFFD)).Count
}

$baseKeys = Get-LocaleKeys $basePath
$files = Get-ChildItem -Path $langDir -Filter '*.js' | Sort-Object Name
$hasFailure = $false

foreach ($file in $files) {
  $keys = Get-LocaleKeys $file.FullName
  $missing = @()
  foreach ($key in $baseKeys) {
    if (-not $keys.Contains($key)) {
      $missing += $key
    }
  }
  $damaged = Get-DamagedLineCount $file.FullName
  $hasFallback = $file.Name -eq 'en-US.js' -or (
    Select-String -Path $file.FullName -Pattern 'enUSFallback' -Quiet
  )

  if ($damaged -gt 0 -and $FailOnDamaged) {
    $hasFailure = $true
  }

  [PSCustomObject]@{
    Locale = $file.Name
    Keys = $keys.Count
    MissingVsEnglish = $missing.Count
    HasEnglishFallback = $hasFallback
    ReplacementChars = $damaged
  }
}

if ($hasFailure) {
  throw 'One or more locale files contain replacement characters.'
}
