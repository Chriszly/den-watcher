# Checks on a Windows machine, as an administrator, that the installer takes
# over an install from before the rename to den-watcher: installs OldMsi
# (usage-control 2.0.7a) with the website on another port and the power
# add-on, updates it to Msi without options and checks there is one install,
# named Den-Watcher, that it kept the port, the add-on and the history, and
# that the old program folder and firewall rule are gone and the power
# add-on, a service of its own before, now runs as the service's child
# process; then uninstalls it with DELETE_HISTORY=1, so
# windows/check-installer.ps1 starts clean.
#
#   pwsh windows/check-rename-upgrade.ps1 -OldMsi usage-control-2.0.7a-x64.msi -Msi den-watcher-255.0.0-x64.msi
param(
    [Parameter(Mandatory)] [string] $OldMsi,
    # An installer with a version above the old one's.
    [Parameter(Mandatory)] [string] $Msi
)

$ErrorActionPreference = 'Stop'
$OldMsi = (Resolve-Path $OldMsi).Path
$Msi = (Resolve-Path $Msi).Path

function Invoke-Installer([string] $Arguments) {
    $process = Start-Process msiexec.exe -ArgumentList "$Arguments /qn /l*v msiexec.log" -Wait -PassThru
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

Write-Host 'Installing usage-control from before the rename'
Invoke-Installer "/i `"$OldMsi`" WEBSITE=1 PORT=8092 POWER=1 UPDATE_CHECK=false"
Get-Answer 'http://127.0.0.1:8092/api/metrics' | Out-Null
if (-not (Test-Path "$env:ProgramData\Usage Control\usage-control.db")) { throw 'The old version created no history database' }

Write-Host 'Updating it to Den-Watcher without options keeps them and the history'
Invoke-Installer "/i `"$Msi`""
if ((Get-Installed 'Usage Control').Count -ne 0) { throw 'The update left the install named Usage Control' }
if ((Get-Installed 'Den-Watcher').Count -ne 1) { throw 'Windows does not list one install named Den-Watcher' }
$metrics = Get-Answer 'http://127.0.0.1:8092/api/metrics'
if (-not $metrics.version) { throw 'The updated service does not report its version' }
if (Get-Service UsageControlPower -ErrorAction SilentlyContinue) { throw 'The update left the power add-on as a service of its own' }
$service = (Get-CimInstance Win32_Service -Filter "Name = 'UsageControl'").ProcessId
foreach ($try in 1..30) {
    $addOn = @(Get-CimInstance Win32_Process -Filter "Name = 'den-watcher-power.exe'" | Where-Object ParentProcessId -eq $service)
    if ($addOn.Count -eq 1) { break }
    Start-Sleep -Seconds 1
}
if ($addOn.Count -ne 1) { throw 'The update lost the power add-on, which the service should run as its child process' }
if (-not (Test-Path "$env:ProgramData\Usage Control\usage-control.db")) { throw 'The update lost the history' }
if (Test-Path "$env:ProgramFiles\Usage Control") { throw 'The old program folder is still there' }
if (Get-NetFirewallRule -DisplayName 'Usage Control' -ErrorAction SilentlyContinue) { throw 'The old firewall rule is still there' }
if (-not (Get-NetFirewallRule -DisplayName 'Den-Watcher' -ErrorAction SilentlyContinue)) { throw 'The update added no firewall rule' }
if (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -Name 'Usage Control' -ErrorAction SilentlyContinue) { throw 'The old tray icon still starts at login' }

Invoke-Installer "/x `"$Msi`" DELETE_HISTORY=1"
if (Test-Path "$env:ProgramData\Usage Control") { throw 'The data folder is still there' }
Write-Host 'The update from before the rename keeps the options, the power add-on and the history.'
