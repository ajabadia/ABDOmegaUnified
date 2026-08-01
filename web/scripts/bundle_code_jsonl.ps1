param(
    [string[]]$Exclude = @(),   # carpetas/rutas adicionales a excluir (relativas al root)
    [switch]$Compact,           # modo compacto
    [switch]$NoOpen,            # no abrir automáticamente el archivo generado
    [string]$Mode               # 'total' or 'delta'
)


# OMEGA ERA 7.2.3 - INDUSTRIAL BUNDLER & AUDITOR
# This script handles both full project bundling and surgical delta reporting.


# Determine root directory based on script location (assumes scripts/ folder)
$scriptDir = $PSScriptRoot
$rootDir = (Get-Item $scriptDir).Parent.FullName


# Interactive mode if no Mode is specified
if (-not $Mode) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "          OMEGA INDUSTRIAL BUNDLER & AUDITOR        " -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "1. TOTAL BUNDLE (Full JSONL for AI Consumption)"
    Write-Host "2. DELTA REPORT (Surgical Audit & Phase 8/9 Certification)"
    $choice = Read-Host "Select execution mode [1-2]"
    if ($choice -eq "1") { $Mode = "total" }
    elseif ($choice -eq "2") { $Mode = "delta" }
    else { Write-Host "Invalid choice. Aborting."; exit }
}


$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"


