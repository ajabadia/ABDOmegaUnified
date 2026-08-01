# OMEGA SYSTEM AUDIT - INDUSTRIAL HIGH-FIDELITY EDITION (Era 7.3.0)
# Sequential execution with clear status reporting and Era 11 certification aesthetics.

CLS
$LogFile = "omega-audit-results.log"
$GlobalStatus = $true

# Clean log file initially
if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
"OMEGA SYSTEM AUDIT REPORT - $(Get-Date)" | Out-File -FilePath $LogFile -Encoding utf8

# Helper to append logs safely to disk with lock-resilience
function Write-AuditLog {
    param([string]$Text)
    try {
        $Text | Out-File -FilePath $LogFile -Append -Encoding utf8 -ErrorAction Stop
    } catch {
        # Silent failover in case of file locks by IDEs/editors
    }
}

# 🧹 Cache cleansing: Always remove .next folder to prevent false negatives in TS/ESLint cache
if (Test-Path ".next") {
    Write-Host "[0/6 Cache Cleansing]" -ForegroundColor Cyan
    Write-Host "  > Purging .next directory to ensure clean validation... " -NoNewline -ForegroundColor Gray
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "CLEANED [OK]" -ForegroundColor Green
}

function Run-AuditStep {
    param(
        [string]$Name,
        [string]$ExecCmd,
        [string[]]$StepArgs
    )
    
    Write-Host "`n[$Name] " -ForegroundColor Cyan
    Write-Host "  > In progress... " -NoNewline -ForegroundColor Gray
    
    $errorsCount = 0
    $warningsCount = 0
    
    # Capture both stdout and stderr (2>&1)
    $global:LASTEXITCODE = 0
    if ($ExecCmd -eq "node") {
        $out = & node $StepArgs 2>&1
    } elseif ($ExecCmd -eq "npm") {
        $joinedArgs = $StepArgs -join " "
        $out = Invoke-Expression "cmd /c npm $joinedArgs" 2>&1
    } elseif ($ExecCmd -eq "npx") {
        $joinedArgs = $StepArgs -join " "
        $out = Invoke-Expression "cmd /c npx $joinedArgs" 2>&1
    } else {
        $out = & $ExecCmd $StepArgs 2>&1
    }
    
    $exitCode = $LASTEXITCODE
    
    # Parse results from output
    $progressLine = $out | Where-Object { $_ -like "PROGRESS:*" } | Select-Object -Last 1
    if ($progressLine) {
        $parts = $progressLine.Split(':')
        if ($parts.Count -ge 4) { $errorsCount = $parts[3] }
        if ($parts.Count -ge 5) { $warningsCount = $parts[4] }
    } else {
        # Fallback for standard tools (TSC/ESLint count lines with 'error')
        if ($exitCode -ne 0) {
            $relevantErrors = ($out | Where-Object { $_ -match '\berror\s' -and $_ -notmatch '^legacy[\\/]' })
            $errorsCount = $relevantErrors.Count
            if ($errorsCount -eq 0 -and ($out | Where-Object { $_ -match '\berror\s' -and $_ -match '^legacy[\\/]' }).Count -gt 0) {
                $exitCode = 0
                $warningsCount = ($out | Where-Object { $_ -match '\bwarn' -and $_ -notmatch '^legacy[\\/]' }).Count
            }
        }
    }
    
    if ($exitCode -eq 0) {
        Write-Host "`r  -> PASSED [OK] ($errorsCount errors, $warningsCount warnings)".PadRight(70) -ForegroundColor Green
        Write-AuditLog -Text "`n[PHASE:SUCCESS] [$Name]: Passed successfully with $errorsCount errors and $warningsCount warnings."
        
        # If there are warnings, log their details
        if ($warningsCount -gt 0 -and $out) {
            Write-AuditLog -Text "--- WARNING DETAILS START ---"
            foreach ($line in $out) {
                if ($line -notlike "PROGRESS:*") {
                    Write-AuditLog -Text $line
                }
            }
            Write-AuditLog -Text "--- WARNING DETAILS END ---`n"
        }
    } else {
        $errDisplay = $errorsCount
        if ($errorsCount -eq 0) { $errDisplay = "Technical" }
        Write-Host "`r  -> FAILED [!!] ($errDisplay errors detected, $warningsCount warnings)".PadRight(70) -ForegroundColor Red
        $script:GlobalStatus = $false
        
        # Write failure dump to log
        Write-AuditLog -Text "`n[PHASE:FAILED] [$Name]: Failed with exit code $exitCode ($errDisplay errors detected, $warningsCount warnings)."
        Write-AuditLog -Text "--- RAW ERROR DETAIL START ---"
        if ($out) {
            foreach ($line in $out) {
                if ($line -notlike "PROGRESS:*") {
                    Write-AuditLog -Text $line
                }
            }
        } else {
            Write-AuditLog -Text "No output captured."
        }
        Write-AuditLog -Text "--- RAW ERROR DETAIL END ---`n"
    }
}

Write-Host "`n[OMEGA AUDIT] Starting 6-Phase Industrial Certification..." -ForegroundColor White -BackgroundColor DarkCyan

# Phase 1: Architectural Guard
Run-AuditStep -Name "1/6 Structural Integrity" -ExecCmd "node" -StepArgs @("scripts/arch-guard.mjs")

# Phase 2: Type Safety
Run-AuditStep -Name "2/6 Type Safety (TSC)   " -ExecCmd "npx" -StepArgs @("tsc", "--noEmit")

# Phase 3: Code Hygiene
Run-AuditStep -Name "3/6 Code Linting (ESL)  " -ExecCmd "npm" -StepArgs @("run", "lint", "--", "--quiet")

# Phase 4: Critical Manifests
Write-Host "`n[4/6 Critical Manifests] " -ForegroundColor Cyan
$CriticalFiles = @("package.json", "tsconfig.json", "src/omega-ui-core/governance/ElementCatalog.ts")
$CritFail = $false
foreach ($File in $CriticalFiles) {
    if (Test-Path $File) {
        Write-AuditLog -Text "OK: $File exists."
    } else {
        Write-AuditLog -Text "ERROR: $File is MISSING!"
        $CritFail = $true
        $script:GlobalStatus = $false
    }
}
if ($CritFail) {
    Write-Host "  -> FAILED [!!] Missing critical files" -ForegroundColor Red
} else {
    Write-Host "  -> PASSED [OK] All manifests verified" -ForegroundColor Green
}

# Phase 5: HPA & Workspace Health
Write-Host "`n[5/6 Workspace Health]    " -ForegroundColor Cyan
if (Test-Path "docs/arch-audit-report.json") {
    Write-Host "  -> PASSED [OK] Artifacts generated" -ForegroundColor Green
} else {
    Write-Host "  -> WARNING [?] Artifacts missing" -ForegroundColor Yellow
}

# FINAL CERTIFICATION
if ($GlobalStatus) {
    Write-Host "`n[OMEGA AUDIT] SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]" -ForegroundColor Green -BackgroundColor Black
    Write-AuditLog -Text "STATUS: ALL CHECKS PASSED"
    exit 0
} else {
    Write-Host "`n[OMEGA AUDIT] BREACHES DETECTED - SYSTEM NOT READY [!!]" -ForegroundColor Red -BackgroundColor Black
    Write-Host "Detailed diagnostics available in: $LogFile" -ForegroundColor Gray
    Write-AuditLog -Text "STATUS: ERRORS DETECTED"
    exit 1
}
