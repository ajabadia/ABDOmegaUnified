# TODO: Integrar Componentes Reintegrados

Los siguientes 3 componentes fueron recuperados de `legacy/` y colocados en `src/`.
Actualmente **no son importados por ningún archivo activo**. Esta guía describe
cómo integrarlos en la UI.

---

## 1. SectionAccordion — `src/components/ui/SectionAccordion.tsx`

**Props:** `{ title, icon, children, defaultOpen?, badge? }`

### Estado actual
El inspector usa `TieredSection` (`src/features/manifest-editor/components/inspector/TieredSection.tsx`),
que es más completo (niveles essential/advanced/diagnostics, estilos por nivel).
`SectionAccordion` es un acordeón genérico sin dependencias del proyecto.

### Cómo integrar
- Usarlo en paneles fuera del inspector (ej: HistoryPanel, LayersPanel)
  donde se necesita un acordeón simple sin tiering.
- **No refactorizar `TieredSection`** — tiene estilos por nivel (essential/advanced/diagnostics),
  chevron rotado y diseño visual distinto. Son componentes con responsabilidades
diferentes.

**Archivos candidatos:**
- `src/features/manifest-editor/components/inspector/HistoryPanel.tsx`
- `src/features/manifest-editor/components/inspector/LayersPanel.tsx`
- Cualquier panel que actualmente replique el patrón accordion inline

---

## 2. InspectorNav — `src/components/ui/InspectorNav.tsx`

**Props:** `{ sections: { id, label, icon, color }[], activeSection, setActiveSection }`

### Estado actual
El inspector (`PropertyPanel.tsx`) no tiene navegación por secciones — renderiza
todo el contenido del ítem seleccionado de forma continua. Los usuarios deben
scrollear para encontrar la sección que buscan.

### Cómo integrar
- Envolver `PropertyPanel.tsx` con `InspectorNav` para que las secciones
  (Identity, Aesthetics, Logic, Spatial, Engineering, Diagnostics) sean
  navegables por tabs.
- Pasar las secciones como prop desde donde se instancia `PropertyPanel`
  (actualmente en `WorkbenchInspector.tsx`).

**Archivos a modificar:**
- `src/features/manifest-editor/components/inspector/PropertyPanel.tsx` — agregar
  navegación por secciones en el header
- `src/features/manifest-editor/components/inspector/WorkbenchInspector.tsx` —
  definir la lista de secciones y pasarlas como prop

---

## 3. ReorderIndicator — `src/omega-ui-core/renderers/components/ReorderIndicator.tsx`

**Props:** `{ targetIndex, mode: 'stack-v' | 'stack-h' }`

### Estado actual
El hook `useUCADrag` (`src/omega-ui-core/renderers/hooks/useUCADrag.ts`) ya
calcula `targetIndex` durante el arrastre (línea 70: `setTargetIndex(newIndex)`).
Sin embargo, ese `targetIndex` solo se usa internamente para decidir el reorden
al soltar — **no se renderiza ningún indicador visual** durante el drag.

### Cómo integrar
- En el componente que usa `useUCADrag` (probablemente `CellNode.tsx` o
  `StructuralNode.tsx` en `src/omega-ui-core/renderers/components/`), usar
  el `targetIndex` retornado por el hook para renderizar `<ReorderIndicator>`
  como overlay cuando `targetIndex !== null`.
- Posicionar el indicador entre los hijos del contenedor según el `mode`.

**Archivos a modificar:**
- `src/omega-ui-core/renderers/components/CellNode.tsx` — renderizar
  `ReorderIndicator` condicionalmente
- `src/omega-ui-core/renderers/components/StructuralNode.tsx` — mismo caso
- Opcional: `src/omega-ui-core/renderers/utils/CellMetrics.ts` — calcular
  posición del indicador

---

## Prioridad sugerida

1. **ReorderIndicator** (alto) — La UX de drag & drop se beneficia
   inmediatamente del feedback visual. El hook ya tiene los datos.
2. **InspectorNav** (medio) — Mejora la navegabilidad del inspector sin
   cambios estructurales profundos.
3. **SectionAccordion** (bajo) — Ya existe `TieredSection` que cubre los
   casos de uso actuales. Integrar solo cuando surja la necesidad.
