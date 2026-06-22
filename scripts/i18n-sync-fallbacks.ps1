param(
  [switch]$Check
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$langDir = Join-Path $root 'src/locales/lang'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$localeFiles = Get-ChildItem -Path $langDir -Filter '*.js' |
  Where-Object { $_.Name -ne 'en-US.js' }

foreach ($file in $localeFiles) {
  $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
  $changed = $false

  if ($content -notmatch "import\s+enUSFallback\s+from\s+'\.\/en-US'") {
    $lines = $content -split "`r?`n"
    $lastImport = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
      if ($lines[$i] -match '^import\s') {
        $lastImport = $i
      }
    }
    if ($lastImport -ge 0) {
      $before = if ($lastImport -ge 0) { $lines[0..$lastImport] } else { @() }
      $after = if ($lastImport + 1 -lt $lines.Length) { $lines[($lastImport + 1)..($lines.Length - 1)] } else { @() }
      $lines = @($before + "import enUSFallback from './en-US'" + $after)
      $content = $lines -join "`r`n"
      $changed = $true
    }
  }

  if ($content -notmatch '\.\.\.enUSFallback') {
    $content = [regex]::Replace(
      $content,
      'export\s+default\s+\{',
      "export default {`r`n  ...enUSFallback,",
      1
    )
    $changed = $true
  }

  if ($Check) {
    if ($content -notmatch "import\s+enUSFallback\s+from\s+'\.\/en-US'" -or $content -notmatch '\.\.\.enUSFallback') {
      throw "Locale fallback is incomplete: $($file.Name)"
    }
  } elseif ($changed) {
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
    Write-Host "updated $($file.Name)"
  }
}

if ($Check) {
  $indexPath = Join-Path $root 'src/locales/index.js'
  $selectPath = Join-Path $root 'src/components/SelectLang/index.jsx'
  $index = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
  $select = [System.IO.File]::ReadAllText($selectPath, [System.Text.Encoding]::UTF8)

  if ($index -notmatch "'ru-RU':\s+\(\)\s+=>\s+import\('\.\/lang\/ru-RU\.js'\)") {
    throw 'ru-RU is not registered in src/locales/index.js'
  }
  if ($select -notmatch "'ru-RU'") {
    throw 'ru-RU is not registered in SelectLang'
  }
  if ($select -match [char]0xFFFD) {
    throw 'SelectLang still contains replacement characters'
  }
  if ($select -notmatch '\\u0420\\u0443\\u0441\\u0441\\u043a\\u0438\\u0439') {
    throw 'SelectLang is missing the Russian display label'
  }
  Write-Host 'i18n fallback check passed'
}
