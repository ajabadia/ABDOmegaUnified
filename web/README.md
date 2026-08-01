# OMEGA Manifest Editor (v9.9.1)

Bienvenido al repositorio oficial del **OMEGA Manifest Editor**, un entorno de authoring visual completo para el diseño, parametrización y certificación de manifiestos de módulos del ecosistema de síntesis modular **OMEGA**.

---

## 🚀 Características Principales

### 🎛️ Authoring Visual

- **Diseño Visual de Racks**: Ubica, escala y maqueta de forma interactiva Knobs, Jacks, Sliders y displays. Rejilla con precisión industrial (5px grid) con guías arrastrables al estilo Photoshop.
- **Visual Modulation Matrix**: Matriz SVG drag-and-drop para conexiones de modulación. Cables Bezier con color por tipo, ghost preview al arrastrar y ajuste de cantidad con scroll-wheel.
- **Virtual Scrolling LayersPanel**: Panel de capas con scroll virtualizado (`react-window`) para +1000 nodos con rendimiento fluido. Drag & drop, expand/collapse preservado.
- **Ghost Preview (Alt+Click)**: Previsualización fantasma de blueprints antes de la inyección posicional en el rack.
- **Mini-Map del Rack (P5)**: Mapa en miniatura arrastrable con filtros por tipo de nodo, snap a bordes, indicador de locked, leyenda de colores y persistencia en localStorage + URL query params.

### 🔧 Interfaz Industrial

- **Command Palette (Ctrl+K) (P2)**: Paleta de comandos estilo VS Code/Linear con búsqueda fuzzy de nodos y acciones, navegación por teclado, atajos visibles. 35 unit tests.
- **Status Bar (P3)**: Barra de estado inferior con indicador Modified/Saved, timestamp de guardado, conteo de errores/warnings de validación en vivo, estado watchdog e indicador de herramienta activa. 45 tests.
- **Onboarding Walkthrough (P4)**: Tour interactivo de 7 pasos (Welcome, Header & Menu Bar, Tool Palette, Work Canvas, Inspector Panel, Status Bar, Keyboard Shortcuts). Auto-open en primera visita, accesible desde Command Palette.
- **Undo Timeline Visual (P6)**: Popover/timeline con historial semántico + batch history (hide/lock/group). Entradas coloreadas por variante, undo individual de batch entries. 47 tests.
- **Floating Toolbar Customizable (P8)**: Toolbar flotante con 11 botones en 4 categorías. Drag-and-drop para reordenar, ocultar/mostrar, persistencia en localStorage con validación de integridad.
- **Resizable Panels (P9)**: Paneles del dock derecho (Layers, Properties, Rack, Compliance, Blueprints, Logs, Info/History) con splitters redimensionables vía `react-resizable-panels`. Tamaños persistidos en localStorage.

### 🎨 Temas Visuales

- **5 Temas**: Dark (default), Light, Amber (warm), Cyberpunk (neon), High Contrast (max legibility).
- **ThemeSelector dropdown**: Selector desplegable con indicador de color, lista de 5 temas, checkmark en el activo. Cierre con click outside + Escape.
- **CSS Variables**: Cada tema con `--wb-primary`, `--primary-rgb`, `--wb-bg`, `--wb-surface`, `--wb-outline`, `--wb-text`, `--wb-bloom`, `--wb-accent`, `--primitive-*`, `--omega-*`.

### 🧩 Shortcuts & Productividad

- **49 shortcuts documentados**: Navegación completa por teclado (Ctrl+1/2/3/4 para vistas, Ctrl+Shift+L/H/R/B para alineación, ↑↓←→ para nudge, Ctrl+Shift+E para Cell Studio, Ctrl+Shift+A para Compliance, etc.).
- **Alignment Shortcuts**: Ctrl+Shift+L/H/R/B priorizan alineación cuando hay ≥2 ítems seleccionados. Ctrl+Alt+E para distribución uniforme en ambos ejes.
- **Priority Badges en MenuBar**: Indicadores ámbar en items de alineación cuando hay multi-selección.

### ✅ Validación y Certificación

- **Validación de Esquema OMEGA**: Soporte para validación contra esquemas JSON oficiales Era 7.0/7.1/7.2/7.3. Detección automática de inconsistencias antes de la exportación.
- **WASM Pipeline de Integridad**: `deployManifest()` con verificación real de bindings contra `OmegaContract`. `verifyBindings()` para validación contrato-árbol. `reconcileStateDetailed()` para reconciliación completa. 17 tests de integración.
- **Compliance Panel**: Panel de auditoría en el dock derecho con toggle `Ctrl+Shift+A` (Window > Compliance).
- **Arquitectura OMEGA Certification**: Scripts de auditoría estructural (`arch-audit`) y certificación completa de 6 fases (`full-audit`).

### 🗂️ Multi-Documento y Persistencia

- **Multi-Documento**: Edición simultánea de múltiples archivos `.acemm` con tabs independientes.
- **Guardado Directo Local (File System Access API)**: Vincula tu carpeta local de desarrollo y escribe archivos `.acemm` directamente sin descargas manuales (Chrome, Edge, Opera).
- **Watchdog SSE con Hot-Reload**: Sincronización en segundo plano con hot-reload mediante servidor watchdog Node.js.
- **Batch Ingestion**: Importación masiva de múltiples manifiestos a la vez.
- **Session Persistence**: Sincronización automática de documentos abiertos y manifiestos a `localStorage`.

### 🧪 Cell Studio y Blueprints

