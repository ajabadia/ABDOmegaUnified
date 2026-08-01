# Modelo Simplificado — Propuesta

> Inspirado en Synthedit / VCV Rack: componentes atómicos con edición visual directa, agrupados en el rack.
> Alcance: racks tipo eurorack con relativamente pocos elementos. No es un creador de sintetizadores completos.

---

## 1. Filosofía

Cada elemento del rack es un **componente autónomo** con un tipo fijo (knob, slider, led, display, label, port, switch, button) y propiedades de aspecto editables de forma directa. No hay árbol UCA recursivo, no hay templates, no hay blueprint injection, no hay capa de governance genérica.

Los componentes se colocan en coordenadas (x, y) absolutas dentro del rack. Para agruparlos —moverlos, duplicarlos, editarlos en conjunto— se usa un **grupo** (colección sin tipo, sin estilo propio).

```
rack
├── knob "Volume"
│   posición absoluta: (4, 2)
├── group "VCA Section"
│   ├── knob "Level"
│   ├── led "Clip"
│   └── label "VCA"
│   ├── port "Input"
│   └── port "Output"
└── group "Filter"
    ├── slider "Cutoff"
    └── label "Cutoff"
```

---

## 2. Modelo de datos

### Tipos de componente

```typescript
type ComponentType = 'knob' | 'slider' | 'led' | 'display' | 'label' | 'port' | 'switch' | 'button';
```

### Componente atómico

```typescript
interface ComponentNode {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  style: ComponentStyle;
  bind?: BindConfig;
}
```

Cada componente se define por su `type`. Un knob no tiene hijos, un label no tiene hijos, etc. Son átomos.

### Grupo (colección plana, sin anidamiento)

```typescript
interface GroupNode {
  id: string;
  type: 'group';
  label?: string;
  x: number;
  y: number;
  children: RackChild[];
}

type RackChild = ComponentNode | GroupNode;
```

- **Un solo nivel de grupo**: un grupo NO puede contener otro grupo.
- Las coordenadas de los hijos son **relativas** al grupo. Mover el grupo desplaza el origen; los hijos se mueven con él.
- El grupo no tiene estilo propio, no hereda a los hijos. Es puramente organizativo.

### Estilo de componente

```typescript
interface ComponentStyle {
  variant?: string;             // 'B_cyan', 'S_red', etc.
  color?: string;
  indicatorColor?: string;
  opacity?: number;
  asset?: string;               // referencia a filmstrip / PNG
  frames?: number;
  frameWidth?: number;
  frameHeight?: number;
  orientation?: 'horizontal' | 'vertical';
  polarity?: 'bipolar' | 'unipolar';
}
```

Filmstrips y PNGs se referencian desde `ComponentStyle.asset`. El modelo no cambia respecto al actual — solo el string de referencia.

### Binding a DSP

```typescript
interface BindConfig {
  paramId: string;
  min?: number;
  max?: number;
  default?: number;
}
```

### Manifest completo

```typescript
interface RackManifest {
  id: string;
  name: string;
  author?: string;
  version?: string;
  width: number;
  height: number;
  children: RackChild[];
  skin?: string;
  grid?: { spacingX: number; spacingY: number };
}
```

---

## 3. Blueprints

### Formato

Un blueprint es un `GroupNode` serializado a JSON:

```json
{
  "id": "",
  "type": "group",
  "label": "Knob+Label",
  "x": 0,
  "y": 0,
  "children": [
    { "id": "", "type": "knob",  "x": 0,  "y": 0,  "width": 3, "height": 3, "style": { "variant": "B_cyan" } },
    { "id": "", "type": "label", "x": 0,  "y": -2, "width": 3, "height": 1, "style": { "fontSize": 10 }, "label": "Freq" }
  ]
}
```

Los archivos se almacenan en `public/blueprints/*.rack-blueprint.json` con un `index.json` que hace de catálogo.

### Blueprints existentes (legacy)

Hay 4 blueprints en `public/blueprints/`:

| Archivo | Contenido |
|---------|-----------|
| `standard_vcf.json` | Contenedor con 1 knob (cutoff) |
| `osc_macro_block.json` | Contenedor con 1 label + 1 knob + 1 port |
| `performance_8_grid.json` | 2 columnas × 4 knobs (8 knobs en grid) |
| `stereo_io.json` | Contenedor con 4 ports (2 in + 2 out) |

