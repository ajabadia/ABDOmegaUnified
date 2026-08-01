# OMEGA Manifest Editor - Inventario y Auditoría de Funcionalidades (Usabilidad)

Este documento realiza un análisis metodológico y técnico profundo del workbench del Manifest Editor (Era 8.3.0). Identifica la topología de la interfaz, clasifica cada funcionalidad por su ubicación física, y detalla los hallazgos de **código huérfano (orphan code)** y módulos legacy inactivos en el árbol del proyecto.

---

## 1. Inventario de Funcionalidades por Zona de Interfaz

### A. Cabecera (Header / Toolbar Principal)
Ubicada en la parte superior. Sirve como punto de acceso rápido para control de vista, guardado y sincronización.

| Funcionalidad | Control en UI | Ubicación Lógica | Observaciones / Diagnóstico |
| :--- | :--- | :--- | :--- |
| **Menú Archivo / Edición / Vista / Ayuda** | Desplegables de texto (MenuBar) | Correcta (Estándar de escritorio) | Contiene la mayoría de las acciones pesadas. Actualmente con etiquetas en inglés. |
| **Integridad / Diagnósticos de Cumplimiento** | Compliance Badge (Semáforo de cumplimiento) | Correcta | Abre el reporte de conformidad. Duplicado en el menú `Help`. |
| **Selector de Vista Principal** | Botón deslizante (`ViewModeSelector`) | Correcta | Permite alternar entre Orbital, Rack, Source, History. |
| **División de Vista (Split)** | Icono de columnas | Correcta | Permite vista partida (ej. Rack + Código Fuente). |
| **Cambio de Tema (Claro / Oscuro)** | Toggle de icono (Sol/Luna) | Correcta | Control estético directo. |
| **Configuración Global del Módulo** | Botón de engranaje | Correcta | Abre el modal de configuración de metadatos. Duplicado en menú `Edit`. |
| **Consola de Logs (Ver/Ocultar)** | Botón de Terminal con texto | Correcta | Activa el panel inferior de logs. Ahora también en menú `Window > Logs`. |

### B. Menús Desplegables (MenuBar)
Contiene las acciones de control de archivos, exportación de ingeniería e inicialización de laboratorios.

*   **Menú File (Archivo)**:
    1.  *Link Workspace Folder*: Enlaza carpeta física usando la API File System. (Duplicidad: También aparece en la barra superior si no está enlazado).
    2.  *Load submenu*:
        *   Ingest Module Folder (Carga por lotes).
        *   WASM (Binarios de DSP).
        *   Contract (TypeScript/C++ mappings).
        *   Manifest (.acemm).
        *   Assets (Gráficos/SVGs).
    3.  *Blueprints*: Galería de plantillas rápidas.
    4.  *Save submenu*:
        *   Manifest (.acemm).
        *   OmegaPack (.acepack).
    5.  *Export submenu*:
        *   Industrial CAD Blueprint.
        *   Tech Contract (TS).
        *   Engine Header (C++).
        *   **Cell as Blueprint JSON** (NUEVO): Exporta la celda seleccionada como blueprint JSON. Deshabilitado si no hay una sola celda seleccionada.
    6.  *Deploy to Engine*: Envío en caliente del manifiesto al motor WASM.
    7.  *Exit*: Salir al portal principal.

*   **Menú Edit (Edición)**:
    1.  *Undo / Redo*: Deshacer/Rehacer histórico. (Duplicidad: Atajos estándar `Ctrl+Z`, `Ctrl+Y`).
    2.  *Document Timeline*: Cambia a la pestaña de historial.
    3.  *Universal Cell Laboratory*: Abre el estudio de celdas aisladas. (Faltante: Acceso directo visual fuera del menú). ⚠️ **Actualmente abre `UniversalCellEditorModal`** por la interceptación en `page.tsx`. El hook `useWorkbenchModals` ya tiene soporte para redirigir a `CellStudioContainer` via `setStudioMode` si no se pasa `onOpenCellEditor`.
    4.  *Module Global Configuration*: Metadatos del módulo. (Duplicidad: Botón de engranaje en cabecera).
    5.  *Generate Studio Render*: Renderizado de imagen mock del módulo.
    6.  *Reset Workspace*: Limpieza total del estado de trabajo.

*   **Menú View (Vista)**:
    1.  *Orbital View*: Pestaña de grafos orbitales.
    2.  *Virtual Rack*: Pestaña de chasis del rack.
    3.  *Source Code*: Pestaña del editor de código Monaco.

*   **Menú Window (Ventana)** — NUEVO (consolidado):
    1.  *Layers*: Panel de capas.
    2.  *Rack Properties*: Propiedades del rack.
    3.  *Rack Sections*: Submenú con secciones del rack (Identity Branding, Global UI Skin, Active Construction Plane, Module Taxonomy, Physical Emulation Profile, Aesthetics Globals, Aesthetics Elements, Architecture, Diagnostics).
    4.  *Element Properties*: Propiedades del elemento seleccionado.
    5.  *Blueprints Library*: Librería de blueprints.
    6.  *Information*: Panel de información.
    7.  *History*: Historial de cambios.
    8.  *Logs*: Consola de logs. (Reemplaza el antiguo "Toggle Logs Terminal" del menú View).

