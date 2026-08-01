#Requires -Version 5.1

# OMEGA CODEBASE DOCUMENTER - Interactive Launcher
# Ofrece dos modos:
#   1. Documentar archivos pendientes (en lotes configurables)
#   2. Verificar documentacion (ejecuta audit-docs.mjs)
#
# Uso: .\documentar_lote.ps1

param([switch]$Help)

if ($Help) {
    Write-Host ""
    Write-Host "=== OMEGA DOCUMENT BATCH LAUNCHER ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\documentar_lote.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Menu interactivo:" -ForegroundColor Yellow
    Write-Host "  1 - Documentar archivos pendientes" -ForegroundColor Gray
    Write-Host "  2 - Verificar documentacion (audit)" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# --- Cargar variables del entorno desde .env ---
function Load-Env {
    $envPath = Join-Path $PWD ".env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line.Split("=", 2)
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim("'").Trim('"')
                [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}
Load-Env

## --- Configurar Proveedor y Modelos Activos ---
$activeProvider = "Ollama"
$activeCoderModel = if ($env:LLM_MODEL_CODER) { $env:LLM_MODEL_CODER } else { "qwen2.5-coder:7b" }
$activeTranslatorModel = if ($env:LLM_MODEL_TRANSLATOR) { $env:LLM_MODEL_TRANSLATOR } else { "llama3.2" }
$activeSingleModel = if ($env:LLM_MODEL) { $env:LLM_MODEL } else { "llama3.1:8b-instruct-q4_0" }
$activeEndpoint = if ($env:LLM_ENDPOINT) { $env:LLM_ENDPOINT } else { "http://localhost:11434" }
$usePipeline = if ($env:USE_PIPELINE) { $env:USE_PIPELINE -eq "true" } else { $true }

# Detectar si se debe usar algun proveedor en la nube
if (-not [string]::IsNullOrWhiteSpace($env:GROQ_API_KEY)) {
    $activeProvider = "Groq"
    $activeCoderModel = "llama-3.3-70b-versatile"
    $activeTranslatorModel = "llama-3.1-8b-instant"
    $activeSingleModel = "llama-3.3-70b-versatile"
    $activeEndpoint = "https://api.groq.com/openai/v1"
} elseif (-not [string]::IsNullOrWhiteSpace($env:GEMINI_API_KEY)) {
    $activeProvider = "Gemini"
    $activeCoderModel = "gemini-2.5-flash"
    $activeTranslatorModel = "gemini-2.5-flash"
    $activeSingleModel = "gemini-2.5-flash"
    $activeEndpoint = "https://generativelanguage.googleapis.com"
} elseif (-not [string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)) {
    $activeProvider = "OpenRouter"
    $activeCoderModel = "qwen/qwen-2.5-coder-32b-instruct"
    $activeTranslatorModel = "google/gemma-2-9b-it:free"
    $activeSingleModel = "google/gemma-2-9b-it:free"
    $activeEndpoint = "https://openrouter.ai/api/v1"
}

# --- Funciones auxiliares ---

function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  OMEGA - DOCUMENTACION DE CODIGO" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Proyecto:   $PWD" -ForegroundColor Gray
    Write-Host "  Proveedor:  $activeProvider" -ForegroundColor Gray
    Write-Host "  Endpoint:   $activeEndpoint" -ForegroundColor Gray
    if ($usePipeline) {
        Write-Host "  Modelos:    Coder: $activeCoderModel | Translator: $activeTranslatorModel" -ForegroundColor Gray
    } else {
        Write-Host "  Modelo:     Single: $activeSingleModel" -ForegroundColor Gray
    }
    Write-Host ""
}

function Get-CodebaseStatus {
    Write-Host "  Escaneando firmas de la base de codigo (Pre-audit)..." -ForegroundColor DarkGray
    $statusJson = node scripts/document-codebase.mjs --status 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $statusJson) {
        Write-Host "  [ADVERTENCIA] Fallo el pre-audit. Usando estimaciones..." -ForegroundColor Yellow
        return @{ ok = 0; drift = 0; stale = 0; missing = 443 }
    }
    return $statusJson | ConvertFrom-Json
}