**Estructuralmente ya son casi el nuevo formato**: un container (≈ `GroupNode`) con hijos cell (≈ `ComponentNode`). Usan `cellRef: "knob"` donde el nuevo modelo usaría `type: "knob"`. Los datos visuales (variant, color, asset) están en `style` y mapean 1:1 a `ComponentStyle`.

Se **migran** al nuevo formato mediante un conversor que:
- `container` → `GroupNode`
- `cell` con `cellRef: "knob"` → `ComponentNode { type: "knob", ... }`
- `style` → `ComponentStyle` (sin cambios)
- `bind` → `BindConfig` (sin cambios)
- `layout.mode` (stack-v, stack-h) → coordenadas x,y explícitas

### ElementCatalog (se conserva)

El `ElementCatalog.ts` (1100 LOC) define para cada tipo de componente: variantes disponibles, slots de composición, reglas de validación, capacidades estéticas. Es dato valioso que se conserva y se usa para:

- Poblar los selects de variante en los editores
- Validar estilos (rangos de tamaño, patrones de variante)
- Definir slots por defecto (posiciones de label, overlay, etc.)

Lo que cambia: el catálogo pasa de ser una referencia para el sistema de inyección a ser una fuente de datos para los editores visuales.

### Instanciar un blueprint

1. Leer el archivo JSON
2. Clonar cada nodo con un nuevo UUID (grupo + todos sus hijos)
3. Los binds se copian sin el `paramId` (el usuario los asigna después)
4. Añadir el grupo clonado al `children` del manifest

No hay pipeline de 10 pasos, no hay placeholders, no hay auto-wiring, no hay ID remapping.

---

## 4. Render pipeline

Un solo renderer React. No hay `dangerouslySetInnerHTML`, no hay `CellRenderer.renderCellHTML()`, no hay `UniversalRenderer`.

```
VirtualRack
  └── RackGrid
       ├── GroupComponent (si type='group')
       │    └── translate(x, y)
       │         ├── KnobComponent    (hijo)
       │         ├── LedComponent     (hijo)
       │         └── LabelComponent   (hijo)
       ├── KnobComponent    (si type='knob')
       ├── SliderComponent  (si type='slider')
       ├── LedComponent     (si type='led')
       ├── DisplayComponent (si type='display')
       ├── PortComponent    (si type='port')
       ├── SwitchComponent  (si type='switch')
       ├── LabelComponent   (si type='label')
       └── ButtonComponent  (si type='button')
```

`GroupComponent` es un `<div>` con `transform: translate(x, y)` que contiene sus hijos. No hereda eventos ni estilo.

Cada `*Component` recibe `ComponentNode` y renderiza su SVG/HTML directamente como React component. Los renderers de primitivas existentes (KnobRenderer, SliderRenderer, etc.) se convierten a React, conservando la lógica de dibujo (SVG, canvas, filmstrips).

---

## 5. Editor e inspector

### 5.1 Impacto en el panel derecho

**Hoy**: El panel derecho tiene ~13 secciones con ~40 controles diferentes, distribuidas en 2 paneles principales:

```
Element Properties (entity seleccionado)
├── Essential Identity     → EntityIdentity (ID, label, export)
├── Design & Aesthetics   → KnobProperties/SliderProperties/etc. + GovernanceConsole
├── Logic & Bindings      → BindingField + RoleSelector + ProtocolFields + ComponentBlueprint
├── Attachments           → Attachment cards con posiciones, lógica, estética
├── Layout & Position     → LayoutGovernanceSection (mode, gap, padding, justify, align)
├── Simulation            → LFO start/stop
└── Node Engineering      → EngineeringSection (8 roles)

Rack Properties (manifest seleccionado)
├── Identity & Branding   → ModuleIdentitySection (nombre, versión, HP, tags, etc.)
├── Chassis & Power       → ModuleChassisSection (ancho, profundidad, mA)
├── Grid & Workspace      → ModuleGridResolution + ModulePlaneSelector
├── Aesthetics            → ModuleSkinSelector + CustomSkinSection ×2
├── Architecture          → 6 sub-tabs (Tree, Infrastructure, Controls, I/O, Routing, Assets)
└── System Engineering    → EngineeringSection
```

**Con el nuevo modelo**: En lugar de 13 secciones genéricas, el panel derecho muestra uno de estos según lo seleccionado:

