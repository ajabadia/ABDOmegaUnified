# Análisis de "Cell Editor" y "Cell Studio"

## Fecha del análisis
2026-06-03

---

## 1. Estado actual de los documentos

### docs/UNIVERSAL_CELL_ARCHITECTURE.md
| Fichero | Estado | Líneas | Nota |
|---|---|---|---|
| `UNIVERSAL_CELL_ARCHITECTURE.md` | **ACTIVE (Phase 10.2)** | 101 | Documento "fundación UCA". Define pipeline Blueprint → OmegaNode Tree → Manifest (.acemm) → Package (.acepack). Describe bridge contract, sovereign injection, reglas de override/versioning. Creado como deliverable del task "Create docs/UNIVERSAL_CELL_ARCHITECTURE.md" de CELL.MD Phase 1. |

**Análisis**: Este documento es el **eslabón que conecta** los PROPOSED/DRAFT con el código real. Está en estado ACTIVE y describe la arquitectura que el código ya implementa (ucaBridge.ts, UniversalRenderer, OmegaNode, etc.). Sin embargo:
- Es **muy escueto** (101 lines) para ser el documento canónico de arquitectura que CELL.MD pedía. No cubre ni de lejos la profundidad de CELL.MD (585 lines).
- La numeración de fases es inconsistente: aquí es **Phase 10.2**, mientras que `cell-studio/UCA_CORE_SPEC.md` dice **Phase 15**.
- Menciona Phase 16 / ADR-016 en la sección del bridge, lo que sugiere que recibió actualizaciones parciales pero no una revisión completa.
- No hay rastro de que se haya actualizado para reflejar Era 8.3.0.

➡ **Diagnóstico**: Sirve como referencia rápida de los conceptos UCA, pero no reemplaza ni actualiza el contenido más detallado de CELL.MD / cell editor.md. Debería expandirse o marcarse como "superseded by docs/cell-studio/UCA_CORE_SPEC.md" si ese es el canonical.

### docs/cell editor - para más adelante/
| Fichero | Estado | Líneas | Nota |
|---|---|---|---|
| `cell editor.md` | **PROPOSED** (2026-05-11) | 444 | Documento maestro original. Propone evolución de Universal Cell Laboratory → Asset Behavior Lab. Contiene roadmap completo Phases 10.1–10.6. |
| `ADR-010-asset-behavior-lab.md` | **PROPOSED** (2026-05-12) | 407 | Versión ADR del mismo contenido, ligeramente más refinada. |
| `CELL.MD` | **DRAFT** (2026-05-12) | 585 | UCA Phase 0/1 Spec + Implementation Plan en 6 fases (Stabilization → Architecture → Additive Contract → Conversion → Experimental Renderer → Hierarchical Inspector → Packaging). |

### docs/cell-studio/
| Fichero | Estado | Líneas | Nota |
|---|---|---|---|
| `ASSET_BEHAVIOR_LAB_ADR.md` | **ACTIVE (PHASE 15 CONSOLIDATION)** | 41 | Versión migrada/resumida del ADR-010. Dice "MIGRATED FROM docs/cell editor - para más adelante/cell editor.md". |
| `LAYER_RECIPE_SPEC.md` | **ACTIVE (PHASE 15)** | 30 | Extracto sobre Layer Recipes. |
| `UCA_CORE_SPEC.md` | **ACTIVE (MIGRATED TO PHASE 15)** | 72 | Extracto resumido de UCA Core. |

### Conclusión sobre docs
| Documento | Estado | Problema |
|---|---|---|
| `cell editor - para más adelante/` (3 ficheros) | PROPOSED/DRAFT | Originales completos pero desactualizados vs el código. Phase 10/15 vs Era 8.3.0 real. |
| `cell-studio/` (3 ficheros) | ACTIVE (Phase 15) | Extractos resumidos. Perdieron detalle sustancial respecto a los originales. |
| `UNIVERSAL_CELL_ARCHITECTURE.md` | ACTIVE (Phase 10.2) | Conecta los docs con el código pero es demasiado escueto. No se ha actualizado a Era 8.3.0. |

**Problema raíz**: Los 7 documentos deberían converger en un conjunto coherente. Actualmente hay triple versionado del mismo contenido con diferente nivel de detalle y diferente numeración de fase, y ninguno refleja el estado real Era 8.3.0 del código.

---

## 2. Estado actual del código (Era 8.3.0 / Phase 29)

Lo que YA está implementado en el código base:

### Completado (respecto a los planes de los docs)
- ✅ **UCA engine completo**: 20+ ficheros en `src/omega-ui-core/uca/` con bridge, injection, semantics, converters (`entityToNode.ts`, `manifestToTree.ts`, `treeToManifest.ts`), validators, resolvers.
- ✅ **Tipos canónicos**: `OmegaNode`, `ModuleTemplate`/`CellTemplate`, `OMEGA_Manifest` en `manifest.ts` (612 líneas).
- ✅ **AssetBehavior interface**: Definida en `assetBehavior.ts` (76 líneas) con preset, mapping, transform, LayerRecipe.
- ✅ **AssetBehaviorPresetSelector**: Componente UI para selección de presets.
- ✅ **UniversalCellEditorModal**: Modal completo de edición de celdas.
- ✅ **CellRenderer** + **UniversalRenderer**: Motores de renderizado (renderers/).
- ✅ **ElementCatalog**: Governance unificado ADR-043/046 (1100 líneas).
- ✅ **Sistema de diseño omega-ui-core**: tokens CSS, primitives (17+ tipos), layout, typography.

