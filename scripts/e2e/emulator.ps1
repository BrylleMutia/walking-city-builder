# Boots the Android emulator (if none is running) and waits until Android has finished starting.
#   powershell -File scripts/e2e/emulator.ps1 [-Avd Pixel_10_Pro] [-Headless] [-ColdBoot]
#   -ColdBoot ignores the saved quick-boot snapshot (use it if the emulator starts frozen or broken).
param(
  [string]$Avd = 'Pixel_10_Pro',
  [switch]$Headless,
  [switch]$ColdBoot
)
. "$PSScriptRoot\common.ps1"

$serial = Get-EmulatorSerial
if (-not $serial) {
  $avds = & $Emulator -list-avds
  if ($avds -notcontains $Avd) { throw "No emulator named '$Avd'. Available: $($avds -join ', ')" }
  # Normal quick-boot: anything installed (e.g. an Expo Go upgrade) is kept between runs.
  $emuArgs = @('-avd', $Avd, '-no-boot-anim')
  if ($Headless) { $emuArgs += '-no-window' }
  if ($ColdBoot) { $emuArgs += '-no-snapshot-load' }
  Write-Host "Starting emulator $Avd..."
  Start-Process -FilePath $Emulator -ArgumentList $emuArgs -WindowStyle Minimized | Out-Null
}

$deadline = (Get-Date).AddMinutes(5)
$booted = $false
while ((Get-Date) -lt $deadline) {
  $serial = Get-EmulatorSerial
  if ($serial) {
    $flag = (& $Adb -s $serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
    if ($flag -eq '1') { $booted = $true; break }
  }
  Start-Sleep -Seconds 2
}
if (-not $booted) { throw 'Emulator did not finish booting within 5 minutes.' }

$version = (& $Adb -s $serial shell getprop ro.build.version.release | Out-String).Trim()
Write-Host "Emulator ready: $serial (Android $version)"
