# OMEGA Era 6.1 - Test Runner
# Interactive script to launch WebUI contract tests

function Show-Menu {
    Clear-Host
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "   OMEGA RPC CONTRACT TEST RUNNER - Era 6.1   " -ForegroundColor White -BackgroundColor DarkCyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1) RUN ONCE        - Execute all tests and exit"
    Write-Host "2) WATCH MODE      - Rerun tests on file changes"
    Write-Host "3) UI MODE         - Open interactive Vitest dashboard"
    Write-Host "4) CLEAN & TEST    - Reinstall dependencies and run"
    Write-Host "Q) QUIT"
    Write-Host ""
}

$UI_DIR = "$PSScriptRoot\..\ui"

do {
    Show-Menu
    $input = Read-Host "Select an option"
    
    switch ($input) {
        '1' {
            Write-Host "`n[RUNNING ONCE]..." -ForegroundColor Yellow
            npm test --prefix $UI_DIR
            Read-Host "`nPress Enter to return to menu..."
        }
        '2' {
            Write-Host "`n[STARTING WATCH MODE] (Ctrl+C to stop)..." -ForegroundColor Yellow
            npm run test:watch --prefix $UI_DIR
        }
        '3' {
            Write-Host "`n[OPENING VITEST UI]..." -ForegroundColor Yellow
            npm run test:ui --prefix $UI_DIR
        }
        '4' {
            Write-Host "`n[CLEANING & INSTALLING]..." -ForegroundColor Red
            npm install --prefix $UI_DIR
            Write-Host "[RUNNING TESTS]..." -ForegroundColor Yellow
            npm test --prefix $UI_DIR
            Read-Host "`nPress Enter to return to menu..."
        }
        'Q' { exit }
    }
} while ($true)
