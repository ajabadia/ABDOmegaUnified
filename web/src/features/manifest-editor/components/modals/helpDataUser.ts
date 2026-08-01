/**
 * @purpose Gestiona y exporta secciones de usuario para la documentación de ayuda del editor de manifesto OMEGA.
 * @purpose_en Manages and exports user sections for the OMEGA manifest editor's help documentation.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1fd0nza
 * @lastUpdated 2026-06-19T18:48:12.371Z
 */

import type { HelpSection } from './helpDataTypes';

export const USER_SECTIONS: HelpSection[] = [
  // --- SECCIONES DE USUARIO ---
  {
    id: 'introduccion',
    title: 'Protocolo OMEGA 7.2.3',
    icon: '🚀',
    category: 'user',
    content: 'Bienvenido al entorno de ingeniería de OMEGA. Este editor permite construir manifiestos (.acemm) para módulos industriales con precisión sub-píxel y sincronización total con el motor WASM de la Era 7.',
    subsections: [
      {
        id: 'industrial_baking',
        title: 'Industrial Baking (DNA)',
        content: 'En la Era 7.2.3, los temas son "horneados" directamente en el manifiesto. Al seleccionar una estética (Carbono, Glass, etc.), el editor inyecta automáticamente todos los tokens de color, fuentes e iluminación. Esto garantiza que el módulo sea autoportante y se vea igual en cualquier sistema.',
      }
    ]
  },
  {
    id: 'rack',
    title: 'El Rack (Chasis)',
    icon: '🧱',
    category: 'user',
    content: 'Define las propiedades físicas y estéticas del panel frontal del módulo.',
    subsections: [
      {
        id: 'dimensiones',
        title: 'Dimensiones y HP',
        content: 'El ancho se mide en HP (1 HP = 15px). La altura depende del slot:\\\\n• **Main Rack (3U)**: Altura fija de 420px (slot: `main` o `lower`).\\\\n• **Aux Rack (1U)**: Altura fija de 140px (slot: `upper` o `top`, height_mode: `compact`).',
        technical_params: ['hp', 'metadata.rack.slot', 'metadata.rack.height_mode']
      }
    ]
  },
  {
    id: 'layout',
    title: 'Arquitectura de Layout',
    icon: '📐',
    category: 'user',
    content: 'Define la estructura organizativa del módulo mediante contenedores declarativos.',
    subsections: [
      {
        id: 'contenedores',
        title: 'Layout Containers',
        content: 'Los contenedores son marcos arquitectónicos con posición y tamaño fijos.',
        technical_params: ['ui.layout.containers[]', 'container_id']
      },
      {
        id: 'planos',
        title: 'Container Authority',
        content: 'Jerarquía: Rack > Contenedor > Cell. El Tab definido en el contenedor TIENE PRIORIDAD sobre el del elemento.',
        technical_params: ['tab: MAIN | FX | EDIT | MIDI | MOD']
      },
      {
        id: 'integrity',
        title: 'Firmware Integrity (SHA-256)',
        content: 'El hash del manifiesto debe coincidir exactamente con el del binario .wasm para ser validado.',
        category: 'professional'
      }
    ]
  },
  {
    id: 'uca_overview',
    title: 'Universal Cell Architecture',
    icon: 'UCA',
    category: 'user',
    content: 'OMEGA evoluciona hacia un sistema de composicion universal: Rack, caras, contenedores, controles, labels, tornillos y capas graficas se entienden como Cells con distinto rol. El modelo plano actual sigue existiendo mientras se estabiliza el editor, pero la direccion arquitectonica es un arbol recursivo.',
    subsections: [
      {
        id: 'uca_hierarchy',
        title: 'Jerarquia Conceptual',
        content: 'La unidad mayor es el Rack. Cada Rack puede tener varias caras de presentacion (MAIN, FX, MIDI, PATCH, REAR). Cada cara contiene grupos o contenedores, y cada grupo contiene Cells. Una Cell puede ser simple, como un tornillo, o compuesta, como un knob con filmstrip, label, LED e hit-area.',
        technical_params: ['Rack > Face > Container > Cell > Layer', 'kind', 'role', 'children[]']
      },
      {
        id: 'uca_contract_boundary',
        title: 'Frontera con el Motor DSP',
        content: 'La arquitectura de Cells organiza la interfaz visual, pero no sustituye al contrato tecnico del plugin. El .wasm sigue siendo la fuente de verdad logica y expone parametros y puertos mediante omega_get_contract(). Las Cells interactivas solo se conectan al motor mediante bind.',
        technical_params: ['wasm = logic SOT', 'acemm = visual SOT', 'bind -> contract.id']
      },
      {
        id: 'uca_template_vs_instance',
        title: 'Template vs Instancia',
        content: 'El catalogo debe contener CellTemplates reutilizables: por ejemplo, un knob tipo Roland o un jack SSL. El manifiesto contiene instancias colocadas en un Rack concreto: posicion, overrides visuales y bind. Al exportar un .acepack, las templates y assets usados se embeben para que el modulo sea autocontenido.',
        technical_params: ['CellTemplate', 'OmegaNode', 'cellRef', 'resources.assets[]', '.acepack']
      },
      {
        id: 'uca_tree_example',
        title: 'Ejemplo de Arbol',
        content: 'Representacion simplificada de un modulo con una cara principal y una Cell compuesta:',
        code: `tree:\n  id: rack_root\n  kind: rack\n  children:\n    - id: main_face\n      kind: face\n      role: structure\n      children:\n        - id: filter_group\n          kind: container\n          role: logic-group\n          children:\n            - id: cutoff_knob\n              kind: cell\n              role: control\n              cellRef: roland_knob_b\n              bind: filter_cutoff\n              pos: { x: 40, y: 80 }`
      }
    ]
  },
  {
    id: 'cells',
    title: 'Cells (Entidades)',
    icon: '🧬',
    category: 'user',
    content: 'Componentes activos registrados en el motor.',
    subsections: [
      {
        id: 'roles',
        title: 'Registry Roles (Gobernanza)',
        content: 'Cada cell DEBE tener un rol técnico (control, telemetry, mod_target, stream).',
        technical_params: ['role: control | telemetry | mod_target | stream']
      },
      {
        id: 'bindings',
        title: 'Canonical Binding',
        content: 'Vincula la cell física con un parámetro del binario WASM mediante su ID de contrato.',
        technical_params: ['bind: string']
      }
    ]
  },
  {
    id: 'ui_components',
    title: 'Catálogo de Componentes',
    icon: '🎛️',
    category: 'user',
    content: 'Lista de componentes industriales estándar reconocidos por el motor de la Era 7:',
    subsections: [
      {
        id: 'knob_desc',
        title: 'Knob / Slider',
        content: 'Controles giratorios o deslizantes para mapeo continuo (0.0 a 1.0).',
        technical_params: ['component: knob | slider-v | slider-h']
      },
      {
        id: 'display_desc',
        title: 'Display (Stepper)',
        content: 'Pantalla digital con botones +/- integrados para ajustes de precisión.',
        technical_params: ['component: display']
      },
      {
        id: 'io_desc',
        title: 'Port (Jack)',
        content: 'Representación física de un punto de parcheo (Audio/CV/MIDI).',
        technical_params: ['component: port']
      }
    ]
  },
  // --- SECCIÓN DE ATAJOS DE TECLADO ---
  {
    id: 'keyboard_shortcuts',
    title: 'Keyboard Shortcuts',
    icon: '⌨️',
    category: 'user',
    content: 'OMEGA Editor soporta atajos de teclado para acelerar tu flujo de trabajo. Los atajos están organizados por categoría y siguen el estándar de VS Code (Ctrl+Shift+Letra para toggle de paneles).',
    subsections: [
      {
        id: 'ks_file',
        title: 'File & Persistencia',
        content: 'Atajos para operaciones de archivo y exportación:',
        technical_params: [
          'Ctrl+O — Abrir proyecto .omega',
          'Ctrl+S — Guardar OmegaPack',
          'Ctrl+Shift+S — Exportar Modo Definitivo (Distilled)',
          'Ctrl+K — Command Palette (búsqueda universal)',
        ]
      },
      {
        id: 'ks_edit',
        title: 'Edición e Historia',
        content: 'Atajos para edición general y navegación del historial:',
        technical_params: [
          'Ctrl+Z — Deshacer (Undo)',
          'Ctrl+Y — Rehacer (Redo)',
          'Ctrl+Shift+Z — Rehacer (Redo alternativo)',
          'Ctrl+C — Copiar elemento seleccionado',
          'Ctrl+X — Cortar elemento seleccionado',
          'Ctrl+V — Pegar elemento',
          'Ctrl+D — Duplicar elemento seleccionado',
          'Ctrl+G — Agrupar selección (Group)',
          'Ctrl+Shift+Alt+G — Desagrupar (Ungroup)',
          'F2 — Renombrar elemento seleccionado',
          'Ctrl+A — Seleccionar todos los elementos',
          'Escape — Deseleccionar elemento o cerrar menús/paneles',
        ]
      },
      {
        id: 'ks_view',
        title: 'Vistas (Tab Switching)',
        content: 'Cambia rápidamente entre las vistas principales del editor:',
        technical_params: [
          'Ctrl+1 — Orbital View',
          'Ctrl+2 — Virtual Rack',
          'Ctrl+3 — Source Code',
          'Ctrl+4 — History Tab',
        ]
      },
      {
        id: 'ks_view_toggles',
        title: 'Overlays de Vista',
        content: 'Activa o desactiva elementos visuales del viewport:',
        technical_params: [
          'Ctrl+Shift+G — Toggle Grid (cuadrícula)',
          'Ctrl+Shift+U — Toggle Guides (guías)',
          'Ctrl+Shift+M — Toggle Mini Map',
        ]
      },
      {
        id: 'ks_windows',
        title: 'Paneles (Window Toggles)',
        content: 'Abre o cierra los paneles laterales del editor. Sigue la convención VS Code:',
        technical_params: [
          'Ctrl+Shift+L — Layers Panel',
          'Ctrl+Shift+P — Element Properties',
          'Ctrl+Shift+Alt+R — Rack Properties',
          'Ctrl+Shift+B — Blueprints Library',
          'Ctrl+Shift+I — Information Panel',
          'Ctrl+Shift+H — History Panel',
          'Ctrl+Shift+C — Console / Logs',
          'Ctrl+Shift+A — Compliance (Audit)',
        ]
      },
      {
        id: 'ks_tools',
        title: 'Acciones Especiales',
        content: 'Atajos para acciones del editor y manipulación de capas:',
        technical_params: [
          'V — Select Tool',
          'M — Marquee (selección múltiple)',
          'A — Add mode (añadir primitivas)',
          'B — Blueprints Gallery',
          'Ctrl+Shift+E — Universal Cell Laboratory',
          'Ctrl+Shift+R — Reset Workspace',
          'Delete / Backspace — Eliminar nodo seleccionado',
          'Alt+↑/↓ — Mover capa arriba/abajo (LayersPanel)',
          'Ctrl+Shift+Alt+H — Toggle Hidden filter (LayersPanel)',
          'Ctrl+Shift+Alt+L — Toggle Locked filter (LayersPanel)',
          'Ctrl+Shift+Alt+A — Toggle Audit filter (LayersPanel)',
          'Ctrl+Shift+Alt+T — Toggle Templates filter (LayersPanel)',
          'Ctrl+Shift+Alt+C — Clear all filters (LayersPanel)',
          'Ctrl+Shift+Alt+0-8 — Filter by component type (0=All, 1=Knob, 2=Port, 3=Slider, 4=Display, 5=Container, 6=Label, 7=Switch, 8=Button)',
          '↑/↓/←/→ — Nudge selected node 1px (Rack viewport)',
          'Shift+↑/↓/←/→ — Nudge selected node by grid spacing (Rack viewport)',
          'Enter — Confirm ghost preview (blueprint placement)',
        ]
      },
      {
        id: 'ks_transform_resize',
        title: 'Transform: Resize y Rotación',
        content: 'Comandos de transformación numérica y mouse para elementos seleccionados:',
        technical_params: [
          'Ctrl+Alt+R — Numeric Resize (popover con inputs PX/%)',
          'Ctrl+Alt+T — Numeric Rotate (popover con ángulo en grados)',
          'Ctrl+Alt+C — Copy Transform (copiar dimensiones + rotación)',
          'Ctrl+Alt+V — Paste Transform (pegar transformación copiada)',
          'T — Activar Transform Tool (handles de mouse)',
          '↑/↓/←/→ — Nudge mover 1px (con Shift: grid step)',
          'Alt+↑/↓/←/→ — Nudge resize 1px (con Shift: grid step)',
          'Shift (durante resize mouse) — Proporcional (lock aspect ratio)',
          'Shift (durante rotate mouse) — Snap 15° (rotación incremental)',
          'Alt (durante resize mouse) — Simétrico (desde el centro)',
          'Ctrl (durante resize mouse) — Snap a cuadrícula',
        ]
      },
      {
        id: 'ks_transform',
        title: 'Transform: Resize y Rotación',
        content: 'Comandos de transformación numérica y manipulación por teclado para elementos seleccionados:',
        technical_params: [
          'Ctrl+Alt+R — Numeric Resize (popover con inputs PX/%)',
          'Ctrl+Alt+T — Numeric Rotate (popover con ángulo en grados)',
          'Ctrl+Alt+C — Copy Transform (copiar dimensiones + rotación al portapapeles)',
          'Ctrl+Alt+V — Paste Transform (pegar dimensiones + rotación copiadas)',
          'T — Activar Transform Tool (handles de mouse para resize/rotate)',
          'Alt+↑/↓/←/→ — Nudge resize 1px (altura/ancho)',
          'Ctrl+↑/↓/←/→ — Resize por paso de cuadrícula (con Transform Tool activa)',
          'Shift (durante resize con mouse) — Mantener proporción (lock aspect ratio)',
          'Shift (durante rotate con mouse) — Snap 15° (rotación incremental)',
        ]
      },
      {
        id: 'ks_alignment',
        title: 'Alineación (Align Shortcuts)',
        content: 'Con múltiples elementos seleccionados (≥2), usa Ctrl+Shift + letra:',
        technical_params: [
          'Ctrl+Shift+L — Align Left (Alinear izquierda)',
          'Ctrl+Shift+H — Center Horizontally (Centrar horizontal)',
          'Ctrl+Shift+R — Align Right (Alinear derecha)',
          'Ctrl+Shift+T — Align Top (Alinear arriba)',
          'Ctrl+Shift+M — Center Vertically (Centrar vertical)',
          'Ctrl+Shift+B — Align Bottom (Alinear abajo)',
          'Ctrl+Shift+V — Distribute Vertically (Distribuir vertical)',
          'Ctrl+Shift+D — Distribute Horizontally (Distribuir horizontal)',
          'Ctrl+Alt+E — Distribute Evenly both axes (Distribuir uniforme ambos ejes)',
        ]
      },
      {
        id: 'ks_help',
        title: 'Ayuda',
        content: 'Acceso rápido a documentación e información del sistema:',
        technical_params: [
          'F1 — Engineering Manual (esta ayuda)',
        ]
      },
    ]
  },
];
