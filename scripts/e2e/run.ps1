# One command for the whole end-to-end suite:
#   emulator -> Metro + Expo Go -> Maestro flows -> screenshots, report and logcat in e2e-artifacts/<run>/
#
#   npm run e2e
#   npm run e2e -- -Flow 03-buy-and-open.yaml     (one flow; it may depend on state from earlier ones)
#   npm run e2e -- -Headless                       (no emulator window)
param(
  [string]$Avd = 'Pixel_10_Pro',
  [switch]$Headless,
  [string]$Flow
)
. "$PSScriptRoot\common.ps1"

if (-not (Test-Path $Maestro)) {
  throw "Maestro not found. Install it from https://github.com/mobile-dev-inc/maestro/releases (see e2e/README.md)."
}

& "$PSScriptRoot\emulator.ps1" -Avd $Avd -Headless:$Headless
& "$PSScriptRoot\start-app.ps1"
$serial = Get-EmulatorSerial

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $ProjectRoot "e2e-artifacts\$stamp"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$flows = Join-Path $ProjectRoot 'e2e\flows'
$target = if ($Flow) { Join-Path $flows $Flow } else { $flows }

& $Adb -s $serial logcat -c
Write-Host "Running Maestro on $serial -> $out"
& $Maestro --device $serial test $target `
  -e "METRO_URL=exp://localhost:$MetroPort" `
  --test-output-dir $out `
  --format JUNIT --output (Join-Path $out 'report.xml') `
  --no-ansi
$code = $LASTEXITCODE

# JS errors and native crashes from this run, for debugging.
& $Adb -s $serial logcat -d -v time 'ReactNativeJS:V' 'ReactNative:W' 'AndroidRuntime:E' '*:S' |
  Out-File -Encoding utf8 (Join-Path $out 'logcat.txt')

$shots = (Get-ChildItem -Path $out -Recurse -Filter *.png | Measure-Object).Count
Write-Host ''
Write-Host "Artifacts: $out ($shots screenshots, report.xml, logcat.txt)"
if ($code -ne 0) { Write-Host 'E2E FAILED' -ForegroundColor Red } else { Write-Host 'E2E PASSED' -ForegroundColor Green }
exit $code
