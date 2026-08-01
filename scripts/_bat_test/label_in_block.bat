@echo off
REM Fixture canonico: label de un colon dentro de bloque -> NO debe ser flaggeado
if exist "%TEMP%" (
    goto :SKIPIT
    echo never
    :SKIPIT
    echo skipped-ok
)
echo done
