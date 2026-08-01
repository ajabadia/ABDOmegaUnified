# OMEGA Phase Delta Report Generator
# Usage: .\generate_delta.ps1

$ErrorActionPreference = "Stop"

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "OMEGA PHASE DELTA REPORT GENERATOR" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
$gitCommit = git rev-parse --short HEAD 2>$null

$report = @"
# OMEGA Phase 14 — Industrial Delta Report
**Generated:** $timestamp
**Branch:** $gitBranch
**Commit:** $gitCommit

---

## 1. Archivos Modificados (últimas 24h)

``````
"@

# Git diff for last 24 hours
$modifiedFiles = git diff --name-status HEAD@{1.day.ago} HEAD 2>$null
if ($modifiedFiles) {
    $report += $modifiedFiles + "`n"
} else {
    $report += "(No changes detected in git history)`n"
}

$report += @"
``````

## 2. Archivos Clave Tocados

``````
"@

# Check specific critical files
$criticalFiles = @(
    "src/features/manifest-editor/hooks/useDocumentOrchestrator.ts",
    "src/features/manifest-editor/hooks/useManifestEditor.ts",
    "src/features/manifest-editor/hooks/useWorkbenchState.ts",
    "src/features/manifest-editor/hooks/entities/useEntityCRUD.ts",
    "src/features/manifest-editor/types/document.ts",
    "src/hooks/map.md"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $status = git diff --name-status HEAD@{1.day.ago} HEAD -- $file 2>$null
        if ($status) {
            $report += "✓ MODIFIED: $file`n"
        } else {
            $report += "  unchanged: $file`n"
        }
    } else {
        $report += "✗ MISSING: $file`n"
    }
}

$report += @"
``````

## 3. Legacy Purge Status

``````
"@

# Check for legacy artifacts
$legacyFiles = @(
    "src/features/manifest-editor/hooks/useManifestState.ts"
)

$purgeStatus = ""
foreach ($legacy in $legacyFiles) {
    if (Test-Path $legacy) {
        $purgeStatus += "✗ STILL EXISTS: $legacy`n"
    } else {
        $purgeStatus += "✓ DELETED: $legacy`n"
    }
}

if ($purgeStatus) {
    $report += $purgeStatus
} else {
    $report += "✓ No legacy artifacts detected`n"
}

$report += @"
``````

## 4. TypeScript & Lint Status

``````
"@

Write-Host "Running TypeScript check..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    $report += "✓ TypeScript: PASS (zero errors)`n"
} else {
    $report += "✗ TypeScript: FAIL`n"
    $report += $tscOutput + "`n"
}

Write-Host "Running ESLint..." -ForegroundColor Yellow
$lintOutput = npm run lint -- --quiet 2>&1
if ($LASTEXITCODE -eq 0) {
    $report += "✓ ESLint: PASS (zero errors)`n"
} else {
    $report += "✗ ESLint: FAIL`n"
    $report += $lintOutput + "`n"
}

$report += @"
``````

## 5. Build Verification

``````
"@

Write-Host "Running build check..." -ForegroundColor Yellow
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    $report += "✓ Build: SUCCESS`n"
} else {
    $report += "✗ Build: FAILED`n"
    $report += $buildOutput + "`n"
}

$report += @"
``````

## 6. localStorage Keys Inventory

``````
"@

# Search for localStorage usage in code
$localStorageRefs = Select-String -Path "src/**/*.ts","src/**/*.tsx" -Pattern "localStorage\.(get|set)Item" -AllMatches | 
    Select-Object -ExpandProperty Line | 
    ForEach-Object { 
        if ($_ -match "localStorage\.(get|set)Item\(['\`"]([^'\`"]+)['\`"]") {
            $matches[2]
        }
    } | 
    Select-Object -Unique

if ($localStorageRefs) {
    foreach ($key in $localStorageRefs) {
        $report += "  - $key`n"
    }
} else {
    $report += "(No localStorage usage detected)`n"
}

$report += @"
``````

## 7. Contract Alignment Check

``````
"@

# Check if DocumentOrchestrator interface matches implementation
$contractFile = "src/features/manifest-editor/types/document.ts"
$implFile = "src/features/manifest-editor/hooks/useDocumentOrchestrator.ts"

if ((Test-Path $contractFile) -and (Test-Path $implFile)) {
    $contractContent = Get-Content $contractFile -Raw
    $implContent = Get-Content $implFile -Raw
    
    $methods = @("openDocument", "closeDocument", "updateDocument", "setActiveDocument", "captureStableSnapshot", "resetDocument", "undo", "redo", "undoTo", "pushHistory")
    
    foreach ($method in $methods) {
        $inContract = $contractContent -match "$method"
        $inImpl = $implContent -match "const $method"
        
        if ($inContract -and $inImpl) {
            $report += "✓ $method: defined in both contract and implementation`n"
        } elseif ($inContract -and -not $inImpl) {
            $report += "✗ $method: MISSING in implementation`n"
        } elseif (-not $inContract -and $inImpl) {
            $report += "⚠ $method: implemented but not in contract`n"
        }
    }
} else {
    $report += "✗ Cannot verify: contract or implementation file missing`n"
}

$report += @"
``````

## 8. Smoke Tests (Manual Checklist)

Mark with [x] when verified:

- [ ] **Clipboard Cross-Doc**: Copy entity from Doc A → Paste in Doc B → ID regenerated
- [ ] **Session Restore**: Open 3 tabs across 2 docs → split pane → refresh → exact restoration
- [ ] **Reset Document**: Trigger reset on dirty doc → reverts to DEFAULT_MANIFEST
- [ ] **Zero Legacy**: Search bundle for useManifestState → zero references
- [ ] **Memory Cleanup**: Open/close 5+ docs → no residual state in devtools

## 9. Known Issues / TODOs

(Add manually before submission)

- 

## 10. Questions for Review

(Add manually before submission)

- 

---

## Certification Checklist

Before requesting full bundle review:

- [ ] All TypeScript errors resolved
- [ ] All ESLint errors resolved
- [ ] Build passes cleanly
- [ ] All smoke tests passed
- [ ] Contract alignment verified
- [ ] Legacy artifacts purged
- [ ] localStorage keys documented
- [ ] No open structural TODOs in core hooks

**Ready for bundle generation:** YES / NO

---

*This report was auto-generated. Add manual smoke test results and questions before sharing.*
"@

# Save report
$outputPath = "delta_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
$report | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 69) -ForegroundColor Green
Write-Host "✓ Delta report generated: $outputPath" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Green
Write-Host ""
Write-Host "Copy the content and paste it for review." -ForegroundColor Cyan
Write-Host ""

# Auto-open in default editor
if (Test-Path $outputPath) {
    Start-Process $outputPath
}
