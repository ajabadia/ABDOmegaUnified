@echo off
REM Fixture canonico: '::' dentro de bloque parenthesized -> DEBE ser flaggeado (#717)
if exist "%TEMP%" (
    :: comment inside block (regresion #717)
    echo inside-block
)
echo done
