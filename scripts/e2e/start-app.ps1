# Makes sure Metro is serving the project and Expo Go is on the emulator.
# Flows open the project themselves (exp://10.0.2.2:8081), so this only prepares.
. "$PSScriptRoot\common.ps1"

$serial = Get-EmulatorSerial
if (-not $serial) { throw 'No emulator running. Run scripts/e2e/emulator.ps1 first.' }

if (-not (Test-Metro)) {
  Write-Host "Starting Metro on port $MetroPort (in its own window)..."
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', "npx expo start --go --port $MetroPort" `
    -WorkingDirectory $ProjectRoot -WindowStyle Minimized | Out-Null
  $deadline = (Get-Date).AddMinutes(2)
  while (-not (Test-Metro)) {
    if ((Get-Date) -gt $deadline) { throw 'Metro did not start within 2 minutes.' }
    Start-Sleep -Seconds 2
  }
}
Write-Host "Metro is running on port $MetroPort."

# Make the host's Metro port appear as localhost:<port> inside the emulator.
# Expo Go fails to download the bundle via the 10.0.2.2 host alias on this
# emulator image, but loads instantly over adb reverse. Mappings reset when the
# emulator restarts, so set it every run.
& $Adb -s $serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null

# Expo Go must match the project's SDK, or it shows "Project is incompatible".
# Ask Expo which Expo Go build goes with this SDK and install it if the emulator has another.
$sdkMajor = ((Get-Content (Join-Path $ProjectRoot 'node_modules\expo\package.json') -Raw | ConvertFrom-Json).version -split '\.')[0]
$versions = (Invoke-RestMethod -Uri 'https://api.expo.dev/v2/versions/latest' -TimeoutSec 20).data
$sdkInfo = $versions.sdkVersions."$sdkMajor.0.0"
if (-not $sdkInfo -or -not $sdkInfo.androidClientUrl) { throw "Expo has no Expo Go build listed for SDK $sdkMajor." }

$installed = (& $Adb -s $serial shell dumpsys package host.exp.exponent | Select-String 'versionName=' | Select-Object -First 1)
$installedVersion = if ($installed) { ($installed.ToString() -split '=')[1].Trim() } else { 'none' }

if ($installedVersion -ne $sdkInfo.androidClientVersion) {
  Write-Host "Expo Go on the emulator is $installedVersion; installing $($sdkInfo.androidClientVersion) for SDK $sdkMajor..."
  $apk = Join-Path $env:TEMP "Expo-Go-$($sdkInfo.androidClientVersion).apk"
  if (-not (Test-Path $apk)) { Invoke-WebRequest -Uri $sdkInfo.androidClientUrl -OutFile $apk -UseBasicParsing }
  & $Adb -s $serial install -r $apk
  if ($LASTEXITCODE -ne 0) { throw 'Installing Expo Go failed.' }
}
Write-Host "Expo Go $($sdkInfo.androidClientVersion) is on the emulator."
