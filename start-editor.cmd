@echo off
setlocal
cd /d "%~dp0"

set "EDITOR_URL=http://127.0.0.1:4173/editor.html"
set "HEALTH_URL=http://127.0.0.1:4173/api/health"

rem If the local service is already running, reuse it instead of starting
rem another process on the same port.
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%HEALTH_URL%' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }"
if not errorlevel 1 (
    start "" "%EDITOR_URL%"
    exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Please install Node.js first.
    pause
    exit /b 1
)

start "PersonalSite Studio Server" /min cmd /c "node scripts\studio-server.js"

rem Wait briefly for the service to become ready before opening the editor.
powershell -NoProfile -Command "$ready = $false; 1..20 | ForEach-Object { try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%HEALTH_URL%' -TimeoutSec 1; if ($response.StatusCode -eq 200) { $ready = $true; return } } catch {}; Start-Sleep -Milliseconds 250 }; if ($ready) { exit 0 }; exit 1"
if errorlevel 1 (
    echo [ERROR] The editor service did not start. Please check the server window for details.
    pause
    exit /b 1
)

start "" "%EDITOR_URL%"
exit /b 0
