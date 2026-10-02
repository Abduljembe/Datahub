' ============================================================================
' DataHub - Silent Windows Desktop App Launcher
' Launches DataHub in isolated desktop app mode with NO console window flash
' ============================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strScriptDir & "\DataHub-Desktop-Launcher.bat"

' Run the batch file hidden (0 = hide window, false = don't wait for completion)
WshShell.Run Chr(34) & strBatPath & Chr(34), 0, False

Set WshShell = Nothing
Set fso = Nothing