*   **Menú Help (Ayuda)**:
    1.  *Engineering Manual*: Manual interactivo vivo.
    2.  *Compliance Report*: Auditoría detallada (Cartilla de Inspección).
    3.  *About OMEGA*: Créditos y versión.

---

## 2. Acciones del Panel Lateral Derecho (Docked Inspector)
El inspector de propiedades interactivo (`WorkbenchInspector.tsx` / `PropertyPanel.tsx`) del elemento seleccionado provee accesos y controles avanzados directamente en la interfaz:

1.  **Essential Identity**:
    *   *CellPreview*: Mini-renderizador en vivo del elemento seleccionado.
    *   *Canonical ID Input*: Entrada de texto con linter de duplicados en caliente.
    *   *Display Label Input*: Nombre visual del control.
2.  **Simulation (Dry-Run)**:
    *   *Start/Stop LFO*: Toggle cliente interactivo para modular controles a 1Hz de forma local (Dry-run).
3.  **Design & Aesthetics**:
    *   *Aesthetic Rules*: Edición de tokens de color, bordes, redondeado, z-index y transparencias.
    *   *Mechanical Specs & Faceplate*: Asignación de tornillos, guías y fondos texturizados (skins).
4.  **Logic & Ports / Architecture**:
    *   *Binding inputs*: Vinculación directa con IDs de puertos del contrato DSP.
    *   *Universal Signal Port editor*: Gestión de la dirección (In/Out) y tipo de señal (audio, CV, MIDI).
5.  **System Diagnostics**:
    *   *Diagnostics table*: Monitor de latencia RPC, estatus del watchdog y estados del lock de escritura de sesión.

---

## 3. Acciones en Modales Co-existentes

1.  **AuditModal (Cartilla de Conformidad)**: Muestra la lista de violaciones y advertencias de diseño. Al hacer clic en un issue, el navegador de auditoría auto-selecciona el elemento conflictivo y enfoca la vista necesaria.
2.  **GlobalGovernanceModal**: Configuración global del instrumento (nombre, versión, dimensiones del chasis, rieles de alimentación, HP).
3.  **UniversalCellEditorModal**: Creador y guardado rápido de plantillas de celda en la biblioteca local. ⚠️ **Modal legacy.** El menú `Edit > Universal Cell Laboratory` abre este modal pero el nuevo flujo debería ir a `CellStudioContainer` via `setStudioMode`. El hook `useWorkbenchModals` ya soporta la redirección pero `page.tsx` intercepta con `onOpenCellEditor`.
4.  **ManifestDiffModal**: Línea de tiempo de versiones (Time-travel) que permite comparar diferencias visuales línea por línea y realizar rollbacks controlados.
5.  **BlueprintPromptDialog**: Diálogo de confirmación para inyección de blueprints con placeholders. (NUEVO desde Phase 9.4).
6.  **MockupModal**: Renderizado de imagen mock del módulo. Actualmente activo y funcional (controlado por `mockupOpen`).
7.  **UniversalCellLibraryModal** (📦 Conservado): Comentado en `EditorModals.tsx` línea 175-183. Pendiente de decisión: reactivar o eliminar.

---

## 4. Auditoría y Estado de Limpieza del Código Muerto

Siguiendo la metodología estricta del proyecto, hemos clasificado y gestionado el código inactivo de la siguiente manera:

### ✅ A. CÓDIGO ELIMINADO (Reemplazado por funciones nuevas)
Los siguientes archivos han sido eliminados físicamente del espacio de trabajo porque sus funciones fueron asumidas por código moderno y eficiente:
1.  **Antiguo Editor YAML**:
    *   `SourceViewer.tsx` (viewport)
    *   `SourceHeader.tsx` (source)
    *   `SourceCodeBlock.tsx` (source)
    *   `useSourceEditor.ts` (hook)
    *   *Reemplazo*: `SourceView.tsx` (Monaco JSON Editor con esquema integrado de validación, mapeo de diagnósticos y saltos de línea).
2.  **Sidebar Izquierdo Legacy**:
    *   `WorkbenchSidebar.tsx` (layout)
    *   `ModuleHub.tsx` (layout)
    *   *Reemplazo*: Los controles de ingesta se movieron a `MenuBar`, la telemetría y diagnóstico al `AboutModal`, y el watchdog al Footer.
3.  **Hooks Redundantes**:
    *   `usePropertyPanel.ts` (*Reemplazo*: Acordeón vertical nativo en `PropertyPanel.tsx`).
    *   `useTransaction.ts` (*Reemplazo*: Mapeo de transacciones directo en `useManifestEditor.ts`).
4.  **Código de librería de celdas eliminado de EditorModals**:
    *   Props `isCellLibraryOpen`, `setIsCellLibraryOpen`, `onAddEntityFromLibrary` eliminados de `EditorModals.tsx`. La lógica se movió a `useWorkbenchModals`.

