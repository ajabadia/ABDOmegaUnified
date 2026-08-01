# E2E Smoke Testing Instructions

Este documento detalla los pasos para ejecutar la suite de pruebas automatizadas de la Fase 6.

## Requisitos Previos

Asegúrate de que el servidor de desarrollo esté corriendo en el puerto **3100**:
```powershell
# En una terminal
npm run dev -- -p 3100
```

## Configuración Inicial

Si es la primera vez que ejecutas los tests, instala las dependencias de Playwright:

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

## Ejecución de Tests

### 1. Modo Consola (Recomendado para reporte rápido)
Ejecuta todos los tests en modo headless y genera un reporte HTML:

```powershell
npm run test:e2e
```

### 2. Modo UI (Recomendado para debugging visual)
Abre la interfaz interactiva de Playwright para ver los tests ejecutándose paso a paso:

```powershell
npm run test:e2e:ui
```

## Cobertura de Tests

La suite `e2e/smoke-tests.spec.ts` cubre:

1.  **Flow 1**: Ciclo completo de *Dirty State* (Editar -> Badge -> Guardar -> Clean).
2.  **Flow 2**: Sincronización visual (*Rack Selection* -> *Source Highlight*).
3.  **Flow 3**: Diagnósticos cruzados (Error en código -> Badge diagnóstica -> Tooltip).
4.  **Flow 4**: Seguridad del Navegador (*beforeunload* al cerrar con cambios).
5.  **Flow 5**: Seguridad del Workbench (*Reset Guard* al reiniciar con cambios).

## Reporte de Resultados

Por favor, tras ejecutar los tests, indícame:
- ¿Cuántos pasaron satisfactoriamente? (ej. 5/5 PASS)
- Si hubo fallos, copia el error de la consola o adjunta una captura del reporte generado en `playwright-report/index.html`.