### No implementado (brechas respecto a los planes)
- ❌ **AssetBehaviorGovernance**: No existe como módulo ni componente. Es el inspector que debería unificar UnifiedGraphicGovernance e IdentityGovernance.
- ❌ **Phase 10.2 – Inspector convergence**: No se han fusionado los módulos de governance.
- ❌ **Phase 10.3 – Lab refocus**: No hay wizard de presets ni reorganización de propiedades en el modal.
- ❌ **Phase 10.4 – Layer composition**: No hay editor de recetas de capas visuales.
- ❌ **Phase 10.5 – Plate & background**: No hay workflow específico para rack plates.
- ❌ **Phase 10.6 – Library industrialization**: No hay sistema de guardado de presets.
- ❌ **Phase 10.1 – Contract hardening**: El AssetBehavior es solo tipo, no tiene runtime class ni adaptadores de migración.

### Deuda técnica
- ⚠️ **1 error de TypeScript** en `WorkbenchContainer.tsx:118` (type mismatch en `setActiveDiff`).
- ⚠️ No hay script `typecheck` en package.json.
- ⚠️ No hay tags git ni releases.

### Código preservado pero inactivo / desconectado (de ui_features_inventory.md)
| Componente | Archivos | Estado | Impacto |
|---|---|---|---|
| **CellStudioContainer** + suite | `CellStudioContainer.tsx`, `AssetBehaviorPresetSelector.tsx`, `BehaviorMappingInspector.tsx`, `LayerRecipeEditor.tsx` | **Totalmente desconectado**. `actions.setStudioMode(true)` nunca se llama. | El menú "Universal Cell Laboratory" abre `UniversalCellEditorModal` en lugar del laboratorio aislado. **Vacio de usabilidad crítico.** |
| **MockupModal** + suite | `MockupModal.tsx`, `MockupHeader.tsx`, `MockupFooter.tsx`, `MockupViewport.tsx`, `MockupLoading.tsx` | **Desactivado y comentado** en `EditorModals.tsx`. | Render fotorrealista incompleto/inestable. Pendiente de decisión: refactorizar o eliminar. |

**Esto cambia el análisis significativamente**: El `AssetBehaviorPresetSelector` y `BehaviorMappingInspector` no solo existen como tipo/componente, sino que **ya hay implementación parcial de UI** (`CellStudioContainer.tsx`, `LayerRecipeEditor.tsx`) pero está **desconectada** — el código está, el entrypoint no. El gap no es solo de implementación, es de **conexión**. El menú `Edit > Universal Cell Laboratory` debería llamar a `setStudioMode(true)` pero no lo hace.

---

## 3. Análisis de conveniencia: ¿hacer algo ahora o más adelante?

### Argumentos para actuar AHORA

1. **El proyecto está maduro (Era 8.3.0)** – Ya no está en fases tempranas. Los cimientos UCA están sólidos. El roadmap muestra todas las fases hasta 29 como completadas. Es momento de refinar y cerrar brechas.

2. **El AssetBehaviorGovernance es el eslabón perdido** – Sin él, el flujo "seleccionar preset → configurar comportamiento → previsualizar" está incompleto. El `AssetBehaviorPresetSelector` permite elegir, pero no hay inspector que edite el comportamiento.

3. **Solo 1 error TS** – La base es estable. Arreglarlo y añadir typecheck script es esfuerzo mínimo.

4. **Los docs de "para más adelante" ya están superados por el código** – El código implementó UCA mucho más allá de lo que esos docs describen como DRAFT. Mantener los docs desactualizados es ruido.

### Argumentos para dejarlo PARA MÁS ADELANTE

1. **Nadie está pidiendo estas features ahora** – El nombre del directorio lo dice explícitamente: "para más adelante". Si no hay un requerimiento concreto, implementarlo sería trabajar sobre especulaciones.

2. **El AssetBehavior como tipo ya existe** – El contrato de datos está definido y ya se usa en `ManifestEntity` y `ModuleTemplate`. El renderer ya lo soporta. No hay bloqueo funcional.

3. **El roadmap actual va por Phase 29** – Las phases 10.x son conceptualmente anteriores. Posiblemente el equipo ya consideró e integró lo relevante y dejó el resto deliberadamente.

4. **Riesgo de over-engineering** – Implementar AssetBehaviorGovernance, layer recipes, plate workflow, etc. puede llevar a construir funcionalidad que nadie usa todavía. El ADR ya advertía sobre este riesgo.

### Veredicto

