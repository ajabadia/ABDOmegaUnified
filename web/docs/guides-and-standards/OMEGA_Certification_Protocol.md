# OMEGA Certification Protocol (v14.0)

Este documento establece los criterios objetivos para aceptar o rechazar un informe de auditoría industrial (Delta Report) en el ecosistema OMEGA.

## 🎯 Criterios de Aceptación (Protocolo Verde)

Acepta el delta report si se cumplen **todas** estas condiciones:

- **Estática**: TypeScript y ESLint están en estado `PASS` (Cero ruido).
- **Consolidación**: `WorkbenchContainer.tsx` figura como `PASS` (Cero dependencias híbridas).
- **Purga**: `useManifestState` no existe y no hay referencias activas a `uiLegacy`.
- **Persistencia**: El historial (Undo/Redo) sobrevive a un refresh de página (`F5`).
- **Aislamiento**: El historial y el estado sucio son estancos por documento.
- **Identidad**: El portapapeles regenera IDs únicos al pegar entre documentos.

## ⚠️ Criterios de Rechazo (Protocolo Rojo)

Rechaza el delta report si aparece cualquiera de estas señales:

- **Regresión de Tipos**: TypeScript o ESLint devuelven `FAIL`.
- **Degradación Estructural**: `WorkbenchContainer.tsx` vuelve a estado `PARTIAL`.
- **Necromancia**: Reaparece `useManifestState` o cualquier puente con el legado.
- **Amnesia**: La restauración de sesión pierde la pila de historial o mezcla documentos.
- **Corrupción de Pila**: `Redo` no se limpia tras una nueva edición o afecta al documento equivocado.

## 🔇 Gestión de Ruido de Auditoría

Trata como ruido, salvo prueba en contrario, los cambios en:
- `docs/arch-audit-report.json`
- `docs/arch-audit-report.csv`
- `omega-audit-results.log`

*Estos archivos son artefactos generados por el propio proceso de auditoría y su modificación es esperada.*

---
**Regla de Oro**: Todo verde + Sin legado + Historial persistente = **CERTIFICADO**.