### ✅ B. CÓDIGO ELIMINADO (Documentación obsoleta)
Los siguientes documentos han sido movidos a `docs/archive/`:
1.  `docs/cell editor - para más adelante/` (3 ficheros: `cell editor.md`, `ADR-010-asset-behavior-lab.md`, `CELL.MD`)
    *   *Reemplazo*: `docs/cell-studio/ASSET_BEHAVIOR_LAB_ADR.md` (expandido con contenido consolidado).
    *   *Razón*: Los documentos PROPOSED/DRAFT estaban desactualizados vs el código (Era 8.3.0).

### 📦 C. CÓDIGO CONSERVADO (Inactivo / Desconectado — Para análisis)
Los siguientes archivos **no han sido eliminados** debido a que no cuentan con un reemplazo funcional moderno, o porque su funcionalidad está parcialmente implementada pero desconectada:

#### 1. Laboratorio Aislado de Celdas (`CellStudioContainer.tsx` y su suite)
*   **Archivos**: 
    *   `CellStudioContainer.tsx` (lab) — Refactorizado con hooks extraídos.
    *   `useCellStudioMode.ts` (lab, NUEVO) — Feature flag infrastructure (tabs/stepper mode vía URL).
    *   `useCellStudioDraft.ts` (lab, NUEVO) — Persistencia de draft en sessionStorage.
    *   `useCellStudioState.ts` (lab, NUEVO) — State management separado.
    *   `AssetBehaviorPresetSelector.tsx` (lab)
    *   `BehaviorMappingInspector.tsx` (lab)
    *   `LayerRecipeEditor.tsx` (lab)
*   **Estado**: **Parcialmente conectado**. El hook `useWorkbenchModals` redirige a `setStudioMode(true)` si no hay `onOpenCellEditor`, pero `app/[locale]/page.tsx` pasa `onOpenCellEditor` que abre el modal legacy en su lugar.
*   **Progreso reciente**: 
    *   ✅ State extraído a hooks modulares (`useCellStudioState`, `useCellStudioMode`, `useCellStudioDraft`).
    *   ✅ Stepper mode implementado con draft persistence (`?mode=stepper`).
    *   ✅ Integración con manifiesto real (Phase 2).
    *   ❌ **Blocker**: `page.tsx` línea 16 pasa `onOpenCellEditor={() => setIsCellEditorOpen(true)}`. Cambiar a `onOpenCellEditor={undefined}` o redirigir a `setStudioMode`.
    *   ❌ **1 error TS** en `WorkbenchContainer.tsx:118` (type mismatch `setActiveDiff`).
*   **Diagnóstico**: El menú *"Universal Cell Laboratory"* continúa abriendo el modal simple `UniversalCellEditorModal` porque `page.tsx` intercepta la llamada. El código del CellStudioContainer está listo y refactorizado, solo falta cambiar el wiring en `page.tsx`.

#### 2. Estudio de Render Fotorrealista (`MockupModal.tsx` y su suite)
*   **Archivos**: `MockupModal.tsx` (modals) y la carpeta `components/mockup/` conteniendo `MockupHeader.tsx`, `MockupFooter.tsx`, `MockupViewport.tsx`, `MockupLoading.tsx`.
*   **Estado**: **Funcional pero no crítico**. Renderizado condicional en `EditorModals.tsx` línea 143-149, controlado por `mockupOpen`.
*   **Función**: Captura y exportación de previsualizaciones del rack con simulación de iluminación física y sombras.
*   **Diagnóstico**: Funcionalidad presente pero de baja prioridad. Activado por menú `Edit > Generate Studio Render`.

#### 3. Librería Universal de Celdas (`UniversalCellLibraryModal`)
*   **Archivos**: `UniversalCellLibraryModal.tsx` (modals) — importado como comentario.
*   **Estado**: **Comentado** en `EditorModals.tsx` línea 175-183.
*   **Función**: Navegador y selector de celdas reutilizables desde la biblioteca local.
*   **Diagnóstico**: Desactivado. La funcionalidad de biblioteca ahora se maneja potencialmente via blueprint gallery u otros mecanismos. Pendiente de decisión: reactivar o eliminar definitivamente.

---

## 5. Resumen de Acciones Pendientes

### Prioridad Alta
- [ ] Conectar `CellStudioContainer`: eliminar o redirigir `onOpenCellEditor` en `app/[locale]/page.tsx` para que el menú abra el laboratorio moderno via `setStudioMode`.
- [ ] Arreglar error TS en `WorkbenchContainer.tsx:118` (`setActiveDiff` type mismatch).
- [ ] Añadir script `typecheck` al package.json y documentar en `AGENTS.md`.

### Prioridad Media
- [ ] Decidir futuro de `UniversalCellLibraryModal`: reactivar o eliminar.
- [ ] Evaluar si `UniversalCellEditorModal` debe eliminarse tras conectar CellStudioContainer.

### Prioridad Baja
- [ ] Evaluar si `MockupModal` merece refactorización o puede convivir como está.