| Aspecto | Recomendación |
|---|---|
| **Docs** | **Sincronizar urgente**. Los documentos "para más adelante" están obsoletos vs el código. Los de `cell-studio/` son resúmenes pobres. Propuesta: archivar los PROPOSED/DRAFT y expandir los ACTIVE en `cell-studio/` con la información relevante que aún no se haya migrado (roadmap phases, UX redesign, data model, rendering model). |
| **Código – baja inversión** | **Hacer ahora**: (1) Arreglar el error TS de WorkbenchContainer. (2) Añadir script `typecheck` al package.json. (3) Si existe `UnifiedGraphicGovernance` o `IdentityGovernance`, fusionarlos superficialmente en un `AssetBehaviorGovernance` mínimo. (4) **Conectar el menú "Universal Cell Laboratory" a `CellStudioContainer`** — ya existe el código, solo falta cablear `setStudioMode(true)`. |
| **Código – media/alta inversión** | **Dejar para más adelante** salvo que un requerimiento concreto lo exija: Layer recipes, plate workflow, preset wizard, library system. El AssetBehavior type ya es suficiente para el contrato actual. |

---

## 4. Plan de acción recomendado (priorizado)

### Prioridad 1 (inmediata, bajo esfuerzo)
- [ ] Arreglar `WorkbenchContainer.tsx:118` (único error TS).
- [ ] Añadir `"typecheck": "tsc --noEmit"` al package.json.
- [ ] Documentar en `AGENTS.md` que se ejecute typecheck + lint tras cada cambio.

### Prioridad 2 (corto plazo, medio esfuerzo)
- [ ] Sincronizar documentación:
  - Archivar `docs/cell editor - para más adelante/` (mover a `docs/archive/` o añadir front matter "SUPERSEDED").
  - Expandir `docs/cell-studio/ASSET_BEHAVIOR_LAB_ADR.md` con el contenido sustancial del ADR-010 original (roadmap, UX redesign, data model migration, rendering model, validation criteria).
  - Expandir `docs/cell-studio/LAYER_RECIPE_SPEC.md` con más detalle.
- [ ] Implementar `AssetBehaviorGovernance` como módulo inspector mínimo que use el `AssetBehavior` type existente.

### Prioridad 3 (medio/largo plazo, alto esfuerzo)
- [ ] Phase 10.3: Refactorizar `UniversalCellEditorModal` con wizard de presets y secciones reorganizadas.
- [ ] Phase 10.4: Layer recipe editor.
- [ ] Phase 10.5: Rack plate/surface workflow.
- [ ] Phase 10.6: Library system.

---

## 5. Resumen ejecutivo

**El código está muy por delante de los docs.** El proyecto está en Era 8.3.0 (Phase 29 completada), el UCA engine está implementado, los tipos están definidos, y solo hay 1 error de TypeScript. Los documentos de `cell editor - para más adelante` reflejan un estado conceptual anterior (PROPOSED/DRAFT, Phase 10/15) que ya no corresponde a la realidad del código.

**Lo prioritario es sincronizar la documentación** para que refleje el estado real, y **cerrar las brechas de bajo esfuerzo** (error TS, typecheck script, conectar CellStudioContainer al menú, AssetBehaviorGovernance básico). El trabajo de alta inversión (layer recipes completos, plate workflow, library system) debe dejarse para cuando haya un requerimiento explícito que lo justifique.

---

## 6. Análisis cruzado: ui_features_inventory.md vs docs de cell

El inventario revela una **paradoja** que no era obvia solo con los docs:

1. **Los docs `cell-studio/` están ACTIVE** y el código de CellStudioContainer existe, pero **está desconectado** — es código muerto funcionalmente. 
2. **El ADR-010 propone evolucionar UniversalCellEditorModal → Asset Behavior Lab**, pero el código ya tiene un `CellStudioContainer` que parece ser exactamente ese "Asset Behavior Lab"… solo que nunca se activa.
3. **`AssetBehaviorPresetSelector`** y **`BehaviorMappingInspector`** no son solo tipos: son componentes React implementados dentro del suite de CellStudioContainer. Pero nadie los ve porque el entrypoint no está cableado.

### Diagnóstico de la desconexión
```
Menu "Edit > Universal Cell Laboratory"
  → Llama a UniversalCellEditorModal  (funcional, simple)
  → Debería llamar a setStudioMode(true) → CellStudioContainer  (código listo, pero ignorado)
```

Esto sugiere que **hubo dos aproximaciones**:
- **UniversalCellEditorModal**: enfoque temprano, modal simple, el que se usa hoy.
- **CellStudioContainer + suite**: intento posterior de implementar el Asset Behavior Lab completo, pero quedó a medio cablear.

La documentación y el código cuentan historias diferentes. Los docs dicen "propuesto evolucionar X → Y", pero el código ya tiene un Y parcial implementado y simplemente no está conectado.

### Implicación práctica
**Conectar `setStudioMode(true)` al menú es la acción de mayor impacto con el menor esfuerzo** de todo el análisis. Ya hay UI implementada (CellStudioContainer, preset selector, mapping inspector, layer recipe editor). Solo falta el cableado. Esto validaría si ese código es funcional o si también está incompleto por dentro — y daría respuesta real a si vale la pena invertir en el resto.
