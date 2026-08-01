# Índice de Documentación - OMEGA Manifest Editor (Era 8.3.0)

Este documento es el mapa central de toda la documentación del proyecto. Los archivos activos están clasificados en carpetas temáticas para facilitar su acceso. Los documentos históricos o ya implementados han sido archivados para mantener limpio el espacio de trabajo activo.

---

## 🟢 Documentación Activa (Era 8.3.0)

### 🏛️ 1. Decisiones de Arquitectura Activas (ADRs)
Ubicación: [`docs/adr/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/)
ADRs vigentes correspondientes al desarrollo y gobernanza de la Era actual.

- [ADR-043-unified-cell-blueprint-governance.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/ADR-043-unified-cell-blueprint-governance.md) - Gobernanza y exportación estructurada de celdas unificadas a plantillas JSON.
- [ADR-044-validate-behavior-recipes-in-blueprints.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/ADR-044-validate-behavior-recipes-in-blueprints.md) - Validación estricta de recetas de comportamiento asociadas a plantillas de blueprints.
- [ADR-045-cell-studio-architecture-refactor.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/ADR-045-cell-studio-architecture-refactor.md) - Desacoplamiento de estado y refactorización modular del contenedor de Cell Studio.
- [ADR-046-cell-philosophy-redesign.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/ADR-046-cell-philosophy-redesign.md) - Filosofía de celdas atómicas y su diferenciación del grafo legacy OmegaNode.
- [ADR-047-BlueprintValidator-Catalog-Integration.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/adr/ADR-047-BlueprintValidator-Catalog-Integration.md) - Integración de validación no fatal (warnings/errores) al importar blueprints locales.

---

### 📐 2. Especificaciones de Ingeniería y Arquitectura Activas
Ubicación: [`docs/specs-and-architecture/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/specs-and-architecture/)
Documentos técnicos y normativos vigentes que rigen el funcionamiento del editor.

- [UNIVERSAL_CELL_ARCHITECTURE.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/specs-and-architecture/UNIVERSAL_CELL_ARCHITECTURE.md) - Definición del modelo canónico UCA para abstracción de componentes de síntesis modular.
- [OMEGA_ENGINEERING_MANIFEST_SPEC.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/specs-and-architecture/OMEGA_ENGINEERING_MANIFEST_SPEC.md) - Formato de especificación del archivo de manifiesto `.acemm` interpretado por el motor modular.
- [OMEGA_History_Architecture.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/specs-and-architecture/OMEGA_History_Architecture.md) - Detalles del flujo e interfaz de restauración de historial en el Monaco Editor.
- [OMEGA_Architectural_Precedence_Policy.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/specs-and-architecture/OMEGA_Architectural_Precedence_Policy.md) - Política estricta sobre la jerarquía y precedencia de diseño de manifiestos frente al código host.

---

### 🎨 3. Guías de Estilo y Estándares Activos
Ubicación: [`docs/guides-and-standards/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/)
Guías estéticas y operativas para el desarrollo del editor.

- [guidelines.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/guidelines.md) - Directivas y lineamientos generales para el desarrollo y consistencia de código.
- [VISUAL_STYLE_GUIDE.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/VISUAL_STYLE_GUIDE.md) - Guía visual del look "Tech-Noir" (colores HSL, grilla, tipografías y sombras).
- [STUDIO_RENDER_GUIDE.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/STUDIO_RENDER_GUIDE.md) - Instrucciones de exportación de mockups en alta definición y optimización de rendimiento.
- [INSPECTOR_LEVELS.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/INSPECTOR_LEVELS.md) - Criterios y directrices funcionales de los niveles de complejidad (Simple, Medium, Advanced) en los menús de propiedades.
- [handoff.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/handoff.md) - Handoff Briefing técnico general para desarrolladores y agentes que asumen el repositorio.
- [README_E2E.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/guides-and-standards/README_E2E.md) - Guía de ejecución y mantenimiento de pruebas de extremo a extremo (E2E) con Playwright.

---

### 📊 4. Reportes de Auditoría e Inventarios Activos
Ubicación: [`docs/reports-and-audits/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/reports-and-audits/)
Análisis de características vigentes y reportes de cumplimiento estructural en caliente.

