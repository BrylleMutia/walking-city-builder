# Shared paths for the e2e scripts. Dot-source it: . "$PSScriptRoot\common.ps1"

$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$Sdk = $env:ANDROID_HOME
if (-not $Sdk) { $Sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$Adb = Join-Path $Sdk 'platform-tools\adb.exe'
$Emulator = Join-Path $Sdk 'emulator\emulator.exe'
if (-not (Test-Path $Adb)) { throw "adb not found at $Adb. Install Android Studio's SDK platform-tools." }

$Maestro = (Get-Command maestro -ErrorAction SilentlyContinue).Source
if (-not $Maestro) { $Maestro = Join-Path $env:USERPROFILE '.maestro\bin\maestro.bat' }

# Keep Maestro quiet and private: no usage analytics, no promo banners.
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
$env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'

# Tests get their own local (non-tunnel) Metro, separate from the 8081 dev server
# you use with your phone. A tunnel-mode server sends the emulator over the
# internet, which fails, so the emulator always talks to this one directly.
$MetroPort = 8082

function Get-EmulatorSerial {
  $line = & $Adb devices | Select-String -Pattern '^(emulator-\d+)\s+device$' | Select-Object -First 1
  if ($line) { return $line.Matches[0].Groups[1].Value }
  return $null
}

function Test-Metro {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$MetroPort/status" -UseBasicParsing -TimeoutSec 3
    # Windows PowerShell returns this body as bytes, so match on the raw response text.
    return $r.RawContent -match 'packager-status:running'
  } catch { return $false }
}
