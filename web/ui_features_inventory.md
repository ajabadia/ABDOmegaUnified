# OMEGA Manifest Editor — Inventario de Funcionalidades UI (v9.9.1)

> **Versión:** v9.9.1 · **Última actualización:** 2026-06-17
> Basado en análisis del código fuente, CHANGELOG y ADRs.

---

## 1. Zonas de Interfaz — Mapa Topológico

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (role="banner")                                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ MenuBar │      OMEGA Manifest Editor      │ Badges │ │    │
│  │         │                                  │ Theme  │ │    │
│  └──────────────────────────────────────────────────────┘    │
├────┬────────────────────────────────────────────┬─────────────┤
│    │                                           │             │
│ T  │                                           │   DOCK      │
│ O  │           WORKBENCH VIEWPORT              │   DERECHO   │
│ O  │     (Rack / Orbital / Source / History)    │   (role=    │
│ L  │                                           │   "comple-  │
│ B  │                                           │   mentary") │
│ A  │                                           │             │
│ R  │                                           │  ┌────────┐ │
│    │                                           │  │ Layers │ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Prop.  │ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Rack   │ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Compl. │ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Bluepr.│ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Logs   │ │
│    │                                           │  ├────────┤ │
│    │                                           │  │ Info   │ │
│    │                                           │  │ Hist.  │ │
│    │                                           │  └────────┘ │
│    │                                           │    DockIcon  │
│    │                                           │    Strip     │
├────┴────────────────────────────────────────────┴─────────────┤
│  FOOTER (role="contentinfo")                                  │
│  Build v8.0.0 // Watchdog // [Orb|Rack|Src|Hist] // Status   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Inventario por Zona

### A. Cabecera (Header)

| Funcionalidad | Control | Componente | Ubicación | Versión |
|:--------------|:--------|:-----------|:----------|:-------:|
| **Menú Archivo/Edición/Vista/Window/Ayuda** | Desplegables de texto | `MenuBar.tsx` | Izquierda | v7.2.0 |
| **Identidad del Sistema** | Logo OMEGA + texto | `Header.tsx` | Centro | v7.2.0 |
| **Compliance Badge** | Badge con semáforo (CERTIFIED/FAIL) | `ComplianceBadge.tsx` | Derecha | v9.3.0 |
| **ThemeSelector** | Dropdown con 5 temas (Dark/Light/Amber/Cyberpunk/High Contrast) | `ThemeToggle.tsx` | Derecha | **v9.8.1** |
| **SimulationStatusBadge** | Indicador de conexión HIL en vivo | `SimulationStatusBadge.tsx` | Derecha | v9.2.0 |
| **Skip-to-content link** | Enlace oculto que aparece al recibir foco (keyboard) | `globals.css` | Fuera de pantalla | **v9.7.0** |

### B. Menú Archivo (MenuBar)

| Ítem | Sub-ítems | Acción | Versión |
|:-----|:----------|:-------|:-------:|
| **File** | Link Workspace Folder | Enlazar carpeta local (File System API) | v7.2.0 |
| | Load > Ingest Module Folder | Carga por lotes | v7.2.0 |
| | Load > WASM Binary | Carga de binario DSP | v7.2.0 |
| | Load > Contract (TS/C++) | Subir contrato técnico | v7.2.0 |
| | Load > Manifest (.acemm) | Subir manifiesto individual | v7.2.0 |
| | Load > Assets (SVGs) | Recursos gráficos | v7.2.0 |
| | Blueprints Gallery | Abre galería de plantillas | v7.2.0 |
| | Save > Manifest (.acemm) | Guardar en modo trabajo | v9.2.0 |
| | Save > OmegaPack (.acepack) | Guardar paquete comprimido | v9.2.0 |
| | Export > Industrial CAD Blueprint | Exportación CAD | v9.2.0 |
| | Export > Tech Contract (TS) | Contrato TypeScript | v8.0.0 |
| | Export > Engine Header (C++) | Header C++ | v8.0.0 |
| | Deploy to Engine | Envío en caliente al motor WASM | v9.2.0 |
| **Edit** | Undo / Redo | Deshacer/Rehacer histórico (Ctrl+Z/Shift+Z) | v7.2.0 |
| | Document Timeline | Cambia a pestaña de historial | v7.3.0 |
| | Universal Cell Laboratory | Abre CellStudio (Ctrl+Shift+E) | **v9.6.1** |
| | Module Global Configuration | Configuración de metadatos del módulo | v7.2.0 |
| | Generate Studio Render | Renderizado mock del módulo | v8.2.0 |
| | Reset Workspace | Limpieza total del estado (Ctrl+Shift+R) | v7.2.0 |
| **View** | Orbital View (Ctrl+1) | Pestaña de grafos orbitales | v7.0.0 |
| | Virtual Rack (Ctrl+2) | Pestaña de chasis del rack | v7.0.0 |
| | Source Code (Ctrl+3) | Editor Monaco JSON | v7.0.0 |
| | Toggle Grid (Ctrl+Shift+G) | Cuadrícula del viewport | v9.7.0 |
| | Toggle Guides (Ctrl+Shift+U) | Guías de alineación | v9.7.0 |
| | Toggle Mini Map (Ctrl+Shift+M) | Mini-mapa | v9.3.3 |
| | Toggle Zen Mode | Modo inmersivo sin header/footer | **v9.9.0** |
| **Window** | Layers Panel (Ctrl+Shift+L) | Panel de capas | **v9.7.0** |
| | Element Properties (Ctrl+Shift+P) | Propiedades del elemento | v8.2.0 |
| | Rack Properties (Ctrl+Shift+R) | Configuración del rack | v8.2.0 |
| | Blueprint Library (Ctrl+Shift+B) | Biblioteca de blueprints | **v9.7.0** |
| | Compliance / Audit (Ctrl+Shift+A) | Panel de compliance | **v9.7.0** |
| | Terminal Logs (Ctrl+Shift+C) | Consola de logs | v7.3.0 |
| | Information (Ctrl+Shift+I) | Información del elemento | v8.2.0 |
| | History (Ctrl+Shift+H) | Historial de cambios | **v9.7.0** |
| **Help** | Engineering Manual (F1) | Manual interactivo | v7.2.0 |
| | Take a Guided Tour | Tour interactivo de 7 pasos | **v9.8.0** |
| | About OMEGA | Créditos y versión | v7.2.0 |

### C. Toolbar Flotante (Floating Toolbar)

Toolbar vertical ubicada a la izquierda del viewport. Arrastrable, personalizable (P8).

| Botón | Icono | Acción | Categoría | Shortcut |
|:------|:-----:|:-------|:---------:|:--------:|
| Select Tool | Cursor | Seleccionar elementos | tools | V |
| Marquee Select | Square | Selección por área | tools | M |
| Add Primitive | Plus | Flyout para añadir controles | tools | A |
| CPU | Cpu | Abrir CellStudio del elemento seleccionado | tools | Ctrl+Shift+E |
| Blueprints Gallery | Zap | Abrir galería de blueprints | tools | — |
| Global Config | Settings | Configuración global del módulo | tools | — |
| Align Left | AlignStartHorizontal | Alinear bordes izquierdos | edit | Ctrl+Shift+L |
| Align Center H | AlignCenterHorizontal | Centrar horizontalmente | edit | Ctrl+Shift+H |
| Align Right | AlignEndHorizontal | Alinear bordes derechos | edit | Ctrl+Shift+R |
| Align Top | AlignStartVertical | Alinear bordes superiores | edit | Ctrl+Shift+T |
| Align Center V | AlignCenterVertical | Centrar verticalmente | edit | Ctrl+Shift+M |
| Align Bottom | AlignEndVertical | Alinear bordes inferiores | edit | Ctrl+Shift+B |
| Distribute V | ArrowUpDown | Distribuir verticalmente | edit | Ctrl+Shift+D |
| Distribute H | ArrowLeftRight | Distribuir horizontalmente | edit | Ctrl+Shift+V |
| Live | Radio | Conexión HIL en vivo | system | — |
| Zen Mode | Minimize2 | Ocultar header/footer | views | — |

> **v9.9.1:** Botón `Audit` eliminado (redundante con Compliance en dock + Window menu).

### D. Dock Derecho (RightDockContainer)

Panel lateral derecho con 7 paneles redimensionables (P9). `role="complementary"`.

| Panel | Icono | Descripción | Acceso | Versión |
|:------|:-----:|:------------|:------:|:-------:|
| **Layers** | Layers | Árbol jerárquico de nodos con virtual scrolling | Window > Layers | v9.2.0 |
| **Element Properties** | Sliders | Inspector del elemento seleccionado (WorkbenchInspector) | Window > Properties | v7.0.0 |
| **Rack Properties** | Settings | Configuración global del módulo | Window > Rack Properties | v7.0.0 |
| **Compliance** | Shield | Auditoría de cumplimiento con issues list | Window > Compliance | **v9.7.0** |
| **Blueprint Library** | Zap | Biblioteca de blueprints del sistema + usuario | Window > Blueprints | v9.2.0 |
| **Terminal Logs** | Terminal | Consola de logs del sistema | Window > Logs | v7.3.0 |
| **Information + History** | Info/History | Info del elemento + timeline de cambios | Window > Info/History | v8.2.0 |

> **v9.9.0:** Todos los paneles ahora son redimensionables con `react-resizable-panels`. Tamaños persistidos en `localStorage` (`omega_dock_panel_sizes`).

### E. Command Palette (Ctrl+K)

Paleta de comandos estilo VS Code/Linear para buscar nodos y ejecutar acciones.

| Característica | Detalle |
|:---------------|:--------|
| **Búsqueda** | Fuzzy search por label/ID/kind de nodos |
| **Acciones** | 28+ acciones del menú con shortcuts visibles |
| **Navegación** | ↑↓→Esc + Enter para ejecutar |
| **Cierre** | Escape to clear, backdrop click |
| **Tests** | 35 tests unitarios |

### F. Status Bar (WorkbenchFooter)

Barra de estado industrial en la parte inferior. `role="contentinfo"`.

| Sección | Indicador | Descripción | Versión |
|:--------|:----------|:------------|:-------:|
| **Build** | `Build v8.0.0` | Versión del build | v9.8.0 |
| **Watchdog** | Indicador conectado/offline/idle | Estado del watchdog SSE | v9.8.0 |
| **Active Tool** | `[M] Marquee` / `[A] Add` | Herramienta activa en uso | v9.8.0 |
| **Tab Selector** | Botones Orbital/Rack/Source/History | Selector de vista principal con shortcuts | v7.0.0 |
| **Split View** | Icono de columnas | Toggle de vista partida | v7.0.0 |
| **Mini Map** | Icono de mapa | Toggle de mini-mapa | v9.3.3 |
| **Undo Timeline** | Botón + contador de pasos | Popover con timeline visual + batch history | **v9.9.0** |
| **ShortcutBadges** | Undo/Redo/Cmd Palette/Save | Atajos rápidos con indicación de keyboard shortcut | v9.5.0 |
| **Dirty State** | `Modified` (ámbar) / `Saved` (verde) | Estado de cambios sin guardar con timestamp | **v9.8.0** |
| **Error/Warning Count** | `N errors / M warnings` | Conteo de issues de validación en vivo | **v9.8.0** |
| **Watchdog Dot** | Punto verde/rojo/gris | Indicador compacto de estado watchdog | v9.8.0 |

### G. Notificaciones (Toast System)

Sistema global de notificaciones con framer-motion. `role="status" aria-live="polite"`.

| Variante | Icono | Color | Duración | Propósito |
|:---------|:-----:|:-----:|:--------:|:----------|
| **info** | Info | Azul/cyan | 4s | Notificaciones informativas |
| **success** | CheckCircle | Verde | 4s | Operaciones exitosas |
| **warning** | AlertTriangle | Ámbar | 4s | Advertencias no críticas |
| **error** | AlertCircle | Rojo | 4s | Errores críticos |

> **API:** `useToast()` hook con `showToast(message, variant)`.

### H. Mini-Map del Rack

| Característica | Detalle | Versión |
|:---------------|:--------|:-------:|
| **Posición** | Flotante, arrastrable (top-right) | v9.3.3 |
| **Filtros** | Dropdown con checkboxes por tipo de nodo | **v9.8.0** |
| **Locked indicator** | Nodos bloqueados con opacity 0.45 + 🔒 | **v9.8.0** |
| **Persistencia** | localStorage + URL query params (`?hide=cell,group`) | **v9.8.0** |
| **Snap a bordes** | Snap threshold 8px, multi-eje | **v9.8.0** |
| **Doble-click reset** | Resetea posición del panel | **v9.8.0** |
| **Glow al arrastrar** | Brillo cyan + ring durante drag | **v9.8.0** |
| **Tests** | 60 tests unitarios | v9.3.3 |

### I. Onboarding Walkthrough

| Característica | Detalle |
|:---------------|:--------|
| **Pasos** | 7: Welcome → Header & Menu → Tool Palette → Canvas → Inspector → Status Bar → Shortcuts |
| **Auto-open** | Primera visita vía localStorage |
| **Highlight** | Glow ring animado alrededor del elemento objetivo |
| **Acceso** | Command Palette > Help > "Take a Guided Tour" |

---

## 3. Modales Co-existentes

Todos los modales tienen `role="dialog"`, `aria-modal="true"`, `aria-label`, y `useFocusTrap`.

| Modal | Propósito | Atajo/Llamada | Versión |
|:------|:----------|:-------------:|:-------:|
| **AboutModal** | Créditos y versión | Help > About OMEGA | v7.2.0 |
| **HelpModal** | Manual interactivo vivo | Help > Engineering Manual (F1) | v7.2.0 |
| **BlueprintPromptDialog** | Personalizar placeholders antes de inyectar blueprint | Al seleccionar blueprint con placeholders | v9.4.0 |
| **ExposeParametersDialog** | Parametrizar grupo para exportar como blueprint | Context menu > Save as Blueprint | v9.2.0 |
| **IngestionModal** | Confirmar archivos a ingestar | File > Load > ... | v7.2.0 |
| **TemplateGallery** | Galería de plantillas predefinidas | File > Blueprints Gallery | v7.2.0 |
| **MockupModal** | Renderizado y exportación de mockup | Edit > Generate Studio Render | v8.2.0 |
| **UniversalCellEditorModal** | Editor aislado de celdas | Edit > Universal Cell Laboratory (Ctrl+Shift+E) | v7.2.0 |
| **ManifestDiffModal** | Comparación visual de versiones (time-travel) | Desde Undo Timeline > Compare | v9.4.0 |
| **CommandPalette** | Paleta de comandos (Ctrl+K) | Ctrl+K | **v9.4.0** |
| **VisualModulationMatrix** | Matriz de modulación visual SVG | Desde inspector de modulación | **v9.6.0** |
| **CellStudioContainer** | Laboratorio aislado de celdas con preview y recetas | Toolbar > CPU (con elemento seleccionado) | v9.2.0 |

### Modales Eliminados / Reemplazados

| Modal | Estado | Razón |
|:------|:------:|:------|
| **AuditModal** | ❌ Eliminado v9.7.0 | Reemplazado por Compliance Panel en dock derecho |
| **GlobalGovernanceModal** | ❌ Eliminado v9.2.0 | Reemplazado por Rack Properties en dock derecho |
| **ModulationGrid** | ❌ Eliminado v9.6.0 | Reemplazado por VisualModulationMatrix SVG |

---

## 4. Auditoría de Código — Estado Actual

### A. Código Eliminado

| Archivo | Razón | Versión |
|:--------|:------|:-------:|
| `SourceViewer.tsx` | Reemplazado por Monaco Editor (`SourceView.tsx`) | v7.2.0 |
| `SourceHeader.tsx` | Reemplazado por Monaco Editor | v7.2.0 |
| `SourceCodeBlock.tsx` | Reemplazado por Monaco Editor | v7.2.0 |
| `useSourceEditor.ts` | Reemplazado por Monaco Editor | v7.2.0 |
| `WorkbenchSidebar.tsx` | Sidebar izquierdo legacy eliminado | v7.2.0 |
| `ModuleHub.tsx` | Hub legacy eliminado | v7.2.0 |
| `usePropertyPanel.ts` | Reemplazado por acordeón nativo en PropertyPanel | v7.2.0 |
| `useTransaction.ts` | Mapeo directo en useManifestEditor | v7.2.0 |
| `AuditModal.tsx` | Reemplazado por Compliance Panel | v9.7.0 |
| `GlobalGovernanceModal.tsx` | Reemplazado por Rack Properties dock | v9.2.0 |
| `ModulationGrid` | Reemplazado por VisualModulationMatrix | v9.6.0 |
| `WorkbenchLogs.tsx` (drawer) | Reemplazado por panel lateral en dock derecho | v7.3.0 |

### B. Código Conservado (Activo)

| Módulo | Archivos | Estado | Función |
|:-------|:---------|:------:|:--------|
| **CellStudioContainer** | `CellStudioContainer.tsx`, `AssetBehaviorPresetSelector.tsx`, `BehaviorMappingInspector.tsx`, `LayerRecipeEditor.tsx` | ✅ **Reconectado v9.6.1** (antes desconectado) | Laboratorio de edición aislada de celdas con recetas |
| **MockupModal** | `MockupModal.tsx`, `MockupHeader.tsx`, `MockupFooter.tsx`, `MockupViewport.tsx`, `MockupLoading.tsx` | ✅ Activo desde v8.2.0 | Renderizado fotorealista y exportación |

### C. Estado de Limpieza ESLint

| Métrica | Antes | Después | Commit |
|:--------|:-----:|:-------:|:------:|
| **Errores** | 45 | 0 | `dd10c59` |
| **Warnings** | 52 | 0 | `9a39a9d` |
| `as any` casts | ~30+ | 0 reemplazados con `as unknown as T` | `dd10c59` |
| `no-unused-vars` | ~37 | 0 suprimidos con eslint-disable específicos | `dd10c59` / `9a39a9d` |

---

## 5. Resumen de Features por Versión

| Versión | Features nuevas |
|:-------:|:---------------|
| **v9.9.1** | UI Cleanup (audit button, shortcut badges, engine overlay, Compliance en Window) |
| **v9.9.0** | Resizable Panels (P9), Floating Toolbar Customizable (P8), Undo Timeline Visual (P6) |
| **v9.8.1** | Temas Amber/Cyberpunk/High Contrast (P7), ThemeSelector dropdown |
| **v9.8.0** | Status Bar (P3), Onboarding Walkthrough (P4), Mini-Map filtros/indicador locked/snap |
| **v9.7.0** | Alignment Shortcuts UI/UX, Ctrl+Alt+E Distribute, Window menu, 49 shortcuts audit |
| **v9.6.1** | Ctrl+Shift+E CellStudio shortcut, LayersPanel TS fix, 19 shortcut tests |
| **v9.6.0** | Visual Modulation Matrix, Virtual Scrolling LayersPanel |
| **v9.5.0** | DockIconBar/DockPanelHeader/ToolbarIconButton refactors |
| **v9.4.0** | Command Palette (Ctrl+K), Ctrl+K badge in footer |
| **v9.3.3** | Toast Notification System, Mini-Map clamping/snap/60 tests |
| **v9.3.2** | Ghost Preview Alt+Click, Bug fixes, E2E 31/32 |
| **v9.2.0** | Container Format .omega, JUCE pipeline, Layers Panel, Groups, Simulaciones |
| **v8.2.0** | Viewport state independiente, MockupModal, Window menu, Light mode fix |
| **v8.0.0** | UCA linter, Contract generator, ID collision guard |
| **v7.3.0** | Sidebar Logs Panel, SimulationStatusBadge, Modal size standardization |
| **v7.2.0** | Floating Toolbar, deprecation cues, legacy cleanup (9 files) |
| **v7.1.0** | Multi-document support, session persistence, clipboard service |
| **v7.0.0** | Multi-tab layout, docked inspector, view state persistence |

---

*Inventario actualizado: 2026-06-17*
