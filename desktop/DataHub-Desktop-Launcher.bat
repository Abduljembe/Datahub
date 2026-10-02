@echo off
:: ============================================================================
:: DataHub - Windows Desktop Executable Launcher (.bat -> .exe)
:: Remix DataHub Intelligence Suite
:: ============================================================================
TITLE DataHub Desktop Launcher
COLOR 0B

echo ==========================================================================
echo               DATAHUB ENTERPRISE INTELLIGENCE SUITE
echo                      Windows Desktop Launcher
echo ==========================================================================
echo Starting DataHub in Native Windows App Mode...
echo.

:: Target URL: Defaults to local dev server (port 3000) or cloud deployment
SET APP_URL=http://localhost:3000
SET CLOUD_URL=https://ais-pre-wg2tf4skzkfm6p2qvxa22x-19154088631.europe-west2.run.app
SET TARGET_URL=%APP_URL%

:: Test if local server is listening on port 3000
netstat -ano | findstr :3000 >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] Local port 3000 not active. Launching cloud production instance:
    echo        %CLOUD_URL%
    SET TARGET_URL=%CLOUD_URL%
) ELSE (
    echo [INFO] Connected to active local DataHub server on port 3000.
)

:: Find Microsoft Edge (installed on 100%% of Windows 10/11 systems)
SET EDGE_PATH="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
IF NOT EXIST %EDGE_PATH% SET EDGE_PATH="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
IF NOT EXIST %EDGE_PATH% SET EDGE_PATH="%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

:: Find Google Chrome fallback
SET CHROME_PATH="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"

:: Launch in borderless standalone application window
IF EXIST %EDGE_PATH% (
    echo [OK] Launching via Microsoft Edge Native WebView Engine...
    start "" %EDGE_PATH% --app="%TARGET_URL%" --window-size=1440,920 --window-position=50,50 --enable-features=OverlayScrollbar
    GOTO DONE
)

IF EXIST %CHROME_PATH% (
    echo [OK] Launching via Google Chrome Desktop Engine...
    start "" %CHROME_PATH% --app="%TARGET_URL%" --window-size=1440,920 --window-position=50,50
    GOTO DONE
)

:: Fallback to default browser
echo [INFO] Launching via default Windows browser...
start "" "%TARGET_URL%"

:DONE
echo.
echo [SUCCESS] DataHub Desktop Application launched successfully!
timeout /t 2 >nul
exit /b 0