| Selección | Panel que se abre | Sustituye a |
|-----------|------------------|-------------|
| `ComponentNode` (knob, slider...) | Editor específico por tipo | Identity + Aesthetics + Logic + Layout + Attachments + Engineering |
| `GroupNode` | GroupEditor (lista inline de hijos) | (nuevo, no existía antes) |
| Fondo del rack (manifest) | RackProperties (simplificado) | Identity + Chassis + Grid + Aesthetics + Architecture + Engineering |
| Blueprint | BlueprintLibraryPanel (simplificado) | (reescritura del actual) |

### 5.2 Editor de componente (específico por tipo)

Cada editor es un panel compacto con los campos justos para ese tipo. Ejemplo para un knob:

```
┌─────────────────────────────────┐
│ Knob "Volume"                   │
│ ID: knob_vol  [📌] [✕]         │
│                                 │
│ Position     X: [4]  Y: [2]     │
│ Size         W: [3]  H: [3]     │
│                                 │
│ Variant      [B_cyan         ▼] │
│ Color        [■ #00f2ff       ] │
│ Asset        [knob_filmstrip  ▼] │
│ Frames       [32]               │
│                                 │
│ Bind         [param_1        ▼] │
│ Range        Min: [0]  Max: [127]│
│ Default      [64]               │
└─────────────────────────────────┘
```

| Componente | Campos |
|-----------|--------|
| knob | variante, color, asset, frames, bind, min, max, default |
| slider | variante, color, asset, orientation, bind, min, max, default |
| led | color, indicatorColor, polarity, bind |
| display | variante, asset, frames, bind |
| label | texto, font size, font color |
| port | orientation, polarity, color, bind |
| switch | variante, color, estados (2/3), bind |
| button | variante, color, label, bind |

Los selects de variante se pueblan desde `ElementCatalog` (ej: para `knob`, busca las variants del elemento `knob` en el catálogo: `A_cyan`, `B_amber`, `C_ruby`, `D_jade`).

**Controles eliminados por tipo** (que existen hoy y desaparecen):

| Control eliminado | Estaba en | Motivo |
|------------------|-----------|--------|
| Role selector (8 roles) | EngineeringSection + LogicSection | Los componentes no tienen roles en el nuevo modelo |
| Protocol/Step/Unit/Decimals | LogicSection (ProtocolFields) | Se simplifica a bind + range |
| Component Blueprint grid (~25 tipos) | LogicSection | No hay catálogo de tipos para inyectar desde el inspector |
| Attachment cards (posiciones, lógica, estética) | AttachmentsSection | No hay attachments en componentes atómicos |
| Layout mode (stack-v, stack-h) | LayoutGovernanceSection | No hay layout modes en componentes; solo posición absoluta |
| Gap/Padding/Justify/Align | LayoutGovernanceSection | Solo aplica a grupos, y se hace inline en GroupEditor |
| LFO Simulation | PropertyPanel | Se elimina (era experimental) |
| Governance Console (color tokens) | AestheticSection | Se reemplaza por color picker directo |
| Deep Audit / Source Code View | AestheticSection | No necesario en modelo simple |

### 5.3 Editor de grupo "inteligente"

```
┌─────────────────────────────────┐
│ Grupo: "VCA Section"            │
│ ID: group_vca     [📌] [✕]    │
│                                 │
│ Position     X: [4]  Y: [2]    │
│                                 │
│ Children (3):                   │
│ ┌─────────────────────────────┐ │
│ │ knob "Level"                │ │
│ │   variante: [B_cyan    ▼]   │ │
│ │   bind:     [param_1    ▼]  │ │
│ │                         [✕] │ │
│ ├─────────────────────────────┤ │
│ │ led "Clip"                  │ │
│ │   color: [■ green        ]  │ │
│ │   indicator: [■ red      ]  │ │
│ │                         [✕] │ │
│ ├─────────────────────────────┤ │
│ │ port "Input"                │ │
│ │   polarity: [unipolar   ▼]  │ │
│ │   bind:     [audio_in   ▼]  │ │
│ │                         [✕] │ │
│ └─────────────────────────────┘ │
│                                 │
│ [+ Add Child]  [ Ungroup ]      │
│ [Save as Blueprint...]          │
└─────────────────────────────────┘
```

### 5.4 RackProperties (manifest seleccionado)

```
┌─────────────────────────────────┐
│ Rack Properties                 │
│                                 │
│ Name      [My Module         ]  │
│ Author    [John Doe          ]  │
│ Version   [1.0.0             ]  │
│                                 │
│ Rack Size  W: [800]  H: [600]  │
│ Grid       X: [24]   Y: [24]   │
│                                 │
│ Skin      [Industrial       ▼]  │
│                                 │
│ [Show Rulers]  [Show Grid]      │
└─────────────────────────────────┘
```