- [ui_features_inventory.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/reports-and-audits/ui_features_inventory.md) - Inventario de características visuales y auditoría de código huérfano.
- [arch-audit-report.csv](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/reports-and-audits/arch-audit-report.csv) y [arch-audit-report.json](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/reports-and-audits/arch-audit-report.json) - Reporte estructural dinámico autogenerado.

---

### 🗺️ 5. Planes de Desarrollo y Roadmaps Activos
Ubicación: [`docs/planning-and-roadmaps/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/planning-and-roadmaps/)
Planificación activa y contratos vigentes.

- [phase_7_1_contracts.ts](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/planning-and-roadmaps/phase_7_1_contracts.ts) - Mapeo TypeScript activo de interfaces de contrato.

---

### 📦 6. Recursos y Elementos Estáticos Activos
Ubicación: [`docs/assets/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/assets/)
Recursos binarios e imágenes de referencia de skins/layouts vigentes.

- `Diva-Dark_Glove_Revisited.zip`
- `skinman0999l.zip` y `skinman101.zip`
- `roadmap.png`
- `industrial_screw_head_00.png`

---

## 📦 Historial y Archivo (Implementados / Deprecados)
Ubicación: [`docs/archive/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/)
Documentos históricos, planes completados, reportes antiguos y especificaciones deprecadas que ya han sido implementados o no se usan activamente.

- **Archivos de Seguimiento** ([`docs/archive/seguimiento/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/seguimiento/)): Bitácoras y seguimientos de cambios históricos del proyecto.
  - [CHANGELOG.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/seguimiento/CHANGELOG.md) - Historial de versiones y lanzamientos anteriores.
  - [ROADMAP.md](../ROADMAP.md) - Hitos, metas e histórico del roadmap del proyecto.
  - [progress.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/seguimiento/progress.md) - Progreso y control de tareas de desarrollo anteriores.
  - [CHAT_LOG.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/seguimiento/CHAT_LOG.md) - Bitácora de chat e histórico de cambios aplicados en sesiones anteriores.
- **ADRs Implementados** ([`docs/archive/implemented-adrs/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-adrs/)): Registros de diseño arquitectónico desde la fase de inicio hasta la consolidación del historial (ADR-009 a ADR-042, fases 5 a 10 y UCA POCs 1 a 4).
- **Planes Implementados** ([`docs/archive/implemented-plans/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/)): Checklists, análisis y estrategias de desarrollo completadas.
  - [roadmap_detailed.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/roadmap_detailed.md) - Historial detallado del roadmap (Fases 6 a 10.1).
  - [ANALYSIS-element-catalog-enrichment.md](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/ANALYSIS-element-catalog-enrichment.md) - Propuesta e investigación para la gobernanza unificada del catálogo ADR-043.
  - [Migración de Stepper](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/MIGRATION_PLAN_CELLSTUDIO_STEPPER.md) - Plan de pasos secuenciales para Cell Studio.
  - [Refactorización de UI/UX](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/UI_UX_Refactor_Plan.md) - Plan del workbench central y modo Zen.
  - [Análisis inicial de celdas](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/cell_analisis.md) - Análisis técnico inicial de las estructuras de celdas.
  - [Mapa de remediación](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/implemented-plans/OMEGA_Remediation_Map.md) - Hoja de ruta para la resolución de incongruencias de validación JSON.
- **Reportes Antiguos** ([`docs/archive/old-reports-and-audits/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/old-reports-and-audits/)): Auditorías y pruebas de rendimiento de fases concluidas (Auditoría de Abril 2026, Cierre de Fase 11, Pruebas de Humo de Monaco y Lecciones de la Fase 6).
- **Especificaciones Antiguas** ([`docs/archive/architecture_7_1.md`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/architecture_7_1.md)): Apuntes de arquitectura de la Era 7.1.
- **Notas de Usabilidad Obsoletas** ([`docs/archive/usabilidad - más adelante/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/usabilidad%20-%20m%C3%A1s%20adelante/)): Apuntes antiguos de diseño de interfaz de usabilidad (`usabilidad.txt`).
- **Notas Legacy de Celdas** ([`docs/archive/cell editor - para más adelante/`](file:///d:/desarrollos/ABDSynths/ABDOmegaEditor/docs/archive/cell%20editor%20-%20para%20m%C3%A1s%20adelante/)): Documentos de propuesta inicial de edición de celdas (`CELL.MD`, `cell editor.md`, etc.).
