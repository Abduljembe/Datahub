; ============================================================================
; Inno Setup Script for DataHub Enterprise Intelligence Suite
; Generates: DataHub-Windows-Setup-v1.0.0.exe
; ============================================================================

#define MyAppName "DataHub Desktop"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Remix DataHub Inc."
#define MyAppURL "https://datahub.com"
#define MyAppExeName "DataHub.exe"

[Setup]
AppId={{D389F134-925F-413F-846F-0A303494C72A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\DataHub Desktop
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\dist-installer
OutputBaseFilename=DataHub-Windows-Setup-v1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
SetupIconFile=..\public\favicon.ico
UninstallDisplayIcon={app}\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\*"; DestDir: "{app}\resources\app\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "DataHub-Desktop-Launcher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "DataHub-Silent-Launcher.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\favicon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DataHub-Silent-Launcher.vbs"""; IconFilename: "{app}\favicon.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\DataHub-Silent-Launcher.vbs"""; Tasks: desktopicon; IconFilename: "{app}\favicon.ico"

[Run]
Filename: "wscript.exe"; Parameters: """{app}\DataHub-Silent-Launcher.vbs"""; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall nowait skipifsilent