Las secciones que se conservan del inspector legacy:

| Sección legacy | Estado |
|---------------|--------|
| ModuleIdentitySection (nombre, versión, HP, tags) | Se simplifica a 4 campos (name, author, version, rack size) |
| ModuleChassisSection (ancho, mA) | Se elimina (no aplica a racks virtuales) |
| ModuleGridResolution | Se conserva: spacing X/Y |
| ModulePlaneSelector (Front/Back/PCB/Internal) | Se elimina (no hay planos) |
| ModuleSkinSelector | Se conserva simplificado: selector de skin |
| CustomSkinSection (globals + elements) | Se elimina (se edita por componente) |
| ModuleArchitectureSection (6 sub-tabs) | Se elimina (no hay arquitectura de módulo) |
| EngineeringSection | Se elimina |

### 5.5 Paneles que no cambian

| Panel | Estado |
|-------|--------|
| Layers | No cambia (sigue mostrando la lista de elementos) |
| Info | Se simplifica (menos campos de diagnosis) |
| History | No cambia |
| Logs | No cambia |

## 6. Duplicar

Duplicar un elemento (componente o grupo) = clonar con nuevos UUIDs.

- Grupo duplicado → se clona el grupo + todos sus hijos con nuevos IDs.
- No se recolocan automáticamente (se renderizan superpuestos; el usuario los mueve).
- Los binds NO se duplican (quedan sin enlazar, el usuario los re-asigna).
- Las etiquetas de texto se duplican tal cual.

---

## 7. Interacción: agrupar, desagrupar, exportar

### 7.1 Agrupar

| Acción | Resultado |
|--------|-----------|
| Seleccionar múltiples componentes + clic derecho → "Group" (o Ctrl+G) | Se crea un `GroupNode` que contiene los seleccionados |
| Los hijos adoptan coordenadas **relativas** al grupo | La posición absoluta de cada hijo se convierte a relativa: `child.x - group.x`, `child.y - group.y` |
| El grupo se posiciona en la media de las posiciones de los hijos | `group.x = min(children.x)`, `group.y = min(children.y)` |
| Los hijos mantienen su selección visual | Se renderizan dentro del grupo, con el mismo aspecto |

**Visual**: Al agrupar, aparece un borde tenue (dashed, 1px, color acento) alrededor del grupo cuando está seleccionado o el ratón pasa por encima. No hay fondo ni decoración permanente — el grupo es invisible hasta que se interactúa con él.

### 7.2 Desagrupar

| Acción | Resultado |
|--------|-----------|
| Seleccionar grupo + clic derecho → "Ungroup" (o Ctrl+Shift+G) | Se elimina el `GroupNode` y los hijos pasan al nivel superior |
| Las coordenadas de los hijos se convierten a **absolutas** | `child.absoluteX = group.x + child.x`, `child.absoluteY = group.y + child.y` |
| Los hijos mantienen su selección | No se pierde la selección actual |

### 7.3 Navegación dentro de grupos

| Acción | Resultado |
|--------|-----------|
| Click en un componente dentro de un grupo | Se selecciona el componente (no el grupo) si ya estamos "dentro" del grupo. Si estamos fuera, el click selecciona el grupo. |
| Doble click en un grupo | "Entra" al grupo. Los clicks siguientes seleccionan hijos directamente. |
| Breadcrumb en el panel | Muestra la ruta: `Rack > VCA Section > Level Knob`. Click en un nivel superior "sale" del grupo. |
| Click fuera del grupo estando dentro | "Sale" del grupo: se selecciona el componente de fuera o el fondo del rack. |
| Escape | Sale del grupo sin seleccionar nada. |

### 7.4 Arrastrar (drag)

| Elemento | Comportamiento |
|----------|---------------|
| Componente individual | Se mueve libremente por el rack (coordenadas absolutas). |
| Grupo | Se mueve el grupo completo. Los hijos se desplazan con él (coordenadas relativas no cambian). |
| Componente dentro de un grupo (estando "dentro") | Se mueve dentro del grupo (coordenadas relativas al grupo). |
| Múltiples componentes seleccionados | Se mueven todos a la vez. Si pertenecen a distintos grupos, cada uno se mueve en su sistema de coordenadas. |

### 7.5 Exportar como blueprint

