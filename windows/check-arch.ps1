# Checks on a Windows machine, as an administrator, that the installer for
# both processors takes over an install of the installer for this machine's
# processor from before: installs OldMsi (den-watcher 2.0.8a for x64 or for
# arm64) with the website on another port and the kernel add-on, updates it
# to Msi without options and checks there is one install, that it kept the
# port, the add-on and the history, and that the programs it installed are
# the ones built for Arch, the machine's processor (amd64 or arm64); then
# uninstalls it with DELETE_HISTORY=1, so the next check starts clean.
#
#   pwsh windows/check-arch.ps1 -OldMsi den-watcher-2.0.8a-arm64.msi -Msi den-watcher-255.0.0.msi -Arch arm64
param(
    [Parameter(Mandatory)] [string] $OldMsi,
    # An installer with a version above the old one's.
    [Parameter(Mandatory)] [string] $Msi,
    [Parameter(Mandatory)] [ValidateSet('amd64', 'arm64')] [string] $Arch
)

$ErrorActionPreference = 'Stop'
$OldMsi = (Resolve-Path $OldMsi).Path
$Msi = (Resolve-Path $Msi).Path

function Invoke-Installer([string] $Arguments) {
    $process = Start-Process msiexec.exe -ArgumentList "$Arguments /qn /l*v msiexec.log" -PassThru
    # An installer waiting on a dialog no one answers would never end.
    if (-not $process.WaitForExit(300000)) {
        $process.Kill($true)
        Get-Content msiexec.log -Tail 80
        throw "msiexec $Arguments did not end within 5 minutes, as if waiting on a dialog"
    }
    if ($process.ExitCode -ne 0) {
        Get-Content msiexec.log -Tail 80
        throw "msiexec $Arguments failed with exit code $($process.ExitCode)"
    }
}

# Waits for the service to answer, as it takes a moment to start.
function Get-Answer([string] $Url) {
    foreach ($try in 1..30) {
        try { return Invoke-RestMethod $Url } catch { Start-Sleep -Seconds 1 }
    }
    Get-Service UsageControl | Format-List
    throw "The service did not answer $Url"
}

function Get-Installed([string] $Name) {
    @(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*' |
        Where-Object { $_.PSObject.Properties['DisplayName'] -and $_.DisplayName -eq $Name })
}

# The processor a program is built for, from the machine field of its PE header.
function Get-ProgramArch([string] $Path) {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $header = [System.BitConverter]::ToInt32($bytes, 0x3C)
    switch ([System.BitConverter]::ToUInt16($bytes, $header + 4)) {
        0x8664 { 'amd64' }
        0xAA64 { 'arm64' }
        default { "unknown ($_)" }
    }
}

Write-Host "Installing $(Split-Path $OldMsi -Leaf)"
Invoke-Installer "/i `"$OldMsi`" WEBSITE=1 PORT=8093 KERNEL=1 UPDATE_CHECK=false"
Get-Answer 'http://127.0.0.1:8093/api/metrics' | Out-Null
if (-not (Test-Path "$env:ProgramData\Usage Control\usage-control.db")) { throw 'The old version created no history database' }

Write-Host "Updating it to the installer for both processors installs the $Arch programs"
Invoke-Installer "/i `"$Msi`""
$installed = Get-Installed 'Den-Watcher'
if ($installed.Count -ne 1) { throw "Windows lists $($installed.Count) installs named Den-Watcher, not 1" }
if ($installed[0].DisplayVersion -ne '255.0.0') { throw "The installed version is $($installed[0].DisplayVersion), not the update's 255.0.0" }
Get-Answer 'http://127.0.0.1:8093/api/metrics' | Out-Null
$folder = "$env:ProgramFiles\Den-Watcher"
foreach ($program in 'den-watcher.exe', 'den-watcher-tray.exe', 'den-watcher-kernel.exe') {
    $got = Get-ProgramArch "$folder\$program"
    if ($got -ne $Arch) { throw "$program is built for $got, not for this machine's $Arch" }
}
$service = (Get-CimInstance Win32_Service -Filter "Name = 'UsageControl'").ProcessId
foreach ($try in 1..30) {
    $addOn = @(Get-CimInstance Win32_Process -Filter "Name = 'den-watcher-kernel.exe'" | Where-Object ParentProcessId -eq $service)
    if ($addOn.Count -eq 1) { break }
    Start-Sleep -Seconds 1
}
if ($addOn.Count -ne 1) { throw 'The update lost the kernel add-on, which the service should run as its child process' }
if (-not (Test-Path "$env:ProgramData\Usage Control\usage-control.db")) { throw 'The update lost the history' }

Invoke-Installer "/x `"$Msi`" DELETE_HISTORY=1"
if ((Get-Installed 'Den-Watcher').Count -ne 0) { throw 'The uninstall left Den-Watcher installed' }
if (Test-Path "$env:ProgramData\Usage Control") { throw 'The data folder is still there' }
Write-Host "The update from the $Arch installer installs the $Arch programs and keeps the options, the add-on and the history."
