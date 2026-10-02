# ============================================================================
# DataHub - Windows Desktop Shortcut & EXE Creator
# Creates an official desktop icon and Start Menu shortcut on Windows
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DATAHUB ENTERPRISE INTELLIGENCE - DESKTOP SETUP        " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ProgramsPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$TargetLauncher = Join-Path $CurrentDir "DataHub-Silent-Launcher.vbs"
if (-not (Test-Path $TargetLauncher)) {
    $TargetLauncher = Join-Path $CurrentDir "DataHub-Desktop-Launcher.bat"
}

# 1. Create Windows Desktop Shortcut
$ShortcutPath = Join-Path $DesktopPath "DataHub Desktop.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$TargetLauncher`""
$Shortcut.WorkingDirectory = $CurrentDir
$Shortcut.Description = "Remix DataHub - Collection & Analysis Suite"
$Shortcut.WindowStyle = 1

# Check for custom icon in public or assets
$IconPath = Join-Path (Split-Path -Parent $CurrentDir) "public\favicon.ico"
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
}

$Shortcut.Save()
Write-Host "[SUCCESS] Created Desktop Shortcut: '$ShortcutPath'" -ForegroundColor Green

# 2. Create Start Menu Shortcut
$StartMenuDir = Join-Path $ProgramsPath "DataHub"
if (-not (Test-Path $StartMenuDir)) {
    New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
}
$StartMenuShortcutPath = Join-Path $StartMenuDir "DataHub Desktop.lnk"
$StartShortcut = $WshShell.CreateShortcut($StartMenuShortcutPath)
$StartShortcut.TargetPath = "wscript.exe"
$StartShortcut.Arguments = "`"$TargetLauncher`""
$StartShortcut.WorkingDirectory = $CurrentDir
$StartShortcut.Description = "Remix DataHub - Collection & Analysis Suite"
if (Test-Path $IconPath) {
    $StartShortcut.IconLocation = "$IconPath,0"
}
$StartShortcut.Save()
Write-Host "[SUCCESS] Created Start Menu Entry in: '$StartMenuDir'" -ForegroundColor Green

Write-Host "`nSetup complete! You can now launch DataHub directly from your Desktop." -ForegroundColor Cyan