| Acción | Resultado |
|--------|-----------|
| Seleccionar grupo + clic derecho → "Save as Blueprint" (o Ctrl+E) | Se abre un diálogo para poner nombre, categoría, tags. |
| Al confirmar | Se serializa el `GroupNode` a JSON (con IDs vacíos) y se guarda en `public/blueprints/` como `.rack-blueprint.json`. |
| El `index.json` se actualiza automáticamente | Se añade la entrada al catálogo. |
| También se puede exportar un componente individual | Se envuelve en un `GroupNode` con un solo hijo. |
| También se puede exportar selección múltiple (no agrupada) | Se agrupan temporalmente, se exporta el grupo, pero NO se agrupan en el rack (solo se usa el grupo como contenedor de exportación). |

**Diálogo de exportación**:

```
┌─────────────────────────────────┐
│ Save as Blueprint               │
│                                 │
│ Name: [VCA Section___________]  │
│ Category: [control         ▼]  │
│ Tags: [filter, vca, input    ] │
│                                 │
│ Preview:                        │
│   ┌─ VCA Section ───────────┐  │
│   │  [knob] [led] [port]    │  │
│   └─────────────────────────┘  │
│                                 │
│     [Cancel]  [Save]           │
└─────────────────────────────────┘
```

### 7.6 Arrastrar blueprint al rack

Alternativa a usar el panel de librería: el usuario puede arrastrar un archivo `.rack-blueprint.json` desde el explorador de archivos al rack. Esto:

1. Lee el JSON
2. Ejecuta `instantiateBlueprint` (nuevos UUIDs)
3. Posiciona el grupo donde se soltó
4. Añade al manifest

---

## 8. Lo que se elimina

| Sistema | Archivos | LOC | Motivo |
|---------|----------|-----|--------|
| Árbol UCA recursivo | `uca/` ~19 files | ~2,300 | Lista plana + grupos lo reemplaza |
| UniversalRenderer | `renderers/UniversalRenderer/` ~9 files | ~772 | Render directo por tipo |
| CellRenderer (HTML strings) | `renderers/CellRenderer/` ~4 files | ~526 | Render React nativo |
| Renderers primitivos (legacy) | ~11 files | ~531 | Se refactorizan a React components |
| `Presentation` type | `manifest.ts` | ~100 | Fusionado en `ComponentStyle` |
| `ContainerRenderer` | 1 file | 97 | Duplicado muerto |
| `layoutValidation.ts` | 1 file | 56 | Código muerto |
| `ucaPathResolver.ts` | 1 file | 92 | Código muerto |
| Inspector genérico (governance) | `inspector/` ~110 files | ~11,329 | Editores específicos por tipo |
| **Blueprint infraestructura (se elimina)** | | | |
| `ucaInjection.ts` | 1 file | 267 | Inyección 10 pasos → simple clone |
| `blueprintValidator.ts` | 1 file | 285 | Validación contra catálogo → el editor valida inline |
| `blueprintResolver.ts` | 1 file | 53 | Normalización → no necesaria |
| `blueprintUtils.ts` | 1 file | ~50 | Util cliente → no necesaria |
| `useBlueprintInjection.ts` | 1 file | ~200 | State machine inyección → no necesaria |
| `BlueprintLibraryPanel.tsx` | 1 file | ~200 | Se reescribe como file browser |
| `ucaBridge.ts` (parte blueprintToTree) | ~1 file | ~165 | Compilación blueprint → conversor simple |
| `IdManager.ts` | 1 file | ~80 | ID remapping → UUIDs fresh |
| `AutoWireResolver.ts` | 1 file | ~100 | Auto-wiring → se elimina |
| `blueprintValidator.test.ts` + integration | 2 files | ~1,685 | Tests de infraestructura eliminada |
| `blueprint-injection.e2e.ts` | 1 file | ~200 | E2E de infraestructura eliminada |
| **Template/module system** | varios | ~400 | No aplica |
| **Total eliminable** | **~170 files** | **~19,000** | |

---

## 9. Lo que se conserva