if ($Mode -eq "total") {
    # --- TOTAL BUNDLE LOGIC ---

    # Ensure exports directory exists
    $exportsDir = Join-Path $rootDir "exports"
    if (-not (Test-Path $exportsDir)) {
        New-Item -ItemType Directory -Path $exportsDir | Out-Null
    }


    $jsonlFile   = Join-Path $exportsDir "project_bundle_$timestamp.jsonl"
    $metaFile    = Join-Path $exportsDir "project_metadata_$timestamp.json"
    $controlFile = Join-Path $exportsDir "CONTROL_FILESCODE_$timestamp.txt"


    # Extensions to include
    $includeExtensions = @(".js", ".ts", ".tsx", ".css", ".json", ".md", ".ps1", ".bat", ".yml", ".yaml", ".html", ".txt")
    $specificFiles = @(
        "README.md",
        ".gitignore",
        "package.json",
        "next.config.ts",
        "tailwind.config.ts"
    )


    # Folders to explicitly INCLUDE (relative to root)
    $foldersToProcess = @("app", "src", ".agent", ".brain")


    # Directories to exclude (always ignore these)
    $excludeDirsBase = @(
        "node_modules", ".next", ".git", ".vscode", "tmp", "out", "bin", "obj",
        "public", ".swc", "coverage", "test-results", ".turbo",
        ".vercel", "dist", "build", "exports", ".gemini"
    )


    $excludeDirs = New-Object System.Collections.Generic.List[string]
    [string[]]$excludeDirsBase | ForEach-Object { $excludeDirs.Add($_) }


    foreach ($ex in $Exclude) {
        if ([string]::IsNullOrWhiteSpace($ex)) { continue }
        $excludeDirs.Add($ex.Trim())
    }


    $globalSizeLimitBytes = 500KB


    Write-Host "Starting Total Bundle at $jsonlFile..." -ForegroundColor Yellow


    # Helpers
    function Get-LanguageFromExtension {
        param([string]$Extension)
        switch ($Extension.ToLower()) {
            ".html" { "html" }
            ".js"    { "javascript" }
            ".ts"    { "typescript" }
            ".tsx"   { "tsx" }
            ".css"   { "css" }
            ".json" { "json" }
            ".md"   { "markdown" }
            ".ps1"  { "powershell" }
            ".bat"  { "batch" }
            ".yml"  { "yaml" }
            ".yaml" { "yaml" }
            default { "text" }
        }
    }


    function Is-InExcludedDir {
        param(
            [string]$RelativePath,
            [System.Collections.Generic.List[string]]$ExcludeList
        )
        foreach ($ex in $ExcludeList) {
            $exNorm = $ex -replace '/', '\\'
            if ($RelativePath -like "*\\$exNorm\\*") { return $true }
            if ($RelativePath -like ".\\$exNorm\\*") { return $true }
            if ($RelativePath -like "$exNorm\\*") { return $true }
        }
        return $false
    }


    $jsonlWriter   = [System.IO.StreamWriter]::new($jsonlFile, $false, [System.Text.Encoding]::UTF8)
    $controlWriter = [System.IO.StreamWriter]::new($controlFile, $false, [System.Text.Encoding]::UTF8)


    $totalFiles       = 0
    $includedFiles    = 0


    try {
        $allFiles = @()
        foreach ($folder in $foldersToProcess) {
            $folderPath = Join-Path $rootDir $folder
            if (Test-Path $folderPath) {
                $allFiles += Get-ChildItem -Path $folderPath -Recurse -File
            }
        }


        foreach ($f in $specificFiles) {
            $fPath = Join-Path $rootDir $f
            if (Test-Path $fPath) { $allFiles += Get-Item $fPath }
        }


        $allFiles = $allFiles | Sort-Object FullName -Unique


        foreach ($item in $allFiles) {
            $filePath     = $item.FullName
            $relativePath = $filePath.Substring($rootDir.Length + 1)
            $totalFiles++


            if (Is-InExcludedDir -RelativePath $relativePath -ExcludeList $excludeDirs) {
                $controlWriter.WriteLine("$relativePath : SKIPPED_EXCLUDED_DIR")
                continue
            }


            if ($item.Length -gt $globalSizeLimitBytes) {
                $controlWriter.WriteLine("$relativePath : SKIPPED_OVER_SIZE_LIMIT")
                continue
            }


            $ext = $item.Extension.ToLower()
            $isSpecific = $specificFiles -contains $item.Name
            if (-not $isSpecific -and $includeExtensions -notcontains $ext) {
                $controlWriter.WriteLine("$relativePath : SKIPPED_BIN_OR_NOT_TEXT")
                continue
            }


            try {
                $content = [System.IO.File]::ReadAllText($filePath)
                if ([string]::IsNullOrWhiteSpace($content)) {
                    $controlWriter.WriteLine("$relativePath : EMPTY")
                    continue
                }


                $obj = [PSCustomObject]@{
                    type     = "file"
                    path     = $relativePath
                    language = Get-LanguageFromExtension $item.Extension
                    size     = $item.Length
                    content  = $content
                }


                $jsonlWriter.WriteLine(($obj | ConvertTo-Json -Depth 10 -Compress))
                $includedFiles++
                $controlWriter.WriteLine("$relativePath : OK")
                if (-not $Compact) { Write-Host "Added: $relativePath" }
            }
            catch {
                $controlWriter.WriteLine("${relativePath} : ERROR $_")
            }
        }


        Write-Host "Total Bundle Complete! Added $includedFiles files." -ForegroundColor Green

        # --- Metadata Generation ---
        $metadata = [PSCustomObject]@{
            generatedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            mode = "total"
            rootDir = $rootDir
            includedFilesCount = $includedFiles
            totalFilesScanned = $totalFiles
            excludedDirs = $excludeDirs
            timestamp = $timestamp
        }
        $metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $metaFile -Encoding UTF8
        Write-Host "Metadata generated at $metaFile" -ForegroundColor Cyan


    } finally {
        $jsonlWriter.Close()
        $controlWriter.Close()
    }

    if (-not $NoOpen) { Start-Process $jsonlFile }


} else {
    # --- DELTA REPORT LOGIC ---

    Write-Host "Generating OMEGA Delta Report..." -ForegroundColor Yellow

    Push-Location $rootDir

    # Trackers for automatic certification
    $isTscPass = $false
    $isLintPass = $false
    $isPhase8Pass = $true # Assume true, set to false if any check fails

    try {
        # Check if inside Git Repo
        git rev-parse --is-inside-work-tree *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Delta mode requires a valid Git repository at root: $rootDir" -ForegroundColor Red
            return
        }


        $gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
        $gitCommit = git rev-parse --short HEAD 2>$null


        $report = "# OMEGA Phase 14 - Industrial Delta Report`n"
        $report += "**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")`n"
        $report += "**Branch:** $gitBranch`n"
        $report += "**Commit:** $gitCommit`n`n"
        $report += "---`n`n"


        $report += "## 1. Archivos Modificados (último commit + staged)`n`n"
        $report += '```' + "`n"


        # Parent Commit Safety
        $hasParentCommit = $true
        git rev-parse --verify HEAD~1 *> $null
        if ($LASTEXITCODE -ne 0) { $hasParentCommit = $false }


        # Mostrar archivos del último commit
        $lastCommitFiles = git diff-tree --no-commit-id --name-status -r HEAD 2>$null
        if ($lastCommitFiles) {
            $report += "=== Last Commit (HEAD) ===`n"
            $report += (($lastCommitFiles | ForEach-Object { $_.ToString().TrimEnd() }) -join "`n") + "`n"
        } else {
            $report += "(No commit changes detected)`n"
        }


        # Mostrar archivos staged
        $stagedFiles = git diff --cached --name-status 2>$null
        if ($stagedFiles) {
            $report += "`n=== Staged Changes ===`n"
            $report += (($stagedFiles | ForEach-Object { $_.ToString().TrimEnd() }) -join "`n") + "`n"
        }


        # Mostrar archivos unstaged
        $unstagedFiles = git diff --name-status 2>$null
        if ($unstagedFiles) {
            $report += "`n=== Unstaged Changes ===`n"
            $report += (($unstagedFiles | ForEach-Object { $_.ToString().TrimEnd() }) -join "`n") + "`n"
        }


        $report += '```' + "`n`n"


        # --- Sección 2: Archivos clave ---
        $report += "## 2. Archivos Clave Tocados" + "`n`n" + '```' + "`n"


        $criticalFiles = @(
            "src/features/manifest-editor/hooks/useDocumentOrchestrator.ts",
            "src/features/manifest-editor/hooks/useManifestEditor.ts",
            "src/features/manifest-editor/hooks/useWorkbenchState.ts",
            "src/features/manifest-editor/hooks/entities/useEntityCRUD.ts",
            "src/features/manifest-editor/types/document.ts",
            "src/features/manifest-editor/types/history.ts",
            "src/features/manifest-editor/components/WorkbenchContainer.tsx",
            "src/hooks/map.md"
        )


        foreach ($file in $criticalFiles) {
            $fPath = Join-Path $rootDir $file
            if (Test-Path $fPath) {
                if ($hasParentCommit) {
                    $status = git diff --name-status HEAD~1 HEAD -- $fPath 2>$null
                } else {
                    $status = git diff-tree --root --no-commit-id --name-status -r HEAD -- $fPath 2>$null
                }


                if ($status -and ($status -match "^[MAD]")) { 
                    $report += "[MODIFIED] $file`n" 
                } else { 
                    $stagedStatus = git diff --cached --name-status -- $fPath 2>$null
                    $unstagedStatus = git diff --name-status -- $fPath 2>$null
                    if ($stagedStatus) { $report += "[STAGED] $file`n" }
                    elseif ($unstagedStatus) { $report += "[UNSTAGED] $file`n" }
                    else { $report += "[unchanged] $file`n" }
                }
            } else {
                $report += "[MISSING] $file`n"
            }
        }


        $report += '```' + "`n`n"


        # --- Sección 3: Phase 8 Status ---
        $report += "## 3. Phase 8 Implementation Status" + "`n`n" + '```' + "`n"


        $phase8Files = @(
            @{Path="src/features/manifest-editor/types/history.ts"; Expected=@("HistoryEntry","HistoryState")},
            @{Path="src/features/manifest-editor/hooks/useDocumentOrchestrator.ts"; Expected=@("UNDO_DOCUMENT","REDO_DOCUMENT","PUSH_HISTORY")},
            @{Path="src/features/manifest-editor/hooks/useManifestEditor.ts"; Expected=@("pushHistoryEntry","useHistoryActions")},
            @{Path="src/features/manifest-editor/hooks/useHistoryActions.ts"; Expected=@("Date.now","1000","undo","redo")},
            @{Path="src/features/manifest-editor/components/WorkbenchContainer.tsx"; Expected=@("useWorkbenchState","useManifestEditor","renderPane","useWorkbenchShortcuts")},
            @{Path="src/features/manifest-editor/hooks/useWorkbenchShortcuts.ts"; Expected=@("keydown","metaKey","ctrlKey","useWorkbenchShortcuts")}
        )


        foreach ($check in $phase8Files) {
            $fPath = Join-Path $rootDir $check.Path
            if (Test-Path $fPath) {
                $content = Get-Content $fPath -Raw
                $allFound = $true
                foreach ($token in $check.Expected) {
                    $tokenRegex = [regex]::Escape($token)
                    if ($content -notmatch $tokenRegex) {
                        $allFound = $false
                        break
                    }
                }
                if ($allFound) {
                    $report += "[PASS] $($check.Path)`n"
                } else {
                    $report += "[PARTIAL] $($check.Path)`n"
                    $isPhase8Pass = $false
                }
            } else {
                $report += "[MISSING] $($check.Path)`n"
                $isPhase8Pass = $false
            }
        }


        $report += "`n--- Legacy Purge ---`n"


        $legacyFiles = @("src/features/manifest-editor/hooks/useManifestState.ts")
        foreach ($legacy in $legacyFiles) {
            $lPath = Join-Path $rootDir $legacy
            if (Test-Path $lPath) {
                $content = Get-Content $lPath -Raw
                if ($content -match "PURGED LEGACY ARTIFACT|throw new Error") {
                    $report += "[TOMBSTONED] $legacy`n"
                } else {
                    $report += "[STILL ACTIVE] $legacy`n"
                    $isPhase8Pass = $false
                }
            } else {
                $report += "[DELETED] $legacy`n"
            }
        }


        $report += '```' + "`n`n"


        $report += "## 4. TypeScript and Lint Status" + "`n`n" + '```' + "`n"


        Write-Host "Running TypeScript check..." -ForegroundColor Yellow
        $tscOutput = npx tsc --noEmit 2>&1
        if ($LASTEXITCODE -eq 0) { 
            $report += "[PASS] TypeScript: zero errors`n" 
            $isTscPass = $true
        } else { 
            $report += "[FAIL] TypeScript: errors detected`n$tscOutput`n" 
        }


        Write-Host "Running ESLint..." -ForegroundColor Yellow
        $lintOutput = npm run lint -- --quiet 2>&1
        if ($LASTEXITCODE -eq 0) { 
            $report += "[PASS] ESLint: zero errors`n" 
            $isLintPass = $true
        } else { 
            $report += "[FAIL] ESLint: errors detected`n$lintOutput`n" 
        }


        $report += '```' + "`n`n"


        $report += "## 5. localStorage Keys Inventory" + "`n`n"


        # OMEGA ERA 7.2.3 - Industrial Storage Detection
        # Detects both literals: localStorage.getItem('key') 
        # and constants: localStorage.getItem(STORAGE_KEYS.SESSION_DOCS)
        $lsPattern = 'localStorage\.(getItem|setItem|removeItem)\(([''"]([^''"]+)[''"]|STORAGE_KEYS\.([A-Z_]+))\)'
        $localStorageKeys = Get-ChildItem -Path (Join-Path $rootDir "src") -Include *.ts,*.tsx,*.js,*.jsx -Recurse |
            Select-String -Pattern $lsPattern -AllMatches |
            ForEach-Object {
                foreach ($m in $_.Matches) { 
                    if ($m.Groups[3].Value) { $m.Groups[3].Value } # Literal
                    else { $m.Groups[4].Value } # STORAGE_KEYS constant
                }
            } | Sort-Object -Unique


        if ($localStorageKeys) {
            foreach ($key in $localStorageKeys) { $report += "  - $key`n" }
        } else {
            $report += "(No localStorage usage detected)`n"
        }


        $report += "`n" + "## 6. Contract Alignment Check" + "`n`n"


        $contractFile = Join-Path $rootDir "src/features/manifest-editor/types/document.ts"
        $implFile = Join-Path $rootDir "src/features/manifest-editor/hooks/useDocumentOrchestrator.ts"


        if ((Test-Path $contractFile) -and (Test-Path $implFile)) {
            $contractContent = Get-Content $contractFile -Raw
            $implContent = Get-Content $implFile -Raw
            $methods = @("openDocument", "closeDocument", "updateDocument", "setActiveDocument", "captureStableSnapshot", "resetDocument", "undo", "redo", "undoTo", "pushHistory")
            foreach ($method in $methods) {
                $inContract = $contractContent -match $method
                $inImpl = $implContent -match "const $method"
                if ($inContract -and $inImpl) { $report += "[ALIGNED] $method`n" }
                elseif ($inContract) { $report += "[MISSING] $method in implementation`n" }
                else { $report += "[EXTRA] $method implemented but not in contract`n" }
            }
        }


        $report += "`n" + "## 7. Smoke Tests (Manual Checklist)" + "`n`n"
        $report += "- [ ] **Clipboard Cross-Doc**: Copy A -> Paste B (ID regenerated)`n"
        $report += "- [ ] **Session Restore**: Multi-tab + split + refresh restoration`n"
        $report += "- [ ] **Reset Document**: Factory reset clears dirty state`n"
        $report += "- [ ] **Undo/Redo**: History navigation works correctly`n"
        $report += "- [ ] **Zero Legacy**: No active references to useManifestState`n"
        
        $report += "`n" + "## 8. Recent Commits" + "`n`n" + '```' + "`n"
        $recentCommits = git log --oneline -n 5 2>$null
        if ($recentCommits) {
            $report += (($recentCommits | ForEach-Object { $_.ToString().TrimEnd() }) -join "`n") + "`n"
        } else {
            $report += "(No git history available)`n"
        }
        $report += '```' + "`n`n"
        
        # --- CERTIFICACIÓN AUTOMÁTICA ---
        $readyForPhase9 = $isTscPass -and $isLintPass -and $isPhase8Pass
        $certStatus = if ($readyForPhase9) { "✅ YES" } else { "⚠️ NO" }
        
        $report += "---`n"
        $report += "## 🎯 Phase 14 Certification Status`n`n"
        $report += "**Ready for Phase 14 Deployment:** $certStatus`n`n"
        
        if ($readyForPhase9) {
            $report += "All critical systems verified:`n"
            $report += "- ✅ Phase 8 History Engine implementation complete`n"
            $report += "- ✅ Legacy artifacts properly tombstoned`n"
            $report += "- ✅ Zero TypeScript/ESLint errors`n"
            $report += "`nSystem status: **SYS_READY_FOR_PHASE_14_CALIBRATION**`n"
        } else {
            $report += "Issues detected - resolve before Phase 14:`n"
            if (-not $isPhase8Pass) { $report += "- ❌ Phase 14 architectural requirements incomplete`n" }
            if (-not $isTscPass) { $report += "- ❌ TypeScript errors present`n" }
            if (-not $isLintPass) { $report += "- ❌ ESLint violations detected`n" }
        }


        $exportsDir = Join-Path $rootDir "exports"
        if (-not (Test-Path $exportsDir)) { New-Item -ItemType Directory -Path $exportsDir | Out-Null }
        
        # --- Metadata JSON Generation ---
        $metaFile = Join-Path $exportsDir "delta_metadata_$timestamp.json"
        $metadata = [PSCustomObject]@{
            generatedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            mode = "delta"
            branch = $gitBranch
            commit = $gitCommit
            phase8Complete = $isPhase8Pass
            tscPass = $isTscPass
            lintPass = $isLintPass
            readyForPhase9 = $readyForPhase9
            timestamp = $timestamp
        }
        $metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $metaFile -Encoding UTF8
        
        $outputPath = Join-Path $exportsDir "delta_report_$timestamp.md"
        $report | Out-File -FilePath $outputPath -Encoding UTF8
        
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "Delta Report: $outputPath" -ForegroundColor Green
        Write-Host "Metadata JSON: $metaFile" -ForegroundColor Cyan
        Write-Host "Phase 9 Ready: $certStatus" -ForegroundColor $(if ($readyForPhase9) { "Green" } else { "Yellow" })
        Write-Host "========================================`n" -ForegroundColor Cyan
        
        if (-not $NoOpen) { Start-Process $outputPath }
    }
    finally {
        Pop-Location
    }
}
