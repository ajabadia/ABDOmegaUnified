# OMEGA Manifest Editor — Project Roadmap

> **Current version:** v9.9.4 · **Updated:** 2026-06-17

---

## ✅ Completed Features (P1–P9 + P11)

| Prioridad | Feature | Versión | Esfuerzo | Impacto | Estado |
|:---------:|---------|:-------:|:--------:|:-------:|:------:|
| **P1** | 🍞 **Toast Notification System** | v9.3.3 | 🟢 Bajo | 🟢 Alto | ✅ Completado |
| **P2** | 🔍 **Command Palette (Ctrl+K)** | v9.4.0 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P3** | 📊 **Status Bar (dirty/validación)** | v9.8.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P4** | 🎓 **Onboarding Walkthrough** | v9.8.0 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P5** | 🖼️ **Mini-Map del Rack** | v9.3.3 | 🟡 Medio | 🟢 Alto | ✅ Completado |
| **P6** | ⏪ **Undo Timeline Visual** | v9.9.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P7** | 🎨 **Temas Visuales (Amber/Cyberpunk/High Contrast)** | v9.8.1 | 🟢 Bajo | 🟡 Medio | ✅ Completado |
| **P8** | 🔧 **Floating Toolbar Customizable** | v9.9.0 | 🟡 Medio | 🟡 Medio | ✅ Completado |
| **P9** | 📐 **Resizable Panels** | v9.9.0 | 🔴 Alto | 🟢 Alto | ✅ Completado |
| **P11** | 🔌 **Pipeline de Integridad WASM & Contratos** | — | 🔴 Alto | 🟢 Alto | ✅ Completado |

### Resumen por Era

| Era | Versiones | Features clave |
|:----|:---------:|:---------------|
| **9.9.x** | 9.9.0–9.9.1 | Resizable Panels (P9), Floating Toolbar Customizable (P8), Undo Timeline Visual (P6), UI Cleanup (audit/shortcuts/overlay reducción) |
| **9.8.x** | 9.8.0–9.8.1 | Status Bar (P3), Onboarding Walkthrough (P4), 3 Temas Visuales (P7), ThemeSelector dropdown |
| **9.7.x** | 9.7.0 | Alignment Shortcuts UI/UX, Ctrl+Alt+E Distribute Both Axes, Ctrl+Shift+A Window toggle, 49/49 shortcuts audit, MenuBar priority indicators |
| **9.6.x** | 9.6.0–9.6.1 | Visual Modulation Matrix, Virtual Scrolling LayersPanel, Ctrl+Shift+E CellStudio shortcut, LayersPanel TS fix |
| **9.5.x** | 9.5.0 | DockIconBar/DockPanelHeader/ToolbarIconButton refactors — 5 componentes reutilizables extraídos, ~60 tests |
| **9.4.x** | 9.4.0 | Command Palette (P2), Ctrl+K badge, 35 tests |
| **9.3.x** | 9.3.2–9.3.3 | Toast System (P1), Mini-Map clamping (P5), Bug fixes, Ghost Preview, E2E stability |
| **9.2.x** | 9.2.0 | Container Format (.omega), JUCE pipeline, Batch actions, Groups, Layers Panel jerárquico, Simulaciones dinámicas |

### Refactors Estructurales

| Componente | Descripción | Tests |
|:-----------|:------------|:-----:|
| **DockIconBar** | Unifica DockIconStrip + DockRackSectionToolbar en un solo componente genérico con grupos | 30 |
| **DockPanelHeader** | Header reutilizable extraído de DockPanel con variants default/subtle | 10 |
| **ToolbarIconButton** | Botón genérico con size/colorVariant — 11/11 botones de Toolbar migrados | 31 |
| **ShortcutBadge** | Extraído de 9 instancias inline en WorkbenchFooter a componente standalone (3 estados) | — |
| **ModalCloseButton** | 10 botones inline de cierre → componente reutilizable | — |
| **ModalActionButton** | 7 botones de acción secundaria → componente reutilizable | — |
| **~10 hooks extraídos** | useBatchHistory, useLayerFilters, useRackSections, useTabDiagnostics, useEntityCrud, useExportOperations, useBatchUngroup, useFileDrop, useCellBlueprint, useGroupBlueprint | 136 |

### UI Cleanup (v9.9.1)

| Acción | Justificación |
|:-------|:--------------|
| ❌ **Audit button eliminado de floating toolbar** | Redundante: Compliance ya en DockIconStrip (Shield), Window menu (Ctrl+Shift+A), ComplianceBadge en Header |
| ❌ **5 ShortcutBadge duplicados eliminados** | Mini iconos (Orbital/Rack/Source/History/Mini Map) ya tenían botones equivalentes; shortcuts movidos a tooltip |
| ❌ **Engine info overlay de Orbital view** | Texto decorativo sin funcionalidad (versión engine, modo, conteo) |
| 🔀 **Compliance Report movido de Help a Window** | Era deprecated en Help; ahora toggle legítimo en Window consistente con Layers/Blueprints |

---

## 🚀 Próximas Direcciones — Priorizadas