- **Universal Cell Laboratory** (`Ctrl+Shift+E`): Editor aislado de celdas con modo Freeze/Save.
- **Blueprints Gallery**: Galería de plantillas de blueprints con inyección directa.
- **Blueprint Packaging** (`.acepack`): Exportación de celdas como bundles zip comprimidos con recursos locales.
- **Distilled Export**: Pipeline de destilación (fosilización, contracción de estilos, pruning, deduplicación SHA-256) para manifiestos listos para producción.

### 🛠️ Otras Funcionalidades

- **Toast Notification System**: Sistema global de toasts animados (framer-motion) con 4 variantes (info, success, warn, error).
- **DockIconBar genérico**: Barra de iconos vertical reutilizable con grupos, separadores y labels.
- **DockPanelHeader**: Cabecera de panel reutilizable con variantes `default` y `subtle`.
- **Guardado de Workspace**: Estado del layout (split ratio, pane configuration, panel sizes) persistido en `localStorage`.
- **Inspector Levels**: `simple | medium | advanced` — nivel de detalle del inspector ajustable.
- **Zen Mode**: Modo minimalista que oculta header y footer para máxima concentración.

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|:----------|:-----------|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) |
| **Biblioteca** | [React 19](https://react.dev/) |
| **Estilos** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Edición** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| **Validación** | [Ajv (JSON Schema)](https://ajv.js.org/) & [Zod](https://zod.dev/) |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) |
| **Paneles** | [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) |
| **Virtual Scrolling** | [react-window](https://react-window.vercel.app/) |
| **Iconos** | [Lucide React](https://lucide.dev/) |
| **Render** | [html-to-image](https://github.com/bubkoo/html-to-image) |

---

## 📂 Estructura del Workspace

```
├── app/                          # App Router (Next.js), rutas localizadas (next-intl)
│   ├── [locale]/                 #   Páginas localizadas
│   ├── api/                      #   API routes (audio, contact)
│   └── globals.css               #   Estilos globales + temas
├── src/
│   ├── components/ui/            # Componentes UI globales
│   ├── data/                     # Datos de instrumentos, calibración
│   ├── features/
│   │   └── manifest-editor/      # ★ Dominio principal
│   │       ├── components/       #   Workbenches, viewports, inspectores
│   │       │   ├── inspector/    #     Paneles del dock derecho
│   │       │   ├── layout/       #     Header, Footer, Toolbar, MenuBar
│   │       │   ├── viewport/     #     Rack, Orbital, Source views
│   │       │   ├── modulation/   #     Visual Modulation Matrix
│   │       │   └── lab/          #     CellStudio, BlueprintLibrary
│   │       ├── hooks/            #   Custom hooks de estado y lógica
│   │       └── types/            #   Tipos del dominio
│   ├── omega-ui-core/            # Sistema de diseño unificado OMEGA
│   │   ├── uca/                  #   Universal Cell Architecture
│   │   └── utils/                #   StyleResolver, blueprintValidator
│   ├── services/                 # Servicios (historial, persistencia, WASM)
│   └── hooks/                    # Hooks compartidos (useManifestEditor)
├── e2e/                          # Pruebas end-to-end (Playwright)
├── scripts/                      # Utilidades (auditoría, watchdog, generación)
└── docs/                         # ADRs, planes, reportes de auditoría
```

---

## 💻 Comenzando

### Requisitos

- [Node.js](https://nodejs.org/) v20 o superior.
- Navegador con soporte de File System Access API para vincular directorios locales (Chrome, Edge, Opera).

### Instalación

```bash
npm install
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

El editor estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing

```bash
# Pruebas unitarias
npm test

# Pruebas E2E (Playwright)
npm run test:e2e

# Pruebas E2E con UI interactiva
npm run test:e2e:ui
```

**Cobertura actual:** 825 tests unitarios (46 suites) + 51 snapshots + suite E2E. ✅

---

## ✅ Auditorías y Certificación

```bash
# Auditoría estructural (Architectural Guard)
npm run arch-audit

# Certificación completa (6 fases): cache clean → tsc → eslint → manifiestos → reportes
npm run full-audit

# TypeScript strict check
npm run typecheck

# ESLint
npm run lint
```

---

## 📋 Roadmap

| Prioridad | Feature | Estado |
|:---------:|:--------|:------:|
| **P1** | 🍞 Toast Notification System | ✅ v9.3.3 |
| **P2** | 🔍 Command Palette (Ctrl+K) | ✅ v9.4.0 |
| **P3** | 📊 Status Bar (dirty/validación) | ✅ v9.8.0 |
| **P4** | 🎓 Onboarding Walkthrough | ✅ v9.8.0 |
| **P5** | 🖼️ Mini-Map del Rack | ✅ v9.3.3 |
| **P6** | ⏪ Undo Timeline Visual | ✅ v9.9.0 |
| **P7** | 🎨 3 Temas Adicionales (Amber, Cyberpunk, High Contrast) | ✅ v9.8.1 |
| **P8** | 🔧 Floating Toolbar Customizable | ✅ v9.9.0 |
| **P9** | 📐 Resizable Panels | ✅ v9.9.0 |
| **P10** | ♿ Accesibilidad WCAG AA | 📋 Pendiente |
| **P11** | 🔌 Editor Visual de Conexiones | 📋 Pendiente |

---

## 📜 Changelog

Ver [CHANGELOG.md](./CHANGELOG.md) para el historial completo de cambios.

---

© 2026 / **OMEGA Labs** / Global Digital Matrix
