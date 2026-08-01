# Phase 19 — Native OmegaNode Rendering

## Status
PROPOSED

## Context
Tras cerrar Phase 18, el sistema ya opera con OmegaNode como fuente de verdad canónica para edición, almacenamiento y auditoría.
Sin embargo, omega-ui-core todavía depende en partes del pipeline de render de proyecciones momentáneas y, en algunos puntos, de rastros del modelo legacy.

## Decision
`omega-ui-core` pasará a consumir `OmegaNode` de forma nativa en los renderers principales.
Las proyecciones planas quedarán eliminadas del camino crítico de render y solo podrán subsistir, si hace falta, como artefactos técnicos internos no canónicos.
No se introducirá retrocompatibilidad nueva ni se reabrirá el modelo legacy como fuente de verdad.

## Scope
- Refactor de renderers para aceptar `OmegaNode` directamente.
- Eliminación progresiva de `ManifestEntity` en rutas de render.
- Reducción del flattening del árbol a casos estrictamente técnicos.
- Alineación del viewport y canvas con el árbol canónico.

## Non-goals
- No reabrir Inspector, Clipboard u Orchestrator salvo regresión concreta.
- No redefinir el contrato UCA.
- No mantener compatibilidad legacy como objetivo.

## Consequences
- Un solo modelo vivo para edición, almacenamiento y render.
- Menor drift entre estado canónico y representación visual.
- Menos deuda de traducción y menos ruido arquitectónico.
- Más simplicidad operativa en la capa de UI.

## Done when
- Los renderers consumen `OmegaNode` nativamente.
- El render no depende de `ManifestEntity` en el camino crítico.
- El viewport puede proyectar el árbol canónico sin modelo intermedio de verdad.
- El sistema mantiene estabilidad y coherencia visual con el contrato certificado.

## Rule of thumb
> Si algo ya puede resolverse desde OmegaNode, no debe volver a pasar por el modelo legacy.
