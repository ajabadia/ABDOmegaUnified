@echo off
REM Fixture canonico: REM dentro de bloque (forma canonica) -> NO debe ser flaggeado
if exist "%TEMP%" (
    REM comment inside block (correct)
    echo inside-block
)
echo done