function Show-Dashboard {
    param($Status)
    $totals = $Status.totals
    if (-not $totals) {
        $totals = $Status # Fallback if totals doesn't exist
    }
    $total = $totals.ok + $totals.drift + $totals.stale + $totals.missing
    if ($total -eq 0) { $total = 443 }
    $pct = [Math]::Round(($totals.ok / $total) * 100, 1)

    Write-Host "  === ESTADO GLOBAL DE DOCUMENTACION ===" -ForegroundColor Yellow
    Write-Host "    [OK]      Al dia:           $($totals.ok) / $total ($pct%)" -ForegroundColor Green
    Write-Host "    [DRIFT]   Modificados:      $($totals.drift) archivos" -ForegroundColor Red
    Write-Host "    [STALE]   Firma heredada:   $($totals.stale) archivos" -ForegroundColor Cyan
    Write-Host "    [MISSING] Sin documentar:   $($totals.missing) archivos" -ForegroundColor Yellow
    Write-Host ""
    
    if ($Status.modules) {
        Write-Host "  === DESGLOSE POR MODULOS DEL PROYECTO ===" -ForegroundColor Yellow
        foreach ($modName in $Status.modules.PSObject.Properties.Name) {
            $mod = $Status.modules.$modName
            $modPct = [Math]::Round(($mod.ok / $mod.total) * 100, 0)
            
            $driftStr = if ($mod.drift -gt 0) { "$($mod.drift) modif" } else { "" }
            $staleStr = if ($mod.stale -gt 0) { "$($mod.stale) hered" } else { "" }
            $missingStr = if ($mod.missing -gt 0) { "$($mod.missing) sin doc" } else { "" }
            
            $alerts = @()
            if ($driftStr) { $alerts += $driftStr }
            if ($staleStr) { $alerts += $staleStr }
            if ($missingStr) { $alerts += $missingStr }
            $alertMsg = if ($alerts.Count -gt 0) { "(" + ($alerts -join ", ") + ")" } else { "(Al dia)" }
            
            $color = if ($mod.missing -gt 0) { "Yellow" } elseif ($mod.drift -gt 0) { "Red" } elseif ($mod.stale -gt 0) { "Cyan" } else { "Green" }
            
            $paddedName = $modName.PadRight(40)
            Write-Host "    $paddedName : $($mod.ok)/$($mod.total) [$modPct%] " -NoNewline -ForegroundColor Gray
            Write-Host $alertMsg -ForegroundColor $color
        }
        Write-Host ""
    }
}

function Test-OllamaRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Ensure-Ollama {
    if (Test-OllamaRunning) { return $true }
    
    Write-Host "[INFO] Ollama no esta ejecutandose. Intentando iniciar..." -ForegroundColor Yellow
    
    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaCmd) {
        Start-Process ollama -ErrorAction SilentlyContinue
        Write-Host "  Esperando a que Ollama responda (max 10s)..." -NoNewline -ForegroundColor Gray
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 1
            Write-Host "." -NoNewline -ForegroundColor Gray
            if (Test-OllamaRunning) {
                Write-Host " OK!" -ForegroundColor Green
                Write-Host ""
                return $true
            }
        }
        Write-Host ""
    }
    
    Write-Host "[ADVERTENCIA] No se pudo iniciar Ollama automaticamente." -ForegroundColor Red
    Write-Host "  Por favor, abre la aplicacion Ollama y presiona Enter para reintentar..." -ForegroundColor Yellow
    $null = Read-Host
    
    if (Test-OllamaRunning) {
        return $true
    } else {
        Write-Host "[ERROR] Ollama sigue sin responder. El script se cerrara." -ForegroundColor Red
        return $false
    }
}

function Get-OllamaModels {
    try {
        $data = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        return $data.models.name
    } catch {
        return @()
    }
}

function Check-And-Pull-Models {
    param(
        [string]$CoderModel,
        [string]$TranslatorModel,
        [string]$SingleModel,
        [bool]$UsePipeline
    )
    
    $installed = Get-OllamaModels
    if ($installed.Count -eq 0) { return }
    
    $modelsToCheck = @()
    if ($UsePipeline) {
        $modelsToCheck += $CoderModel
        $modelsToCheck += $TranslatorModel
    } else {
        $modelsToCheck += $SingleModel
    }
    
    foreach ($model in $modelsToCheck) {
        $matched = $installed | Where-Object { $_ -eq $model -or $_ -eq "$model:latest" -or "$_:latest" -eq $model }
        if (-not $matched) {
            Write-Host "[INFO] El modelo '$model' no esta instalado en Ollama." -ForegroundColor Yellow
            $confirm = Read-Host "  ¿Deseas descargarlo automaticamente ahora? (S/n)"
            if ($confirm -eq "" -or $confirm -eq "s" -or $confirm -eq "S") {
                Write-Host "  Descargando '$model'... Esto puede tardar varios minutos." -ForegroundColor Cyan
                & ollama pull $model
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  [OK] Modelo '$model' instalado con exito." -ForegroundColor Green
                } else {
                    Write-Host "  [ERROR] Fallo la descarga de '$model'." -ForegroundColor Red
                }
            } else {
                Write-Host "  [ADVERTENCIA] Continuando sin instalar. El script podria fallar si el modelo no existe." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            }
        }
    }
}