| Sistema | Archivos | LOC | Motivo |
|---------|----------|-----|--------|
| Rack viewport + rulers + guides | `viewport/` | ~600 | Núcleo del editor |
| ViewportControls / pan/zoom | `viewport/` | ~200 | Navegación |
| Rack grid overlay | `VirtualRack.tsx` | ~100 | Alineación |
| Primitivas de render (refactorizadas) | varias | ~500 | Lógica de dibujo (SVG, filmstrips) → React components |
| Sistema de assets | varios | ~300 | Referencias a filmstrips y PNGs |
| Sistema de colores / skins | varios | ~300 | Variantes de aspecto |
| **ElementCatalog** | `governance/ElementCatalog.ts` | 1,100 | Variantes, validaciones, slots, capacidades — fuente de datos para editores |
| History / undo-redo | `services/` | ~500 | Deshacer/rehacer |
| Persistencia / load-save | `services/` | ~200 | Guardado local |
| Blueprints JSON existentes | `public/blueprints/*.json` | 4 files | Se migran al nuevo formato |
| **Total conservado** | | **~3,800** | |

---

## 10. Plan de implementación

### Fase 0 — Fundación (tipos + data layer)

**Objetivo**: Tener los tipos nuevos definidos, el convertidor legacy funcionando, y poder leer/escribir manifests en el nuevo formato sin cambiar el render todavía.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 0.1 Definir tipos nuevos | `src/omega-ui-core/types/rack.ts` (nuevo) | ~80 | — |
| 0.2 Escribir convertidor OMEGA_Manifest → RackManifest | `src/omega-ui-core/converters/fromLegacyManifest.ts` (nuevo) | ~200 | 0.1 |
| 0.3 Escribir convertidor BlueprintDefinition → GroupNode | `src/omega-ui-core/converters/fromLegacyBlueprint.ts` (nuevo) | ~150 | 0.1 |
| 0.4 Migrar los 4 blueprints JSON al nuevo formato | `public/blueprints/*.rack-blueprint.json` (4 archivos) | ~50 | 0.3 |
| 0.5 Verificar que el convertidor coverage todos los manifests de desarrollo existentes | — | — | 0.2 |

**Detalles**:

- **0.1**: El archivo `rack.ts` exporta `RackManifest`, `RackChild`, `GroupNode`, `ComponentNode`, `ComponentStyle`, `BindConfig`, `ComponentType`. NO toca `manifest.ts` todavía (convivirán ambos tipos).
- **0.2**: El convertidor legacy→nuevo mapea `ui.tree` (árbol UCA) → `children` plano. Los nodos `cell` con `cellRef` se convierten a `ComponentNode`. Los `container`/`group` se convierten a `GroupNode`. Los nodos sin `cellRef` o con tipos no soportados se saltan con warning.
- **0.3**: El convertidor de blueprint: `container` → `GroupNode`, `cell` → `ComponentNode`, `style` → `ComponentStyle`, `bind` → `BindConfig`. `layout.mode stack-v/stack-h` se resuelve a coordenadas x,y absolutas aplicando padding+gap+acumulación.

**Criterio de salida**: `convertir(manifest_legacy).children` contiene los mismos elementos visuales que renderiza el VirtualRack actual, verificable extrayendo IDs y comparando.

---

### Fase 1 — Componentes React

**Objetivo**: Cada primitiva (knob, slider, led, etc.) tiene un componente React que renderiza su SVG igual que el renderer legacy, pero como JSX nativo.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 1.1 KnobComponent | `src/features/manifest-editor/components/rack/knob/KnobComponent.tsx` (nuevo) | ~120 | 0.1 |
| 1.2 SliderComponent | `src/features/manifest-editor/components/rack/slider/SliderComponent.tsx` (nuevo) | ~100 | 0.1 |
| 1.3 LedComponent | `src/features/manifest-editor/components/rack/led/LedComponent.tsx` (nuevo) | ~60 | 0.1 |
| 1.4 DisplayComponent | `src/features/manifest-editor/components/rack/display/DisplayComponent.tsx` (nuevo) | ~80 | 0.1 |
| 1.5 PortComponent | `src/features/manifest-editor/components/rack/port/PortComponent.tsx` (nuevo) | ~80 | 0.1 |
| 1.6 LabelComponent | `src/features/manifest-editor/components/rack/label/LabelComponent.tsx` (nuevo) | ~50 | 0.1 |
| 1.7 SwitchComponent | `src/features/manifest-editor/components/rack/switch/SwitchComponent.tsx` (nuevo) | ~80 | 0.1 |
| 1.8 ButtonComponent | `src/features/manifest-editor/components/rack/button/ButtonComponent.tsx` (nuevo) | ~70 | 0.1 |
| 1.9 GroupComponent | `src/features/manifest-editor/components/rack/GroupComponent.tsx` (nuevo) | ~40 | 0.1 |

**Detalles**:

- Cada `*Component` recibe `{ node: ComponentNode; selected?: boolean; onSelect?: (id: string) => void }`.
- La lógica de dibujo se extrae de los renderers legacy existentes (`KnobRenderer.ts`, `SliderRenderer.ts`, etc.) pero devuelve JSX en lugar de strings HTML.
- Los SVG paths, cálculos de ángulos, y lógica de filmstrips se mantienen idénticos.
- `GroupComponent` es un `<div>` con `style={{ transform: translate(x, y), position: 'absolute' }}` que itera `children` y renderiza cada hijo según su `type`.

**Criterio de salida**: Cada componente se puede renderizar en una página de pruebas con datos mock y se ve visualmente igual que el renderer legacy.

---

### Fase 2 — Rack renderer

**Objetivo**: VirtualRack renderiza usando los nuevos componentes. El rack existente y el nuevo conviven durante la transición.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 2.1 Crear RackGrid component | `src/features/manifest-editor/components/rack/RackGrid.tsx` (nuevo) | ~80 | 1.x |
| 2.2 Añadir flag de feature toggle en VirtualRack | `VirtualRack.tsx` (modificar) | ~10 | 2.1 |
| 2.3 Probar side-by-side (legacy vs nuevo) | — | — | 2.2 |

**Detalles**:

- `RackGrid` recibe `RackChild[]` y un `RackManifest`, itera los hijos y renderiza `GroupComponent` o `*Component` según `type`.
- El feature toggle es una constante `USE_NEW_RENDERER = false` en VirtualRack (o una URL query param). Cuando es `true`, lee el manifest convertido a `RackManifest` y renderiza `RackGrid` en lugar del pipeline legacy. Cuando es `false`, todo sigue igual.
- La convivencia permite comparar visualmente y hacer regression testing sin afectar al usuario.

**Criterio de salida**: Con `USE_NEW_RENDERER = true`, el rack se ve igual que con `false` para los manifests de desarrollo existentes.

---

### Fase 3 — Editores

**Objetivo**: Cada tipo de componente tiene un editor en el panel lateral. Se elimina el inspector legacy progresivamente.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 3.1 Editor base (selector de tipo + posición) | `src/features/manifest-editor/components/inspector/rack/RackChildEditor.tsx` (nuevo) | ~60 | 2.1 |
| 3.2 KnobEditor | `src/features/manifest-editor/components/inspector/rack/editors/KnobEditor.tsx` (nuevo) | ~100 | 3.1, 0.1 |
| 3.3 SliderEditor | similar | ~80 | 3.1 |
| 3.4 LedEditor | similar | ~50 | 3.1 |
| 3.5 DisplayEditor | similar | ~60 | 3.1 |
| 3.6 PortEditor | similar | ~60 | 3.1 |
| 3.7 LabelEditor | similar | ~50 | 3.1 |
| 3.8 SwitchEditor | similar | ~60 | 3.1 |
| 3.9 ButtonEditor | similar | ~50 | 3.1 |
| 3.10 GroupEditor (inline children list) | `src/features/manifest-editor/components/inspector/rack/editors/GroupEditor.tsx` (nuevo) | ~120 | 3.1 |
| 3.11 Reemplazar PropertyPanel para nodos rack | `PropertyPanel.tsx` (modificar) | ~100 | 3.2–3.10 |
| 3.12 Eliminar secciones del inspector no usadas | varios | — | 3.11 |

**Detalles**:

- **3.1**: `RackChildEditor` detecta `node.type` y delega al editor específico. Muestra siempre los campos comunes (posición x,y, tamaño w,h).
- **3.2–3.9**: Cada editor usa controles nativos (select para variante, color picker para color, input para bind, etc.). Los selects de variante se pueblan desde `ElementCatalog` (ej: para `knob`, busca las variants del elemento `knob` en el catálogo).
- **3.10**: `GroupEditor` lista los hijos con una fila por hijo mostrando tipo + label + bind + un botón para "abrir" ese hijo en el editor específico.
- **3.11**: `PropertyPanel` detecta si el ítem seleccionado es un `RackChild` (por tipo o por flag). Si lo es, renderiza `RackChildEditor` en lugar del pipeline actual de secciones. Si no, sigue usando el inspector legacy. Esto permite la migración progresiva.
- **3.12**: Una vez que `RackChildEditor` cubre todos los casos, se eliminan las secciones del inspector que ya no se usan (AestheticSection, LogicSection, AttachmentsSection, etc.).

**Criterio de salida**: Seleccionar un knob en el rack muestra el KnobEditor con sus campos. Cambiar la variante se refleja al instante en el render. El inspector legacy sigue funcionando para lo que no se ha migrado.