| Prioridad | Mejora | Esfuerzo | Impacto | Descripción |
|:---------:|--------|:--------:|:-------:|-------------|
| **P10** | ♿ **Accesibilidad WCAG AA** | 🔴 Alto | 🟢 Alto | Auditoría de contraste, roles semánticos, navegación por teclado, live regions. **v9.9.2:** skip-to-content, focus-visible rings, landmark roles, focus trapping, contraste SC 1.4.3/1.4.11, menubar/toolbar keyboard nav. ✅ **v9.9.3–v9.9.4:** keyboard nav completado — LayersPanel (26 tests) ✅, RackMiniMap (17 tests) ✅, UndoTimelinePopover (12 tests) ✅. **v9.9.4 — Auditoría Final WCAG AA:** ✅ 47/47 unit tests, 27/27 E2E tests, 883/883 total, 0 TS errors. Todos los criterios WCAG AA aplicables implementados y verificados. |
| **P11** | 🔌 **Visual Connection Editor — SynthEdit-style** | 🟢 Bajo | 🟢 Alto | SVG overlay interactivo para crear/eliminar conexiones de modulación entre puertos en el viewport del rack. Bezier curves, drag-to-connect with snap-to-handle, ghost cable preview, click-to-delete, tooltips, connection count badges, color coding por tipo. 35 unit tests + 22 E2E tests. **Completado en fase anterior (ConnectionOverlay.tsx).** |

### Alternativas

| Opción | Esfuerzo | Impacto | Notas |
|:-------|:--------:|:-------:|-------|
| 🌐 **Internacionalización (i18n)** | 🔴 Grande | 🟡 Medio | Traducir UI a múltiples idiomas. Público técnico/ingenieril — impacto reducido. |
| 🧪 **Testing & Calidad** | 🟡 Medio | 🟢 Alto | Completar cobertura para VisualModulationMatrix y VirtualScrolling LayersPanel. E2E tests con retry logic. Retomar E2E connection-editor suite (22 tests). |
| 📐 **Diseño Responsivo** | 🟡 Medio | 🟢 Alto | Adaptar layout del workbench para pantallas pequeñas (≤1280px) con colapso automático de paneles. |

---

## 🧹 Refactoring Opportunities: Refactorización & Simplificación

| # | Oportunidad | Archivos Afectados | Líneas | Riesgo | Esfuerzo |
|:-:|------------|:------------------:|:------:|:------:|:--------:|
| **R1** | 🔴 **Consolidar `utils/` ↔ `uca/` duplicados** — 9+ pares de archivos cuasi-idénticos entre `omega-ui-core/utils/` y `omega-ui-core/uca/`. ✅ Completado (v9.9.4) | ~18 archivos | ~2,500 | Medio | Alto |
| **R2** | 🟡 **Deduplicar `design-tokens.ts`** — Dos archivos en `src/features/manifest-editor/constants/` y `src/omega-ui-core/constants/`. ✅ Completado (v9.9.4) | 2 archivos | ~60 | Bajo | Bajo |
| **R3** | 🟡 **Unificar `useDesignTokens` hooks** — ~95% idénticos. ✅ Completado (v9.9.4) | 2 archivos | ~160 | Bajo | Bajo |
| **R4** | 🟢 **ToastContainer duplicado** — `components/shared/` ahora re-exporta de `components/`. ✅ Completado (v9.9.4) | 2 archivos | ~60 | Bajo | Bajo |
| **R5** | 🟢 **34 `map.md` archivos** — Documentación de directorio que añade ruido al codebase. ✅ Completado (v9.9.4) | 34 archivos | ~3,000 | Bajo | Bajo |
| **R6** | 🟡 **CSS primitivos en `omega-ui-core/primitives/`** — 12 CSS files → 3 consolidados (controls.css, indicators.css, visuals.css). ✅ Completado (v9.9.4) | 12→3 archivos | ~850 | Bajo | Medio |

---

## 📐 Arquitectura Actual: Duplicación Estructural

```
omega-ui-core/
  utils/           ← ORIGEN (antiguo, menos completo)
    ucaBridge.ts
    treeUtils.ts
    entityToNode.ts
    circularityAuditor.ts
    ucaPathResolver.ts
    behaviorResolver.ts
    blueprintResolver.ts
    blueprintValidator.ts
    ucaInjection.ts
    ...
  uca/             ← DESTINO (más nuevo, más completo)
    ucaBridge.ts
    treeUtils.ts
    converters/entityToNode.ts
    utils/circularityAuditor.ts
    utils/ucaPathResolver.ts
    behaviorResolver.ts
    blueprintResolver.ts
    blueprintValidator.ts
    ucaInjection.ts
    ...
```

**Recomendación:** Consolidar todo en `uca/`, re-exportar desde `utils/` para retrocompatibilidad.

---

## 📊 Estado de Salud del Proyecto

| Métrica | Valor |
|:--------|:-----:|
| **TypeScript** | 0 errors |
| **ESLint** | 0 problems |
| **Jest** | **883/883 tests** (100%), 47 suites, 51 snapshots ✅ |
| **Next build** | ✅ Success |
| **P10 tests** | 47 accessibility tests (jest) + keyboard-only browser audit (✅ Pass) |
| **P11 tests** | 35 unit tests (ConnectionOverlay) ✅ + 22 E2E tests |
| **E2E** | **✅ 115/115 passing (0 failures, 0 skips)** — all 12 spec files, all tests passing ✅ |

---

*Roadmap actualizado: 2026-06-17*