# --- Validar que el plan existe ---
$planPath = Join-Path $PWD "LLM_DOCUMENTATION_PLAN.md"
if (-not (Test-Path $planPath)) {
    Write-Host "[ERROR] No se encuentra LLM_DOCUMENTATION_PLAN.md" -ForegroundColor Red
    Write-Host "Ejecuta el script desde la raiz del proyecto." -ForegroundColor Yellow
    exit 1
}

# --- Validacion inicial de backend (Solo si el proveedor activo es Ollama) ---
if ($activeProvider -eq "Ollama") {
    $ollamaReady = Ensure-Ollama
    if (-not $ollamaReady) {
        exit 1
    }
    Check-And-Pull-Models -CoderModel $activeCoderModel -TranslatorModel $activeTranslatorModel -SingleModel $activeSingleModel -UsePipeline $usePipeline
}

# --- Bucle principal ---
do {
    Show-Header
    $status = Get-CodebaseStatus
    Clear-Host
    Show-Header
    Show-Dashboard -Status $status

    Write-Host "  Selecciona una opcion:" -ForegroundColor White
    Write-Host "    [1] Documentar archivos NUEVOS (MISSING)       $($status.totals.missing) pendientes" -ForegroundColor Green
    Write-Host "    [2] Re-documentar archivos MODIFICADOS (DRIFT) $($status.totals.drift) pendientes" -ForegroundColor Red
    Write-Host "    [3] Firmar archivos HEREDADOS (STALE) [No LLM] $($status.totals.stale) pendientes" -ForegroundColor Cyan
    Write-Host "    [4] Gestionar modelos de Ollama (Actualizar/Ver)" -ForegroundColor Yellow
    Write-Host "    [5] Generar reporte completo (drift_report.md)" -ForegroundColor Yellow
    Write-Host "    [6] Listar candidatos a refactorizar (Archivos > 3KB)" -ForegroundColor Yellow
    Write-Host "    [7] Regenerar grafos de dependencia (Obsidian)" -ForegroundColor Green
    Write-Host "    [8] Salir" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "  Opcion (1-8)"
    Write-Host ""

    switch ($choice) {
        { $_ -in "1", "2", "3" } {
            $modeName = ""
            $remainingNow = 0
            if ($choice -eq "1") {
                $env:PROCESS_MODE = "MISSING"
                $modeName = "NUEVOS (MISSING)"
                $remainingNow = $status.totals.missing
            } elseif ($choice -eq "2") {
                $env:PROCESS_MODE = "DRIFT"
                $modeName = "MODIFICADOS (DRIFT)"
                $remainingNow = $status.totals.drift
            } elseif ($choice -eq "3") {
                $env:PROCESS_MODE = "STALE"
                $modeName = "HEREDADOS (STALE)"
                $remainingNow = $status.totals.stale
            }

            if ($remainingNow -eq 0) {
                Write-Host "  No quedan archivos en la categoria $modeName por procesar!" -ForegroundColor Green
                Write-Host ""
                Write-Host "  Presiona Enter para continuar..." -NoNewline
                $null = Read-Host
                continue
            }

            Write-Host "  Quedan $remainingNow archivos de tipo $modeName por procesar." -ForegroundColor Yellow
            Write-Host ""

            # Preguntar tamano de lote
            $defaultBatch = "40"
            if ($choice -eq "3") { $defaultBatch = "100" }
            do {
                $batchInput = Read-Host "  Archivos por lote (default $defaultBatch, max 100)"
                if ([string]::IsNullOrWhiteSpace($batchInput)) { $batchInput = $defaultBatch }
                $batchSize = 0
                [void][int]::TryParse($batchInput, [ref]$batchSize)
                if ($batchSize -lt 1 -or $batchSize -gt 100) {
                    Write-Host "  El numero debe estar entre 1 y 100." -ForegroundColor Red
                }
            } while ($batchSize -lt 1 -or $batchSize -gt 100)

            Write-Host ""

            # Preguntar cuantos ciclos
            $defaultCycles = "1"
            if ($choice -eq "3") { 
                $defaultCycles = [Math]::Ceiling($remainingNow / $batchSize).ToString()
            }
            do {
                $cyclesInput = Read-Host "  Ciclos (default $defaultCycles, cada ciclo procesa $batchSize archivos)"
                if ([string]::IsNullOrWhiteSpace($cyclesInput)) { $cyclesInput = $defaultCycles }
                $cycles = 0
                [void][int]::TryParse($cyclesInput, [ref]$cycles)
                if ($cycles -lt 1) {
                    Write-Host "  Debe ser al menos 1." -ForegroundColor Red
                }
            } while ($cycles -lt 1)

            $totalToProcess = $batchSize * $cycles
            if ($totalToProcess -gt $remainingNow) {
                $cycles = [Math]::Ceiling($remainingNow / $batchSize)
                $totalToProcess = $batchSize * $cycles
                Write-Host ""
                Write-Host "  Solo quedan $remainingNow pendientes. Ajustado a $cycles ciclos." -ForegroundColor Yellow
            }

            Write-Host ""
            if ($choice -eq "3") {
                Write-Host "  Se actualizaran $totalToProcess archivos en $cycles ciclos de $batchSize c/u (Rapido, sin LLM)." -ForegroundColor White
            } else {
                Write-Host "  Se procesaran $totalToProcess archivos en $cycles ciclos de $batchSize c/u." -ForegroundColor White
                Write-Host "  Modelos: Coder: $activeCoderModel | Translator: $activeTranslatorModel" -ForegroundColor Gray
            }
            Write-Host ""

            $confirm = Read-Host "  Confirmar? (s/N)"
            if ($confirm -ne "s" -and $confirm -ne "S") {
                Write-Host "  Cancelado." -ForegroundColor Gray
                Write-Host ""
                Write-Host "  Presiona Enter para continuar..." -NoNewline
                $null = Read-Host
                continue
            }

            Write-Host ""

            # Ejecutar ciclos
            $totalProcessed = 0
            for ($i = 1; $i -le $cycles; $i++) {
                $statusBefore = Get-CodebaseStatus
                $remainingBatch = 0
                if ($choice -eq "1") { $remainingBatch = $statusBefore.totals.missing }
                elseif ($choice -eq "2") { $remainingBatch = $statusBefore.totals.drift }
                elseif ($choice -eq "3") { $remainingBatch = $statusBefore.totals.stale }

                if ($remainingBatch -eq 0) {
                    Write-Host "  No quedan mas archivos por procesar. Ciclo interrumpido." -ForegroundColor Green
                    break
                }

                Write-Host "------------------------------------------" -ForegroundColor DarkGray
                Write-Host "  Ciclo $i de $cycles (lote de $batchSize)" -ForegroundColor Green
                Write-Host "------------------------------------------" -ForegroundColor DarkGray
                Write-Host ""

                $env:BATCH_LIMIT = "$batchSize"

                try {
                    & node scripts/document-codebase.mjs
                    if ($LASTEXITCODE -ne 0) {
                        Write-Host "  [ADVERTENCIA] El ciclo $i finalizo con codigo $($LASTEXITCODE)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "  [ERROR] No se pudo ejecutar el script: $_" -ForegroundColor Red
                }

                $statusAfter = Get-CodebaseStatus
                $processedThisRun = 0
                if ($choice -eq "1") { $processedThisRun = $statusBefore.totals.missing - $statusAfter.totals.missing }
                elseif ($choice -eq "2") { $processedThisRun = $statusBefore.totals.drift - $statusAfter.totals.drift }
                elseif ($choice -eq "3") { $processedThisRun = $statusBefore.totals.stale - $statusAfter.totals.stale }
                
                $totalProcessed += $processedThisRun

                Write-Host ""
                Write-Host "  Ciclo $i completado: +$processedThisRun archivos" -ForegroundColor Green
                Write-Host "  Total acumulado: +$totalProcessed archivos" -ForegroundColor Cyan
                Write-Host ""
            }

            # Resumen final
            $statusFinal = Get-CodebaseStatus
            Write-Host "==========================================" -ForegroundColor DarkGray
            Write-Host ""
            Write-Host "  Resumen final:" -ForegroundColor Cyan
            Write-Host "  Procesados en total: $totalProcessed archivos" -ForegroundColor White
            Write-Host "  Al dia (OK):         $($statusFinal.totals.ok) archivos" -ForegroundColor Green
            Write-Host "  Modificados (DRIFT): $($statusFinal.totals.drift) archivos" -ForegroundColor Red
            Write-Host "  Heredados (STALE):   $($statusFinal.totals.stale) archivos" -ForegroundColor Cyan
            Write-Host "  Pendientes (MISSING):$($statusFinal.totals.missing) archivos" -ForegroundColor Yellow
            Write-Host ""

            Write-Host "==========================================" -ForegroundColor Yellow
            Write-Host "  Proceso finalizado." -ForegroundColor Yellow
            Write-Host "==========================================" -ForegroundColor Yellow
            Write-Host ""

            $reportPath = Join-Path $PWD "docs/last_batch_run.json"
            if (Test-Path $reportPath) {
                $report = Get-Content $reportPath -Raw | ConvertFrom-Json
                Write-Host "  === METRICAS DE TIEMPO ===" -ForegroundColor Yellow
                Write-Host "    Tiempo total transcurrido : $($report.totalElapsedSeconds) segundos" -ForegroundColor Cyan
                Write-Host "    Archivos procesados       : $($report.fileCount)" -ForegroundColor Cyan
                Write-Host "    Tiempo medio por archivo  : $($report.averageSecondsPerFile) segundos" -ForegroundColor Cyan
                Write-Host ""
                
                $showDetails = Read-Host "  ¿Deseas ver el desglose detallado de los archivos? (s/N)"
                if ($showDetails -eq "s" -or $showDetails -eq "S") {
                    Write-Host ""
                    Write-Host "  === DESGLOSE DE ARCHIVOS Y TIEMPOS ===" -ForegroundColor Yellow
                    foreach ($fileObj in $report.files) {
                        $durStr = "$($fileObj.duration)s"
                        $durPadded = $durStr.PadLeft(6)
                        $statusColor = if ($fileObj.status -like "*Error*") { "Red" } elseif ($fileObj.status -like "*Kept*" -or $fileObj.status -like "*Keep*") { "Green" } else { "Cyan" }
                        
                        Write-Host "    [$durPadded] " -NoNewline -ForegroundColor Gray
                        Write-Host "$($fileObj.file.PadRight(60))" -NoNewline -ForegroundColor White
                        Write-Host " | " -NoNewline -ForegroundColor DarkGray
                        Write-Host "$($fileObj.status)" -ForegroundColor $statusColor
                        
                        if ($fileObj.isTruncated) {
                            $kb = [Math]::Round($fileObj.originalLength / 1024, 1)
                            Write-Host "                 ⚠️  [Grande - Truncado] ($kb KB, $($fileObj.originalLength) chars). Considera dividir en hooks o subcomponentes." -ForegroundColor Yellow
                        }
                        
                        if ($fileObj.details) {
                            Write-Host "                 ($($fileObj.details))" -ForegroundColor DarkGray
                        }
                    }
                    Write-Host ""
                }
            }

            Write-Host "  Presiona Enter para continuar..." -NoNewline
            $null = Read-Host
        }

        "4" {
            # --- Gestion de Modelos (Ollama / Cloud) ---
            do {
                Clear-Host
                Show-Header
                Write-Host "  === GESTION DE MODELOS ($($activeProvider.ToUpper())) ===" -ForegroundColor Yellow
                Write-Host "    [1] Buscar actualizaciones de los modelos en uso (Pull)" -ForegroundColor Cyan
                Write-Host "    [2] Descargar modelos recomendados alternativos" -ForegroundColor Green
                Write-Host "    [3] Cambiar modelos activos en la sesion" -ForegroundColor Yellow
                Write-Host "    [4] Volver al menu principal" -ForegroundColor Gray
                Write-Host ""
                
                $modelChoice = Read-Host "  Selecciona una opcion (1-4)"
                Write-Host ""
                
                switch ($modelChoice) {
                    "1" {
                        if ($activeProvider -ne "Ollama") {
                            Write-Host "  [INFO] El proveedor activo es '$activeProvider' (API en la Nube)." -ForegroundColor Yellow
                            Write-Host "  No es necesario actualizar ni descargar modelos locales para servicios Cloud." -ForegroundColor Gray
                            Write-Host ""
                            Write-Host "  Presiona Enter para continuar..." -NoNewline
                            $null = Read-Host
                            continue
                        }

                        Write-Host "  Verificando actualizaciones para los modelos..." -ForegroundColor Cyan
                        $modelsToUpdate = @()
                        if ($usePipeline) {
                            $modelsToUpdate += $activeCoderModel
                            $modelsToUpdate += $activeTranslatorModel
                        } else {
                            $modelsToUpdate += $activeSingleModel
                        }
                        
                        foreach ($model in $modelsToUpdate) {
                            Write-Host "  Actualizando '$model'..." -ForegroundColor Gray
                            & ollama pull $model
                            if ($LASTEXITCODE -ne 0) {
                                Write-Host "  [ERROR] No se pudo actualizar '$model'." -ForegroundColor Red
                                Write-Host "  Sugerencia: Verifica tu conexion a internet o si el servidor de Ollama tiene problemas de red." -ForegroundColor Yellow
                            } else {
                                Write-Host "  [OK] Modelo '$model' actualizado con exito." -ForegroundColor Green
                            }
                        }
                        Write-Host ""
                        Write-Host "  Proceso de actualizacion terminado." -ForegroundColor Gray
                        Write-Host "  Presiona Enter para continuar..." -NoNewline
                        $null = Read-Host
                    }
                    "2" {
                        if ($activeProvider -ne "Ollama") {
                            Write-Host "  [INFO] El proveedor activo es '$activeProvider' (API en la Nube)." -ForegroundColor Yellow
                            Write-Host "  Los modelos en la nube se gestionan de forma remota y estan siempre listos." -ForegroundColor Gray
                            Write-Host ""
                            Write-Host "  Presiona Enter para continuar..." -NoNewline
                            $null = Read-Host
                            continue
                        }

                        Write-Host "  Modelos recomendados para el proyecto:" -ForegroundColor Yellow
                        Write-Host "    1. qwen2.5-coder:1.5b (Super liviano, ideal para CPU)" -ForegroundColor Gray
                        Write-Host "    2. qwen2.5-coder:14b  (Calidad excelente de codigo, pesado)" -ForegroundColor Gray
                        Write-Host "    3. llama3.2:3b        (Liviano para traduccion rapida)" -ForegroundColor Gray
                        Write-Host "    4. gemma2:9b          (Razonamiento y espanol de alta calidad)" -ForegroundColor Gray
                        Write-Host "    5. gemma4:e4b         (Gemma 4 Edge - Liviano y multimodal)" -ForegroundColor Gray
                        Write-Host "    6. gemma4:12b         (Gemma 4 Dense - Alta calidad de razonamiento)" -ForegroundColor Gray
                        Write-Host ""
                        $recChoice = Read-Host "  Selecciona cual descargar (1-6) o Enter para cancelar"
                        
                        $targetRec = ""
                        if ($recChoice -eq "1") { $targetRec = "qwen2.5-coder:1.5b" }
                        elseif ($recChoice -eq "2") { $targetRec = "qwen2.5-coder:14b" }
                        elseif ($recChoice -eq "3") { $targetRec = "llama3.2:3b" }
                        elseif ($recChoice -eq "4") { $targetRec = "gemma2:9b" }
                        elseif ($recChoice -eq "5") { $targetRec = "gemma4:e4b" }
                        elseif ($recChoice -eq "6") { $targetRec = "gemma4:12b" }
                        
                        if ($targetRec -ne "") {
                            Write-Host "  Descargando '$targetRec'..." -ForegroundColor Cyan
                            & ollama pull $targetRec
                            if ($LASTEXITCODE -ne 0) {
                                Write-Host ""
                                Write-Host "  [ERROR] Fallo la descarga de '$targetRec'." -ForegroundColor Red
                                Write-Host "  Sugerencias de solucion:" -ForegroundColor Yellow
                                Write-Host "    - Comprueba tu conexion a internet." -ForegroundColor Gray
                                Write-Host "    - Verifica si hay un firewall o proxy bloqueando el puerto 443." -ForegroundColor Gray
                                Write-Host "    - Reintenta mas tarde (el servidor de almacenamiento de Ollama puede tener timeouts temporales)." -ForegroundColor Gray
                                Write-Host "    - O ejecuta manualmente: ollama pull $targetRec" -ForegroundColor Gray
                            } else {
                                Write-Host "  [OK] Modelo '$targetRec' descargado con exito." -ForegroundColor Green
                            }
                            Write-Host ""
                            Write-Host "  Presiona Enter para continuar..." -NoNewline
                            $null = Read-Host
                        }
                    }
                    "3" {
                        Write-Host "  === CAMBIAR MODELO EN SESION ===" -ForegroundColor Yellow
                        Write-Host "    [1] Cambiar Coder Model (Actual: $activeCoderModel)" -ForegroundColor Gray
                        Write-Host "    [2] Cambiar Translator Model (Actual: $activeTranslatorModel)" -ForegroundColor Gray
                        Write-Host "    [3] Cambiar Single Model (Actual: $activeSingleModel)" -ForegroundColor Gray
                        Write-Host "    [4] Alternar entre Pipeline (2 Pasos) y Directo ($usePipeline)" -ForegroundColor Gray
                        Write-Host ""
                        $changeChoice = Read-Host "  Selecciona (1-4) o Enter para cancelar"
                        
                        if ($changeChoice -eq "1") {
                            $newVal = Read-Host "  Nuevo Coder Model"
                            if (-not [string]::IsNullOrWhiteSpace($newVal)) {
                                $env:LLM_MODEL_CODER = $newVal
                                $activeCoderModel = $newVal
                                Write-Host "  Coder Model cambiado a: $activeCoderModel" -ForegroundColor Green
                            }
                        } elseif ($changeChoice -eq "2") {
                            $newVal = Read-Host "  Nuevo Translator Model"
                            if (-not [string]::IsNullOrWhiteSpace($newVal)) {
                                $env:LLM_MODEL_TRANSLATOR = $newVal
                                $activeTranslatorModel = $newVal
                                Write-Host "  Translator Model cambiado a: $activeTranslatorModel" -ForegroundColor Green
                            }
                        } elseif ($changeChoice -eq "3") {
                            $newVal = Read-Host "  Nuevo Single Model"
                            if (-not [string]::IsNullOrWhiteSpace($newVal)) {
                                $env:LLM_MODEL = $newVal
                                $activeSingleModel = $newVal
                                Write-Host "  Single Model cambiado a: $activeSingleModel" -ForegroundColor Green
                            }
                        } elseif ($changeChoice -eq "4") {
                            $usePipeline = -not $usePipeline
                            $env:USE_PIPELINE = if ($usePipeline) { "true" } else { "false" }
                            Write-Host "  Uso de pipeline cambiado a: $usePipeline" -ForegroundColor Green
                        }
                        
                        if ($changeChoice -in "1", "2", "3", "4") {
                            Write-Host "  Presiona Enter para aplicar y continuar..." -NoNewline
                            $null = Read-Host
                        }
                    }
                }
            } while ($modelChoice -ne "4")
        }

        "5" {
            # --- Modo Verificar (Audit) ---
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            Write-Host "  Ejecutando auditoria de documentacion..." -ForegroundColor Cyan
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            Write-Host ""

            try {
                & node scripts/audit-docs.mjs
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "  Auditoria completada." -ForegroundColor Green
                }
            } catch {
                Write-Host "  [ERROR] No se pudo ejecutar el audit: $_" -ForegroundColor Red
            }

            Write-Host ""
            $reportPath = Join-Path $PWD "docs/drift_report.md"
            if (Test-Path $reportPath) {
                Write-Host "  Reporte generado en: docs/drift_report.md" -ForegroundColor Cyan
            }
            Write-Host ""
            Write-Host "  Presiona Enter para continuar..." -NoNewline
            $null = Read-Host
        }

        "6" {
            # --- Buscar candidatos a refactorizar (Archivos > 3KB) ---
            Clear-Host
            Show-Header
            Write-Host "  === BUSCANDO CANDIDATOS A REFACTORIZAR (ARCHIVOS > 3KB) ===" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  Escaneando directorios 'src' y 'app'..." -ForegroundColor Gray
            Write-Host ""
            
            $largeFiles = Get-ChildItem -Path src, app -Include *.ts, *.tsx, *.js, *.jsx -Recurse -File | Where-Object { $_.Length -gt 3000 }
            
            if (-not $largeFiles) {
                Write-Host "  ¡No se encontraron archivos mayores de 3KB! Excelente estructura." -ForegroundColor Green
            } else {
                $results = @()
                $missingMetadataCount = 0
                
                foreach ($file in $largeFiles) {
                    $relPath = $file.FullName.Replace($PWD.Path + "\", "")
                    $firstLines = Get-Content -Path $file.FullName -TotalCount 30 -ErrorAction SilentlyContinue
                    $refactorable = "Sin analizar ⚠️"
                    $ageDaysStr = "-"
                    
                    if ($firstLines) {
                        $jsdocContent = $firstLines -join "`n"
                        # Match @refactorable
                        if ($jsdocContent -match '@refactorable\s+(.+)') {
                            $refactorable = $Matches[1].Trim()
                        } else {
                            $missingMetadataCount++
                        }
                        
                        # Match @lastUpdated
                        if ($jsdocContent -match '@lastUpdated\s+(.+)') {
                            $lastUpdatedStr = $Matches[1].Trim()
                            try {
                                $lastUpdatedDate = [DateTime]::Parse($lastUpdatedStr)
                                $span = [DateTime]::Now - $lastUpdatedDate
                                $days = [Math]::Floor($span.TotalDays)
                                if ($days -lt 0) { $days = 0 }
                                $ageDaysStr = "$days días"
                            } catch {
                                $ageDaysStr = "Error fecha"
                            }
                        }
                    } else {
                        $missingMetadataCount++
                    }
                    
                    $sizeKB = [Math]::Round($file.Length / 1024, 1)
                    
                    $results += [PSCustomObject]@{
                        Archivo = $relPath
                        "Tamaño (KB)" = $sizeKB
                        Refactorable = $refactorable
                        Antiguedad = $ageDaysStr
                    }
                }

                Write-Host "  Se encontraron $($largeFiles.Count) archivos grandes (>3KB)." -ForegroundColor White
                if ($missingMetadataCount -gt 0) {
                    Write-Host "  ⚠️  ¡Atención! Hay $missingMetadataCount archivo(s) grande(s) pendiente(s) de análisis." -ForegroundColor Red
                    Write-Host "      Te recomendamos ejecutar la Opción [2] (MODIFICADOS/DRIFT) para analizarlos." -ForegroundColor Yellow
                    Write-Host ""
                }
                
                $filter = Read-Host "  ¿Deseas filtrar la lista para ver solo los recomendados a refactorizar / sin analizar? (S/n)"
                $displayResults = $results
                if ($filter -eq "" -or $filter -eq "s" -or $filter -eq "S") {
                    $displayResults = $results | Where-Object { $_.Refactorable.StartsWith("true") -or $_.Refactorable -eq "Sin analizar ⚠️" }
                }
                
                Write-Host ""
                if ($displayResults.Count -eq 0) {
                    Write-Host "  No hay candidatos que coincidan con el filtro." -ForegroundColor Green
                } else {
                    $displayResults | Format-Table -AutoSize
                }
                
                Write-Host ""
                Write-Host "  ⚠️  Recomendación: Considera dividir los archivos más grandes en custom hooks" -ForegroundColor Yellow
                Write-Host "      o subcomponentes pequeños para mejorar la legibilidad y mantenimiento." -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "  Presiona Enter para volver al menu..." -NoNewline
            $null = Read-Host
        }

        "7" {
            # --- Regenerar grafos de dependencia (Obsidian) ---
            Clear-Host
            Show-Header
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            Write-Host "  Regenerando grafos de dependencia de Obsidian..." -ForegroundColor Cyan
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            Write-Host ""

            try {
                & node scripts/generate-graphs.mjs
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "  [OK] Grafos de dependencia actualizados con exito." -ForegroundColor Green
                }
            } catch {
                Write-Host "  [ERROR] No se pudo ejecutar el script: $_" -ForegroundColor Red
            }

            Write-Host ""
            Write-Host "  Presiona Enter para continuar..." -NoNewline
            $null = Read-Host
        }

        "8" {
            Write-Host "  Hasta luego!" -ForegroundColor Gray
            Write-Host ""
            exit 0
        }

        default {
            Write-Host "  Opcion no valida. Intenta de nuevo." -ForegroundColor Red
            Write-Host ""
            Start-Sleep -Milliseconds 1000
        }
    }

} while ($choice -ne "8")
