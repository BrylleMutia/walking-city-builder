# Saves the emulator's current screen to e2e-artifacts/shots/<name>.png and prints the path.
#   powershell -File scripts/e2e/screenshot.ps1 [-Name home]
param([string]$Name = (Get-Date -Format 'yyyyMMdd-HHmmss'))
. "$PSScriptRoot\common.ps1"

$serial = Get-EmulatorSerial
if (-not $serial) { throw 'No emulator running.' }

$dir = Join-Path $ProjectRoot 'e2e-artifacts\shots'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir "$Name.png"

# Capture on the device and pull it: piping PNG bytes through PowerShell would corrupt them.
& $Adb -s $serial shell screencap -p /sdcard/e2e-shot.png
& $Adb -s $serial pull /sdcard/e2e-shot.png $file | Out-Null
& $Adb -s $serial shell rm /sdcard/e2e-shot.png
Write-Host $file