---

### Fase 4 — Blueprint system

**Objetivo**: Los blueprints se instancian con clone+UUIDs. El panel de librería se reescribe.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 4.1 Función `instantiateBlueprint` | `src/omega-ui-core/blueprints/instantiate.ts` (nuevo) | ~40 | 0.1 |
| 4.2 Reescribir BlueprintLibraryPanel | `BlueprintLibraryPanel.tsx` (reescribir) | ~150 | 4.1, 2.1 |
| 4.3 Actualizar `useBlueprintCatalog` | `useBlueprintCatalog.ts` (modificar) | ~50 | 0.4 |
| 4.4 Eliminar pipeline de inyección legacy | `ucaInjection.ts`, `useBlueprintInjection.ts`, etc. | eliminar | 4.2 |

**Detalles**:

- **4.1**: `instantiateBlueprint(json: GroupNode): GroupNode` recorre el árbol, asigna `crypto.randomUUID()` a cada nodo, limpia `bind.paramId` (deja el resto), devuelve el grupo clonado.
- **4.2**: `BlueprintLibraryPanel` se simplifica a: leer `index.json`, mostrar lista de blueprints con nombre y descripción, botón "Add to rack" que llama `instantiateBlueprint` y añade el resultado al manifest. Sin vista previa de inyección, sin dry-run, sin placeholders.
- **4.3**: `useBlueprintCatalog` deja de cargar el pipeline de inyección. Solo hace fetch del JSON y devuelve el GroupNode parseado.

**Criterio de salida**: Botón "Add to rack" en un blueprint → aparece el grupo en el rack con nuevos IDs. No hay prompts de placeholders ni dry-run.

---

### Fase 5 — Limpieza

**Objetivo**: Eliminar todo el código legacy que ya no se usa.

| Tarea | Archivos | LOC estimado | Depende de |
|-------|----------|-------------|------------|
| 5.1 Eliminar UCA tree (excepto ElementCatalog) | `uca/` ~17 files | ~2,150 | 2.3, 3.12 |
| 5.2 Eliminar UniversalRenderer | `renderers/UniversalRenderer/` ~9 files | ~772 | 2.3 |
| 5.3 Eliminar CellRenderer | `renderers/CellRenderer/` ~4 files | ~526 | 2.3 |
| 5.4 Eliminar renderers primitivos legacy | ~11 files | ~531 | 1.x |
| 5.5 Eliminar Pipeline de inyección | ~6 files | ~900 | 4.4 |
| 5.6 Eliminar inspector governance legacy | `inspector/` ~100 files | ~10,000 | 3.12 |
| 5.7 Eliminar `Presentation` type y campos legacy de manifest.ts | `manifest.ts` (modificar) | ~150 | 0.2 |
| 5.8 Eliminar tests de infraestructura eliminada | ~3 files | ~1,885 | 5.1–5.6 |
| 5.9 Renombrar y reorganizar directorios | varios | — | 5.1–5.8 |

**Detalles**:

- Cada sub-fase es independiente y se puede hacer en cualquier orden, siempre que la fase anterior esté completa.
- Después de cada eliminación, ejecutar typecheck y lint para verificar que no hay imports rotos.
- Al final, el árbol `src/` queda significativamente más plano y pequeño.

**Criterio de salida**: `npx tsc --noEmit` pasa sin errors. `npm run lint` sin errores nuevos. El editor abre y renderiza correctamente.

---

### Resumen de fases

| Fase | Descripción | LOC nuevo | LOC eliminado | Dependencias |
|------|-------------|-----------|---------------|--------------|
| 0 | Tipos + conversores | ~480 | 0 | — |
| 1 | Componentes React | ~680 | 0 | Fase 0 |
| 2 | Rack renderer | ~90 | ~0 (toggle) | Fase 1 |
| 3 | Editores | ~790 | ~10,000 (progresivo) | Fase 2 |
| 4 | Blueprint system | ~240 | ~1,200 | Fase 0, Fase 2 |
| 5 | Limpieza | 0 | ~17,000 | Fases 1–4 |
| **Total** | | **~2,280** | **~28,200** | |

El código nuevo (~2,280 LOC) es ~8% de lo que se elimina (~28,200 LOC). El esfuerzo real está en la Fase 3 (editores, ~790 LOC) y la Fase 1 (componentes, ~680 LOC). La Fase 5 es mecánica (eliminar archivos).
