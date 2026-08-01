@echo off
set MODULE_DIR=d:\desarrollos\ABDOmega plugins\modules\omega_lab_monitor
set DIST_DIR=d:\desarrollos\ABDOmega plugins\dist
set PACKAGE_NAME=omega_lab_monitor_v1.0.0.acepack

echo [PACK] Creating industrial package for OMEGA LAB MONITOR...
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

powershell -NoProfile -Command "$files = @('%MODULE_DIR%\omega_lab_monitor.wasm', '%MODULE_DIR%\omega_lab_monitor.acemm', '%MODULE_DIR%\module_logo.svg'); Compress-Archive -Path $files -DestinationPath '%DIST_DIR%\temp.zip' -Force; if (Test-Path '%DIST_DIR%\temp.zip') { Move-Item -Path '%DIST_DIR%\temp.zip' -Destination '%DIST_DIR%\%PACKAGE_NAME%' -Force; Write-Host '[SUCCESS] Package created.' } else { Write-Error '[FAIL] Zip was not created.' }"

pause
