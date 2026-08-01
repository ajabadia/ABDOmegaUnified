# Plan de Implementación: Sistema de Patch Cables Visuales

**Proyecto:** ABDOmegaUnified · OMEGA Modular Synth Era 7  
**Audiencia:** Equipo de desarrollo junior  
**Estado:** SOLO PLANIFICACIÓN — No ejecutar hasta aprobación  

---

## Índice

1. [Contexto y Objetivo](#1-contexto-y-objetivo)
2. [Arquitectura Actual del Proyecto (Lo Que Ya Existe)](#2-arquitectura-actual-del-proyecto)
3. [Diseño de la Solución](#3-diseño-de-la-solución)
4. [Fase 1: Infraestructura SVG y Registro de Jacks](#4-fase-1-infraestructura-svg-y-registro-de-jacks)
5. [Fase 2: Motor de Curvas Bézier (CableRenderer)](#5-fase-2-motor-de-curvas-bézier-cablerenderer)
6. [Fase 3: Sincronización con la Matrix](#6-fase-3-sincronización-con-la-matrix)
7. [Fase 4: Interacción — Evasión de Controles](#7-fase-4-interacción--evasión-de-controles)
8. [Fase 5: Pulido Visual y UX](#8-fase-5-pulido-visual-y-ux)
9. [Ideas Adicionales de Proyectos de Referencia](#9-ideas-adicionales-de-proyectos-de-referencia)
10. [Riesgos, Trampas y Cómo Evitarlas](#10-riesgos-trampas-y-cómo-evitarlas)
11. [Glosario para Juniors](#11-glosario-para-juniors)
12. [Checklist de Verificación](#12-checklist-de-verificación)

---

## 1. Contexto y Objetivo

### ¿Qué queremos conseguir?

Cuando el usuario conecta un **source** (salida de un módulo) con un **target** (entrada de otro módulo) en la **Matrix de Modulación**, queremos que aparezca un **cable virtual colgante** sobre el rack, conectando visualmente los dos conectores jack de 3.5mm que se ven en los paneles de los módulos. El cable debe:

- Colgar con gravedad realista (como un cable de verdad).
- Tener un color que indique el tipo de señal (audio, CV, gate, MIDI).
- **No molestar** cuando el usuario quiera tocar un potenciómetro que esté debajo del cable.
- Aparecer y desaparecer automáticamente según el estado de la Matrix.

### ¿Qué NO es este sistema?

- **No es funcional**: no transporta audio ni datos. El ruteo real ocurre en C++ (JUCE backend) a través del `rpcCommandDispatcher`. Los cables son puramente visuales/decorativos.
- **No modifica el backend**: todo ocurre en el navegador (WebView). El código C++ no se toca.

---

## 2. Arquitectura Actual del Proyecto

> **IMPORTANTE:** Antes de escribir una sola línea de código, entended cómo funciona lo que ya existe. Si no entendéis esta sección, preguntad antes de seguir.

### 2.1. Estructura del DOM del Rack

```
#omega-rack  (div.rack-container)
├── #upper-rack  (div.rack-row.upper)  ← Módulos Aux / 1U (Aux / Monitoring)
│   ├── .power-bus-container           ← Decorativo, z-index: 2
│   ├── .module.module-v7[0]           ← Módulo montado (#mod-v7_1), z-index: 30
│   └── .module.module-v7[1]       
└── #lower-rack  (div.rack-row.lower)  ← Módulos Main / 3U (VCO, VCF, ADSR...)
    ├── .power-bus-container           ← Decorativo, z-index: 2
    ├── .module.module-v7[0]           ← Módulo montado (#mod-v7_2), z-index: 30
    └── .module.module-v7[1]
```

**Ficheros clave de arquitectura:**
- Source Code Canonical: `host/ui/src/` (Compilado a `bundle.js` mediante `esbuild`).
- `host/ui/omega-ui-core/`: Es un espejo sincronizado en **Solo Lectura** (proveniente de `ABDOmegaEditor/src/omega-ui-core/`). **NO EDITAR DIRECTAMENTE**.
- DOM Rack & Módulos: `host/ui/src/Logic/ModuleManager.ts` & `ModuleInstantiator.ts`.
- Renderizado de Jacks: `host/ui/omega-ui-core/renderers/PortRenderer.ts` (función `renderPortHTML`).

### 2.2. Capas de Z-Index (De Abajo a Arriba)

| z-index | Elemento | Descripción |
|---------|----------|-------------|
| 1 | Fondo de madera (oak_wood.jpg) | `background-image` del `.rack-row` |
| 2 | `.power-bus-container` | PCBs decorativos sobre la madera |
| 5 | `::before` y `::after` | Rieles de aluminio (rails) |
| 30 | `.module`, `.aseptic-module-panel` | Módulos Eurorack montados |
| **35** | **`#patch-cables-overlay` (NUEVO)** | **← AQUÍ van los cables** |
| 50 | `.btn-remove-module` | Botón × para quitar módulos |
| 10000 | `#debug-console` | Consola de depuración flotante |

### 2.3. Cómo se Renderizan los Jacks Realmente en el Código Fuente

A diferencia de lo asumido inicialmente, los jacks **ya poseen un atributo nativo `data-source`** emitido por `PortRenderer.renderPortHTML` en `omega-ui-core`:

```typescript
// host/ui/omega-ui-core/renderers/PortRenderer.ts
export const renderPortHTML = (props: PortProps): string => {
  // ...
  return `<div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${inlineStyles}"><div class="port-inner"><div class="port-led" style="${ledStyle}"></div></div></div>`;
};
```

* **Estructura emitida en el DOM:**
  ```html
  <div class="port-socket size-A color-cyan" data-source="saw_out">...</div>
  ```
* **Conclusión de Arquitectura:** **NO es necesario modificar `omega-ui-core` ni añadir nuevos atributos HTML.** Los jacks se pueden localizar directamente buscando `.port-socket[data-source]` dentro de cada contenedor de módulo `.module[id^="mod-v7_"]` o `.aseptic-module-panel`.

### 2.4. Cómo se Almacenan las Conexiones en la Matrix

La Matrix se guarda en `state.patch.patchbayMatrix` como un array de "slots". Cada slot tiene esta estructura (visible en `matrixTemplates.ts` líneas 92–128):

```javascript
{
  source: "1.saw_out",   // instanceId.portId
  target: "3.audio_in",  // instanceId.portId
  amount: 1.0,                          // Multiplicador (0 a 2)
  active: true,                          // Si la conexión está activa
  via: ""                                // Ruteo intermedio (opcional)
}
```

Los IDs de source/target siguen el formato: `{instanceId}.{portId}`, donde:
- `instanceId` = **número** de instancia del módulo en la rack (ej: `1`; el módulo correspondiente en el DOM es `#mod-v7_1`)
- `portId` = el `id` del jack en el manifest (ej: `saw_out`)

> **IMPORTANTE:** El formato `{typeId}_{índice}` (ej: `oscillator_vA_1`) SOLO existe como **fallback** de `buildMetadataFromInventory()` (matrixLayout.ts líneas 140 y 151), usado cuando el estado del módulo carece de `instanceId` numérico (módulos añadidos vía ModuleBrowser/paneles aseptic). En producción Era 7 el `instanceId` siempre es numérico.

La función `buildMetadataFromInventory()` en `matrixLayout.ts` (líneas 128–197) es la que construye estos IDs. Esta es la **fuente de verdad** que el sistema de cables DEBE reutilizar.

### 2.5. Cómo se Detectan Cambios de Estado

El `RuntimeStore` (`runtimeStores.ts` líneas 37–47) usa un patrón Observer con flags binarios:

```javascript
// Suscribirse a cambios:
const unsubscribe = window.runtimeStore.subscribe((changeType) => {
  if (changeType & 1 /* Structure */) {
    // Los módulos o la matrix han cambiado
    const state = window.runtimeStore.getSnapshot();
    const matrix = state.patch.patchbayMatrix; // ← Aquí están las conexiones
  }
});
```

Los tipos de cambio son:
- `1` = Structure (módulos añadidos/quitados, matrix cambiada)
- `2` = Parameters (knobs girados)
- `4` = Telemetry
- `8` = System

### 2.6. Registros de Puertos por Tipo de Módulo

En `matrixLayout.ts` (líneas 8–42) existe `DEFAULT_REGISTRIES`, que define los puertos de cada tipo de módulo con su **tipo de señal** (`AUDIO`, `CV`, `GATE`, `MIDI`) y su **dirección** (`input`, `output`):

```javascript
export const DEFAULT_REGISTRIES = {
  oscillator_vA: [
    { id: 'pitch_in', label: 'PITCH V/OCT', type: 'CV',    roles: ['input'] },
    { id: 'fm_in',    label: 'FM IN',       type: 'CV',    roles: ['input'] },
    { id: 'sine_out',  label: 'SINE OUT',   type: 'AUDIO', roles: ['output'] },
    { id: 'saw_out',   label: 'SAW OUT',    type: 'AUDIO', roles: ['output'] },
  ],
  filter_vA: [
    { id: 'audio_in',  label: 'AUDIO IN',   type: 'AUDIO', roles: ['input'] },
    { id: 'cutoff_cv', label: 'CUTOFF CV',  type: 'CV',    roles: ['input'] },
    { id: 'audio_out', label: 'AUDIO OUT',  type: 'AUDIO', roles: ['output'] },
  ],
  // ... más módulos
};
```

Estos registros son la fuente para determinar el **color** del cable (audio=verde, CV=cian, gate=rojo, MIDI=violeta).

---

## 3. Diseño de la Solución

### 3.1. Decisión Técnica: ¿SVG o Canvas?

| Criterio | SVG | Canvas |
|----------|-----|--------|
| Cables esperados | < 32 (nuestro `maxSlots`) | Necesario para > 200 |
| Hit-testing (clic en cable) | Gratis (eventos DOM) | Manual (matemáticas) |
| Estilado (colores, hover) | CSS puro | Código JS |
| Animaciones | CSS transitions | `requestAnimationFrame` |
| Debug visual | Inspeccionar en DevTools | No inspeccionable |
| Complejidad de implementación | Baja | Alta |

**Decisión: SVG.** Nuestro sistema tiene un máximo de 32 slots en la Matrix. Con SVG, cada cable es un `<path>` que el navegador maneja nativamente. Un junior puede inspeccionarlo con DevTools, estilarlo con CSS y debuggearlo visualmente.

### 3.2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────┐
│                   RuntimeStore                       │
│         (state.patch.patchbayMatrix[])               │
└─────────────────┬───────────────────────────────────┘
                  │ subscribe(ChangeType.Structure)
                  ▼
┌─────────────────────────────────────────────────────┐
│              PatchCableManager                       │
│  - Escucha cambios en la Matrix                      │
│  - Mantiene Map<slotIndex, CableInstance>             │
│  - Orquesta creación/eliminación de cables           │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌─────────────────────┐
│ JackRegistry │    │   CableRenderer     │
│ - Mapea IDs  │    │ - Calcula Bézier    │
│   a coords   │    │ - Dibuja <path>     │
│   (x, y)     │    │ - Anima física      │
└──────────────┘    └─────────────────────┘
                            │
                            ▼
                    ┌─────────────────────┐
                    │  CableInteraction   │
                    │ - Ghosting          │
                    │ - Repulsión elástica│
                    │ - Tecla [H]        │
                    └─────────────────────┘
```

### 3.3. Ficheros Nuevos a Crear

```
host/ui/src/Components/cables/
├── PatchCableManager.ts      ← Orquestador principal
├── JackRegistry.ts           ← Registro de coordenadas de jacks
├── CableRenderer.ts          ← Matemáticas de Bézier y renderizado SVG
├── CableInteraction.ts       ← Lógica de evasión y transparencia
└── cableConstants.ts         ← Colores, constantes físicas, config
```

```
host/ui/css/
└── cables.css                ← Estilos de los cables SVG
```

### 3.4. Ficheros Existentes a Modificar (Cambios Mínimos)

| Fichero | Cambio | Riesgo |
|---------|--------|--------|
| `index.html` | Añadir `<svg id="patch-cables-overlay">` dentro de `#omega-rack` | Ninguno |
| `host/ui/src/index.ts` | Instanciar `PatchCableManager`, llamar `.init()` y exponer `window.patchCableManager` | Aditivo |
| `layout.css` | Añadir `@import` de `cables.css` | Ninguno |

> **IMPORTANTE:** NO se edita `bundle.js` bajo ninguna circunstancia. Es un artefacto **generado** por esbuild (se regenera con `npx esbuild src/index.ts --bundle --outfile=bundle.js`). Toda la lógica nueva vive en `host/ui/src/...` y llega a `bundle.js` solo vía recompilación. Tampoco se añaden atributos nuevos a los jacks (ya emiten `.port-socket[data-source]` de forma nativa).

> **NOTA:** No se modifica ningún fichero TypeScript de la Matrix (matrixLayout.ts, matrixTemplates.ts, matrixEvents.ts), del RuntimeStore ni del backend C++.

---

## 4. Fase 1: Infraestructura SVG y Registro de Jacks

> **Estimación:** 2–3 días para un junior  
> **Prerequisito:** Ninguno  
> **Resultado esperado:** Los jacks son localizables por ID y existe la capa SVG vacía

### 4.1. Tarea 1A: Añadir el Overlay SVG al DOM

**Fichero a modificar:** `host/ui/index.html`  
**Ubicación:** Justo antes del cierre de `#omega-rack` (antes de la línea 178)

```html
    <!-- (ya existentes) -->
    <div id="upper-rack" class="rack-row upper">...</div>
    <div id="lower-rack" class="rack-row lower">...</div>
    
    <!-- NUEVO: Capa de cables de parcheo -->
    <svg id="patch-cables-overlay"
         xmlns="http://www.w3.org/2000/svg"
         class="patch-cables-overlay">
      <defs>
        <!-- Filtro de sombra para dar volumen al cable -->
        <filter id="cable-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
        </filter>
      </defs>
      <!-- Los <path> de los cables se inyectan aquí dinámicamente -->
    </svg>
</div>  <!-- fin #omega-rack -->
```

**¿Por qué dentro de `#omega-rack`?** Porque así las coordenadas del SVG son relativas al rack, no a la ventana. Si el rack se mueve (ej: por scroll de la página), los cables se mueven con él automáticamente.

### 4.2. Tarea 1B: Crear cables.css

**Fichero nuevo:** `host/ui/css/cables.css`

```css
/* ═══════════════════════════════════════════════════
   PATCH CABLE OVERLAY — Capa de cables SVG
   ═══════════════════════════════════════════════════ */

/*
 * REGLA DE ORO: pointer-events: none
 * Sin esto, el SVG captura todos los clics del ratón
 * y los potenciómetros de los módulos DEJAN DE FUNCIONAR.
 * Este es el error #1 que cometen los juniors al trabajar
 * con overlays SVG.
 */
#patch-cables-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 35;
    pointer-events: none;
    overflow: visible;
}

/* ─── Cable individual ─── */
.patch-cable {
    fill: none;
    stroke-width: 4px;
    stroke-linecap: round;
    filter: url(#cable-shadow);
    pointer-events: none;
    /* Transición suave al hacer ghosting */
    transition: opacity 0.3s ease, stroke-width 0.2s ease;
}

/* ─── Estado "Ghosted": cable semi-transparente ─── */
/* Se activa cuando el cursor está sobre un control */
.patch-cable.ghosted {
    opacity: 0.12;
    stroke-dasharray: 8 4;
    stroke-width: 2px;
    filter: none;
}

/* ─── Estado "Hidden": cables ocultos con tecla [H] ─── */
#patch-cables-overlay.cables-hidden .patch-cable {
    opacity: 0;
    transition: opacity 0.2s ease;
}

/* ─── Colores por tipo de señal ─── */
.patch-cable[data-signal="audio"] { stroke: #10b981; } /* Verde esmeralda */
.patch-cable[data-signal="cv"]    { stroke: #06b6d4; } /* Cian neón       */
.patch-cable[data-signal="gate"]  { stroke: #ef4444; } /* Rojo carmesí    */
.patch-cable[data-signal="midi"]  { stroke: #a855f7; } /* Violeta neón    */

/* ─── Plug circles en los extremos del cable ─── */
.cable-plug {
    pointer-events: none;
    /* Sombra sutil en el "enchufe" */
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}

/* ─── Animación de enchufado (aparición del cable) ─── */
@keyframes cable-drop-in {
    0%   { stroke-dashoffset: 800; opacity: 0; }
    40%  { opacity: 0.8; }
    100% { stroke-dashoffset: 0; opacity: 1; }
}
.patch-cable.entering {
    stroke-dasharray: 800;
    animation: cable-drop-in 0.5s ease-out forwards;
}
```

### 4.3. Tarea 1C: Crear el JackRegistry

**Fichero nuevo:** `host/ui/src/Components/cables/JackRegistry.ts`

```typescript
/**
 * JackRegistry — Mantiene un mapa de coordenadas (x, y) para cada 
 * jack visible en el rack.
 * 
 * Un jack se identifica por su "qualifiedId": "{moduleInstanceId}.{jackId}"
 * Ejemplo: "1.saw_out" o "oscillator_vA_1.saw_out"
 * 
 * Las coordenadas se calculan con getBoundingClientRect() relativo al
 * contenedor #omega-rack.
 */

export interface JackPosition {
  x: number;           // Centro X del jack, relativo al #omega-rack
  y: number;           // Centro Y del jack, relativo al #omega-rack
  element: HTMLElement; // Referencia al elemento DOM del jack
}

export class JackRegistry {
  private positions: Map<string, JackPosition> = new Map();
  private rackElement: HTMLElement | null = null;

  refresh(): void {
    this.rackElement = document.getElementById('omega-rack');
    if (!this.rackElement) return;

    this.positions.clear();
    const rackRect = this.rackElement.getBoundingClientRect();

    // 1. Escanear módulos de producción Era 7 (.module[id^="mod-v7_"])
    const modules = this.rackElement.querySelectorAll('.module');
    modules.forEach((modEl) => {
      const rawId = modEl.id; // ej: "mod-v7_1" o "mod-v7_15"
      if (!rawId) return;

      const instanceId = rawId.replace(/^mod-v7_/, ''); // ej: "1"

      const sockets = modEl.querySelectorAll('.port-socket[data-source]');
      sockets.forEach((socketEl) => {
        const portId = (socketEl as HTMLElement).dataset.source;
        if (!portId) return;

        const rect = socketEl.getBoundingClientRect();
        const qualifiedId = `${instanceId}.${portId}`;

        this.positions.set(qualifiedId, {
          x: rect.left + rect.width / 2 - rackRect.left,
          y: rect.top + rect.height / 2 - rackRect.top,
          element: socketEl as HTMLElement,
        });
      });
    });

    // 2. Escanear módulos de fallback del ModuleBrowser (.aseptic-module-panel)
    // NOTA: Los paneles aseptic también renderizan sus jacks a través de
    // CellRenderer → PortRenderer, así que usan la MISMA marca
    // `.port-socket[data-source]` (la clase ".module-jack" NO existe).
    // Este bloque replica exactamente la lógica de buildMetadataFromInventory()
    // (matrixLayout.ts:145-155): typeId + contador {typeId}_{idx}.
    const asepticPanels = this.rackElement.querySelectorAll('.aseptic-module-panel');
    const typeCounters: Record<string, number> = {};

    asepticPanels.forEach((panel) => {
      const moduleTypeId = (panel as HTMLElement).dataset.moduleId;
      if (!moduleTypeId) return;

      typeCounters[moduleTypeId] = (typeCounters[moduleTypeId] || 0) + 1;
      const instanceId = `${moduleTypeId}_${typeCounters[moduleTypeId]}`;

      const sockets = panel.querySelectorAll('.port-socket[data-source]');
      sockets.forEach((socketEl) => {
        const jackId = (socketEl as HTMLElement).dataset.source;
        if (!jackId) return;

        // Calcular posición del centro del jack
        const jackRect = socketEl.getBoundingClientRect();
        const qualifiedId = `${instanceId}.${jackId}`;

        this.positions.set(qualifiedId, {
          x: jackRect.left + jackRect.width / 2 - rackRect.left,
          y: jackRect.top + jackRect.height / 2 - rackRect.top,
          element: socketEl as HTMLElement,
        });
      });
    });
  }

  /** Obtiene la posición de un jack por su qualifiedId. */
  getPosition(qualifiedId: string): JackPosition | null {
    return this.positions.get(qualifiedId) || null;
  }

  /** Devuelve todos los IDs registrados (para debug en consola). */
  getAllIds(): string[] {
    return Array.from(this.positions.keys());
  }

  /** Número de jacks registrados (para debug). */
  get count(): number {
    return this.positions.size;
  }
}
```

### 4.5. Tarea 1E: Conectar ResizeObserver y Scroll Listeners

Las posiciones de los jacks cambian cuando:
1. El usuario hace scroll horizontal en un rack
2. La ventana cambia de tamaño
3. Se añade o quita un módulo (los demás se desplazan en el flexbox)

Esto se gestionará dentro del `PatchCableManager`, pero conceptualmente funciona así:

```typescript
// Concepto de los listeners (se implementará dentro de PatchCableManager.init())

// IMPORTANTE: Usar DEBOUNCE.
// Si el usuario redimensiona la ventana arrastrando, se generan 60+ eventos/segundo.
// Sin debounce, recalcularíamos 60 veces por segundo. Con debounce de 50ms, 
// solo recalculamos 1 vez cuando el usuario para de mover.

let debounceTimer: number | undefined;

function debouncedRefresh() {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    jackRegistry.refresh();
    redrawAllCables();
  }, 50);
}

// 1. Redimensionar ventana
window.addEventListener('resize', debouncedRefresh);

// 2. Scroll horizontal en cada rack
document.getElementById('upper-rack')?.addEventListener('scroll', debouncedRefresh);
document.getElementById('lower-rack')?.addEventListener('scroll', debouncedRefresh);

// 3. Módulos añadidos/quitados (cambios en el DOM)
const observer = new MutationObserver(debouncedRefresh);
const upperRack = document.getElementById('upper-rack');
const lowerRack = document.getElementById('lower-rack');
if (upperRack) observer.observe(upperRack, { childList: true });
if (lowerRack) observer.observe(lowerRack, { childList: true });
```

---

## 5. Fase 2: Motor de Curvas Bézier (CableRenderer)

> **Estimación:** 3–4 días para un junior  
> **Prerequisito:** Fase 1 completada  
> **Resultado esperado:** Se puede dibujar un cable colgante manualmente desde la consola

### 5.1. La Matemática del Cable Colgante (Explicación para Juniors)

Un cable real cuelga formando una **catenaria** (curva definida por funciones hiperbólicas). Pero calcular una catenaria es caro y complejo. En su lugar usamos una **curva Bézier cúbica**, que el navegador renderiza de forma nativa y casi gratis.

Una curva Bézier cúbica tiene 4 puntos:

```
P0 (jack source)            P3 (jack target)
      •───────────────────────────•
       \                         /
        \                       /
         \_____________________/    ← El cable "cuelga" aquí
           C1 (control 1)   C2 (control 2)
```

- **P0** = Centro del jack de origen (source)
- **P3** = Centro del jack de destino (target)
- **C1** = Punto de control 1 (tira de la curva hacia abajo desde P0)
- **C2** = Punto de control 2 (tira de la curva hacia abajo desde P3)

En SVG, esto se escribe: `M x0 y0 C cx1 cy1, cx2 cy2, x3 y3`

### 5.2. Fichero de Constantes

**Fichero nuevo:** `host/ui/src/Components/cables/cableConstants.ts`

```typescript
/**
 * Constantes para la física y apariencia de los cables.
 * 
 * REGLA: Si un junior necesita ajustar "cuánto cuelga el cable" o
 * "qué color tiene", solo toca ESTE fichero. No hay números mágicos
 * dispersos por el código.
 */

// ─── Física del cable ───
export const CABLE_PHYSICS = {
  /** Caída mínima en píxeles (cable corto entre jacks cercanos) */
  BASE_SAG: 40,
  
  /** Factor de caída según distancia (más lejos → más cuelga) */
  SAG_FACTOR: 0.15,
  
  /** Máxima caída permitida (para que cables muy largos no se salgan del rack) */
  MAX_SAG: 200,
  
  /** Grosor del cable en píxeles */
  STROKE_WIDTH: 4,
  
  /** Radio del círculo "plug" en los extremos del cable */
  PLUG_RADIUS: 5,
};

// ─── Colores por tipo de señal ───
export const SIGNAL_COLORS: Record<string, string> = {
  audio: '#10b981',   // Verde esmeralda
  cv:    '#06b6d4',   // Cian neón
  gate:  '#ef4444',   // Rojo carmesí
  midi:  '#a855f7',   // Violeta neón
};

// ─── Interacción ───
export const INTERACTION = {
  /** Radio en px alrededor del cursor para activar ghosting */
  GHOST_DETECTION_RADIUS: 80,
  
  /** Opacidad del cable en modo ghost */
  GHOST_OPACITY: 0.12,
  
  /** Puntos a muestrear en la curva Bézier para detección de colisión */
  CURVE_SAMPLES: 20,
  
  /** Tiempo de debounce para resize/scroll (ms) */
  DEBOUNCE_MS: 50,
};
```

### 5.3. CableRenderer

**Fichero nuevo:** `host/ui/src/Components/cables/CableRenderer.ts`

```typescript
import { CABLE_PHYSICS, SIGNAL_COLORS } from './cableConstants';

export interface CableEndpoints {
  x1: number; y1: number;  // Centro del jack source
  x2: number; y2: number;  // Centro del jack target
}

// Namespace SVG (necesario para crear elementos SVG con JavaScript)
const SVG_NS = 'http://www.w3.org/2000/svg';

export class CableRenderer {

  /**
   * Calcula el string "d" del path SVG para un cable colgante.
   * 
   * EXPLICACIÓN PASO A PASO:
   * 1. Se calcula la distancia entre los dos jacks.
   * 2. Se calcula cuánto debe "colgar" el cable (sag/panda).
   *    Fórmula: sag = BASE_SAG + distancia * SAG_FACTOR
   *    (limitado a MAX_SAG para que no se salga del rack)
   * 3. Se colocan los puntos de control DEBAJO de cada jack.
   *    En pantalla, Y positivo = abajo, así que sumamos sag a la Y.
   * 4. Se genera el string SVG: "M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"
   */
  static calculatePath(ep: CableEndpoints): string {
    const { x1, y1, x2, y2 } = ep;

    // Distancia euclidiana entre los dos jacks
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cuánto cuelga el cable
    const sag = Math.min(
      CABLE_PHYSICS.BASE_SAG + distance * CABLE_PHYSICS.SAG_FACTOR,
      CABLE_PHYSICS.MAX_SAG
    );

    // Puntos de control: mismo X que los jacks, pero desplazados hacia abajo
    const cx1 = x1;
    const cy1 = y1 + sag;
    const cx2 = x2;
    const cy2 = y2 + sag;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  /**
   * Crea un nuevo elemento <path> SVG para un cable.
   * 
   * ATENCIÓN: Usar createElementNS, NO createElement.
   * Los elementos SVG necesitan el namespace SVG para funcionar.
   * Si usas createElement('path'), el navegador NO lo renderiza.
   * Este es un error muy común.
   */
  static createCablePath(
    slotIndex: number,
    endpoints: CableEndpoints,
    signalType: string
  ): SVGPathElement {
    const svg = document.getElementById('patch-cables-overlay');
    if (!svg) throw new Error('[CableRenderer] SVG overlay #patch-cables-overlay not found');

    const path = document.createElementNS(SVG_NS, 'path');
    path.classList.add('patch-cable', 'entering');
    path.setAttribute('data-slot', String(slotIndex));
    path.setAttribute('data-signal', signalType);
    path.setAttribute('d', CableRenderer.calculatePath(endpoints));

    svg.appendChild(path);

    // Quitar la clase 'entering' después de la animación (500ms)
    setTimeout(() => path.classList.remove('entering'), 600);

    return path;
  }

  /**
   * Actualiza la posición de un cable existente.
   * Se llama al hacer scroll, resize o mover módulos.
   */
  static updateCablePath(path: SVGPathElement, endpoints: CableEndpoints): void {
    path.setAttribute('d', CableRenderer.calculatePath(endpoints));
  }

  /**
   * Elimina un cable del SVG con animación de fade-out.
   * El elemento se destruye 300ms después de empezar la animación.
   */
  static removeCablePath(path: SVGPathElement): void {
    path.style.transition = 'opacity 0.3s ease';
    path.style.opacity = '0';
    setTimeout(() => path.remove(), 300);
  }

  /**
   * Crea los círculos "plug" en los extremos del cable.
   * Simula visualmente el conector enchufado en el jack.
   */
  static createPlugs(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string
  ): SVGGElement {
    const svg = document.getElementById('patch-cables-overlay');
    if (!svg) throw new Error('[CableRenderer] SVG overlay not found');

    const group = document.createElementNS(SVG_NS, 'g');
    group.classList.add('cable-plugs');

    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      const plug = document.createElementNS(SVG_NS, 'circle');
      plug.classList.add('cable-plug');
      plug.setAttribute('cx', String(x));
      plug.setAttribute('cy', String(y));
      plug.setAttribute('r', String(CABLE_PHYSICS.PLUG_RADIUS));
      plug.setAttribute('fill', color);
      plug.setAttribute('stroke', '#000');
      plug.setAttribute('stroke-width', '1.5');
      group.appendChild(plug);
    }

    svg.appendChild(group);
    return group;
  }
}
```

### 5.4. Determinar el Tipo de Señal

```typescript
// Dentro de cableConstants.ts o como utilidad en PatchCableManager:

import { buildMetadataFromInventory } from '../patchbay/matrixLayout';

/**
 * Determina el tipo de señal de un puerto ('audio', 'cv', 'gate', 'midi').
 * 
 * Reutiliza la MISMA fuente de verdad que la Matrix: buildMetadataFromInventory()
 * (patrón de ModulePatchbayMatrix.ts:89-92). Con esto el tipo de señal es
 * consistente con la Matrix POR CONSTRUCCIÓN, y NO depende de adivinar el
 * typeId a partir del instanceId (imposible cuando es numérico).
 */
export class SignalTypeResolver {
  private types: Map<string, string> = new Map();

  /** (Re)construye el mapa {qualifiedId → tipo de señal}. */
  refresh(): void {
    const inv = (window as any).inventoryStore;
    const state = (window as any).runtimeStore?.getSnapshot?.();
    if (!inv || !state) return;

    const { sources, targets } = buildMetadataFromInventory(inv.getAllItems(), state);
    for (const entry of [...sources, ...targets]) {
      // entry = { id: qualifiedId, type: 'AUDIO'|'CV'|'GATE'|'MIDI', ... }
      if (entry?.id && entry?.type) {
        this.types.set(entry.id, entry.type.toLowerCase());
      }
    }
  }

  getSignalType(qualifiedId: string): string {
    return this.types.get(qualifiedId) || 'cv';
  }
}
```

### 5.5. Test Manual de la Fase 2

Después de implementar esta fase, abrir la consola del navegador y ejecutar:

```javascript
// Test: dibujar un cable ficticio de (100, 80) a (400, 300)
const path = CableRenderer.createCablePath(99, {x1:100, y1:80, x2:400, y2:300}, 'audio');
// Debería aparecer un cable verde colgante en el rack
// Verificar que tiene forma de curva, NO una línea recta
```

---

## 6. Fase 3: Sincronización con la Matrix

> **Estimación:** 2–3 días para un junior  
> **Prerequisito:** Fases 1 y 2 completadas y probadas  
> **Resultado esperado:** Los cables aparecen/desaparecen automáticamente al crear/eliminar conexiones en la Matrix

### 6.1. PatchCableManager (Orquestador Principal)

**Fichero nuevo:** `host/ui/src/Components/cables/PatchCableManager.ts`

```typescript
import { JackRegistry } from './JackRegistry';
import { CableRenderer, CableEndpoints } from './CableRenderer';
import { SignalTypeResolver, SIGNAL_COLORS, INTERACTION } from './cableConstants';

interface ActiveCable {
  slotIndex: number;
  sourceId: string;
  targetId: string;
  signalType: string;
  pathElement: SVGPathElement;
  plugsElement: SVGGElement | null;
}

export class PatchCableManager {
  private jackRegistry = new JackRegistry();
  private signalTypeResolver = new SignalTypeResolver();
  private activeCables: Map<number, ActiveCable> = new Map();
  private unsubscribe: (() => void) | null = null;
  private debounceTimer: number | undefined;
  private pendingRedraw = false;

  /**
   * Inicializa el sistema de cables.
   * Llamar UNA SOLA VEZ después de que el DOM del rack esté listo.
   * 
   * NOTA PARA JUNIORS: Este método NO crea cables. Solo prepara
   * los listeners y hace la primera sincronización. Los cables 
   * aparecerán automáticamente si hay conexiones activas en la Matrix.
   */
  init(): void {
    // 1. Primera lectura de posiciones de jacks + tipos de señal
    this.jackRegistry.refresh();
    this.signalTypeResolver.refresh();

    // 2. Suscribirse al RuntimeStore para recibir cambios
    const store = (window as any).runtimeStore;
    if (store) {
      this.unsubscribe = store.subscribe((changeType: number) => {
        // Solo nos interesan cambios estructurales (módulos o matrix)
        if (changeType & 1 /* ChangeType.Structure */) {
          // Esperar un frame para que el DOM se actualice primero
          requestAnimationFrame(() => this.syncCablesFromState());
        }
      });
    }

    // 3. Listeners de layout (scroll, resize, DOM mutations)
    this.setupLayoutListeners();

    // 4. Sincronización inicial
    requestAnimationFrame(() => this.syncCablesFromState());

    console.log('[PatchCableManager] Initialized. Jacks registered:', 
                this.jackRegistry.count);
  }

  /**
   * NÚCLEO: Lee la Matrix y sincroniza los cables SVG.
   * 
   * ALGORITMO (paso a paso):
   * 1. Leer state.patch.patchbayMatrix[] del RuntimeStore
   * 2. Para cada slot activo que tiene source Y target:
   *    a. Buscar las coordenadas de ambos jacks en el JackRegistry
   *    b. Si YA existe un cable para ese slot → solo actualizar posición
   *    c. Si NO existe → crear cable nuevo (path SVG + plugs)
   * 3. Para cada cable existente cuyo slot ya no está activo → eliminar
   * 
   * NOTA: Si un jack no se encuentra (el módulo fue quitado),
   * se ignora silenciosamente. El cable aparecerá cuando el
   * módulo vuelva a estar en el rack.
   */
  private syncCablesFromState(): void {
    this.jackRegistry.refresh();
    this.signalTypeResolver.refresh();

    const store = (window as any).runtimeStore;
    if (!store) return;
    const state = store.getSnapshot();
    const matrix = state?.patch?.patchbayMatrix || [];

    const activeSlotIndices = new Set<number>();

    matrix.forEach((slot: any, index: number) => {
      const isActive = slot.active === true || slot.active === 'true';
      const hasRoute = slot.source && slot.target;

      if (isActive && hasRoute) {
        activeSlotIndices.add(index);

        const sourcePos = this.jackRegistry.getPosition(slot.source);
        const targetPos = this.jackRegistry.getPosition(slot.target);

        // Si no encontramos algún jack, no podemos dibujar el cable
        if (!sourcePos || !targetPos) return;

        const endpoints: CableEndpoints = {
          x1: sourcePos.x, y1: sourcePos.y,
          x2: targetPos.x, y2: targetPos.y,
        };

        const existing = this.activeCables.get(index);

        if (existing) {
          // Caso A: Cable ya existe → solo actualizar posición
          CableRenderer.updateCablePath(existing.pathElement, endpoints);
          // También actualizar los plugs
          if (existing.plugsElement) {
            existing.plugsElement.remove();
          }
          const color = SIGNAL_COLORS[existing.signalType] || SIGNAL_COLORS.cv;
          existing.plugsElement = CableRenderer.createPlugs(
            sourcePos.x, sourcePos.y,
            targetPos.x, targetPos.y,
            color
          );
        } else {
          // Caso B: Cable nuevo → crear desde cero
          const signalType = this.signalTypeResolver.getSignalType(slot.source);
          const color = SIGNAL_COLORS[signalType] || SIGNAL_COLORS.cv;
          
          const pathElement = CableRenderer.createCablePath(
            index, endpoints, signalType
          );
          const plugsElement = CableRenderer.createPlugs(
            sourcePos.x, sourcePos.y,
            targetPos.x, targetPos.y,
            color
          );

          this.activeCables.set(index, {
            slotIndex: index,
            sourceId: slot.source,
            targetId: slot.target,
            signalType,
            pathElement,
            plugsElement,
          });
        }
      }
    });

    // Paso 3: Eliminar cables que ya no están activos en la Matrix
    for (const [slotIndex, cable] of this.activeCables) {
      if (!activeSlotIndices.has(slotIndex)) {
        CableRenderer.removeCablePath(cable.pathElement);
        if (cable.plugsElement) {
          cable.plugsElement.style.transition = 'opacity 0.3s';
          cable.plugsElement.style.opacity = '0';
          setTimeout(() => cable.plugsElement?.remove(), 300);
        }
        this.activeCables.delete(slotIndex);
      }
    }
  }

  /**
   * Redibuja todos los cables sin crear ni eliminar.
   * Para scroll/resize.
   */
  private redrawAllCables(): void {
    this.jackRegistry.refresh();

    for (const [, cable] of this.activeCables) {
      const sourcePos = this.jackRegistry.getPosition(cable.sourceId);
      const targetPos = this.jackRegistry.getPosition(cable.targetId);

      if (sourcePos && targetPos) {
        CableRenderer.updateCablePath(cable.pathElement, {
          x1: sourcePos.x, y1: sourcePos.y,
          x2: targetPos.x, y2: targetPos.y,
        });
      }
    }
  }

  /**
   * Programa un redibujado agrupado en el siguiente frame.
   * Evita redibujar 60 veces por segundo durante un resize.
   */
  private scheduleRedraw(): void {
    if (this.pendingRedraw) return;
    this.pendingRedraw = true;
    requestAnimationFrame(() => {
      this.redrawAllCables();
      this.pendingRedraw = false;
    });
  }

  private setupLayoutListeners(): void {
    const debouncedRefresh = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.scheduleRedraw();
      }, INTERACTION.DEBOUNCE_MS);
    };

    window.addEventListener('resize', debouncedRefresh);
    
    document.getElementById('upper-rack')
      ?.addEventListener('scroll', debouncedRefresh);
    document.getElementById('lower-rack')
      ?.addEventListener('scroll', debouncedRefresh);

    // Observar cambios en el DOM (módulos añadidos/quitados)
    const observer = new MutationObserver(debouncedRefresh);
    for (const id of ['upper-rack', 'lower-rack']) {
      const el = document.getElementById(id);
      if (el) observer.observe(el, { childList: true });
    }
  }

  /** Número de cables activos actualmente. Para debug. */
  get cableCount(): number {
    return this.activeCables.size;
  }
}
```

### 6.2. Punto de Inicialización en `host/ui/src/index.ts`

`bundle.js` es un bundle único generado por esbuild: **no se edita directamente ni admite `import('./src/...')` en runtime**. El init se añade en `host/ui/src/index.ts`, junto al resto de la lógica de arranque de la UI (donde ya se instancian las stores y los componentes):

```typescript
// ─── Inicializar sistema visual de cables ───
// NOTA: Si da error, la UI funciona normalmente sin cables (no es crítico).
try {
  const cableManager = new PatchCableManager();
  cableManager.init();
  (window as any).patchCableManager = cableManager; // Exponer para debug en consola
  console.log('[INIT] PatchCableManager ready');
} catch (e) {
  console.warn('[INIT] PatchCableManager not available:', e.message);
}
```

> **NOTA:** Usamos `try/catch` porque si algo falla en el sistema de cables, la UI del sintetizador debe seguir funcionando normalmente. Los cables son decorativos, no críticos. Tras editar `index.ts`, se regenera `bundle.js` con esbuild.

---

## 7. Fase 4: Interacción — Evasión de Controles

> **Estimación:** 4–5 días para un junior  
> **Prerequisito:** Fases 1–3 completadas y probadas  
> **Resultado esperado:** Los cables no molestan al tocar los potenciómetros

### 7.1. Estrategia A: Modo Rayos X (Ghosting) — IMPLEMENTAR PRIMERO

La más sencilla y efectiva. Cuando el cursor está sobre un módulo, todos los cables que pasan por encima se hacen semi-transparentes.

**Fichero nuevo:** `host/ui/src/Components/cables/CableInteraction.ts`

```typescript
import { INTERACTION } from './cableConstants';

/**
 * Configura la interacción de "ghosting" de cables.
 * 
 * CÓMO FUNCIONA:
 * 1. Escuchamos mousemove en todo el rack.
 * 2. Si el cursor está sobre un control (knob circular o jack),
 *    identificamos el módulo padre.
 * 3. Para cada cable activo, comprobamos si algún punto de su curva
 *    cruza el rectángulo del módulo.
 * 4. Si cruza → añadimos clase "ghosted" (CSS se encarga del efecto).
 * 5. Si no cruza → quitamos clase "ghosted".
 * 
 * RENDIMIENTO:
 * - getPointAtLength() es nativo del navegador y muy rápido.
 * - Con 20 muestras por cable y 30 cables, son 600 comprobaciones
 *   por mousemove. A 60fps serían 36.000/s, pero como usamos
 *   debounce con requestAnimationFrame, son ~600/frame. Totalmente
 *   manejable.
 */
export function setupCableGhosting(): void {
  const rack = document.getElementById('omega-rack');
  if (!rack) return;

  let ghostingActive = false;

  rack.addEventListener('mousemove', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // ¿Está el cursor sobre un control interactivo?
    // Todos los controles (knobs, sliders y jacks) emiten el atributo
    // `data-source` (CellRenderer/PortRenderer), y los knobs contienen
    // sub-elementos internos, así que buscamos con closest().
    const control = target.closest('[data-source]');
    const isOverControl = control !== null;

    if (isOverControl) {
      // El módulo padre puede ser un módulo Era 7 o un panel aseptic.
      const modulePanel = target.closest('.module, .aseptic-module-panel');
      if (!modulePanel) return;

      ghostingActive = true;
      const moduleRect = modulePanel.getBoundingClientRect();
      const rackRect = rack.getBoundingClientRect();

      // Coordenadas del módulo relativas al rack
      const area = {
        left:   moduleRect.left - rackRect.left,
        top:    moduleRect.top - rackRect.top,
        right:  moduleRect.right - rackRect.left,
        bottom: moduleRect.bottom - rackRect.top,
      };

      // Comprobar cada cable
      document.querySelectorAll('.patch-cable').forEach((cable) => {
        const path = cable as SVGPathElement;
        const crosses = doesCableCrossArea(path, area);
        path.classList.toggle('ghosted', crosses);
      });

    } else if (ghostingActive) {
      // El cursor ya no está sobre un control → quitar ghosting
      ghostingActive = false;
      document.querySelectorAll('.patch-cable.ghosted').forEach((c) => {
        c.classList.remove('ghosted');
      });
    }
  });

  // Al salir del rack, limpiar todo
  rack.addEventListener('mouseleave', () => {
    ghostingActive = false;
    document.querySelectorAll('.patch-cable.ghosted').forEach((c) => {
      c.classList.remove('ghosted');
    });
  });
}

/**
 * Comprueba si algún punto de la curva del cable cae dentro
 * del rectángulo dado.
 * 
 * USA getPointAtLength():
 * Es un método NATIVO de SVG que devuelve las coordenadas {x, y}
 * de cualquier punto a lo largo de un <path>. No necesitas hacer
 * las matemáticas de Bézier tú mismo.
 * 
 * El truco: muestreamos 20 puntos equidistantes a lo largo del cable
 * y comprobamos si alguno está dentro del rectángulo del módulo.
 */
function doesCableCrossArea(
  path: SVGPathElement,
  area: { left: number; top: number; right: number; bottom: number }
): boolean {
  const totalLength = path.getTotalLength();
  const samples = INTERACTION.CURVE_SAMPLES;

  for (let i = 0; i <= samples; i++) {
    const point = path.getPointAtLength((i / samples) * totalLength);
    if (
      point.x >= area.left  && point.x <= area.right &&
      point.y >= area.top   && point.y <= area.bottom
    ) {
      return true;
    }
  }
  return false;
}
```

### 7.2. Estrategia B: Tecla [H] para Ocultar/Mostrar Cables

Añadir dentro de `PatchCableManager.init()`:

```typescript
// Tecla 'H' para ocultar/mostrar cables
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // No activar si se está escribiendo en un input/textarea
  if (e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement) return;

  if (e.key === 'h' || e.key === 'H') {
    const overlay = document.getElementById('patch-cables-overlay');
    if (overlay) {
      overlay.classList.toggle('cables-hidden');
    }
  }
});
```

### 7.3. Estrategia C: Repulsión Elástica (AVANZADO — Implementar al final) ✅ IMPLEMENTADO

Esta es la más espectacular pero también la más compleja. El cable se deforma lateralmente cuando el cursor se acerca:

```typescript
/**
 * CONCEPTO (no implementar hasta que A y B funcionen):
 * 
 * 1. Cuando el cursor se mueve sobre el rack, calcular la distancia
 *    de cada punto del cable al cursor.
 * 2. Si la distancia es menor que REPULSION_RADIUS (ej: 60px),
 *    desplazar los puntos de control C1 y C2 lateralmente.
 * 3. Usar requestAnimationFrame para animar la deformación.
 * 4. Cuando el cursor se aleja, los puntos de control vuelven
 *    a su posición original con un efecto de "muelle" (ease-out).
 * 
 * PRECAUCIÓN: Esto modifica el path 'd' del SVG en cada frame,
 * lo cual puede ser costoso con muchos cables. Usar con cuidado.
 */
```

**IMPLEMENTADO** (`computeRepulsionOffset` + `setupCableRepulsion` en `CableInteraction.ts`):

- `INTERACTION.REPULSION_RADIUS = 60`, `REPULSION_STRENGTH = 90`, `REPULSION_SAMPLES = 20` (config central en `cableConstants.ts`, sin números mágicos).
- `CableRenderer.calculatePath(ep, deform?)` / `updateCablePath(..., deform?)` aceptan un desplazamiento lateral opcional de C1/C2; el sag se mantiene intacto.
- `computeRepulsionOffset(path, cx, cy)`: muestrea `REPULSION_SAMPLES` puntos de la curva, halla el más cercano al cursor y devuelve un vector con magnitud `REPULSION_STRENGTH * falloff` (falloff lineal con la distancia). Devuelve `null` fuera del radio o si el path no es consultable.
- `setupCableRepulsion(manager)`: un solo `requestAnimationFrame` por frame, mousemove en el rack, `mouseleave` restaura todos los cables. Devuelve `cleanup`.
- `PatchCableManager`: `ActiveCable` ahora guarda `base` (endpoints sin deformar) y `deform`; nuevos métodos `getActiveCablePaths()`, `setCableDeform()` (con guard anti-no-op para no escribir el SVG cada frame) y `resetAllDeforms()`. La deformación se PRESERVA en `syncCablesFromState` (Caso A) y en `redrawAllCables` (scroll/resize).
- `PatchCableManager.init()` registra la repulsión; `dispose()` la desregistra.

**RENDIMIENTO**: 1 muestreo × `REPULSION_SAMPLES` por cable y frame, solo en cables dentro del radio. Con 30 cables son ~600 `getPointAtLength()` por frame — aceptable. Se puede desactivar por completo comentando la llamada en `init()`.

---

## 8. Fase 5: Pulido Visual y UX

> **Estimación:** 2–3 días para un junior  
> **Prerequisito:** Fases 1–4 completadas  
> **Resultado esperado:** El sistema se siente pulido y profesional

### 8.1. Animación de Enchufado

Ya incluida en `cables.css` (clase `.entering` con animación `cable-drop-in`). Se aplica automáticamente al crear un cable nuevo en `CableRenderer.createCablePath()`.

### 8.2. Tooltip de Información del Cable ✅ **IMPLEMENTADO** — `CableInteraction.setupCableTooltip(manager)` (retorna `{ dispose }`): mantener `Alt` (`TOOLTIP.MODIFIER_KEY`) y pasar el cursor sobre un cable muestra un tooltip con la ruta (source → target), el tipo de señal (atributo `data-signal` del path, fallback `cv`) y el multiplicador (`×N.NN`). El hover NO usa `e.target` (el overlay y los cables tienen `pointer-events: none`): usa muestreo geométrico de la curva con `closestDistanceToPath()`/`findCableAtPoint()` (20 puntos sobre `getTotalLength`/`getPointAtLength`, radio `TOOLTIP.HOVER_RADIUS=8`), mismo patrón que la repulsión §7.3. Listeners: `keydown/keyup` (`e.key==='Alt'`) en `document`, `blur` en `window`, `mousemove` (`passive`) + `mouseleave` en `#omega-rack`. El tooltip es un `div` en `document.body` con clase `cable-tooltip` y `pointer-events: none`, creado de forma perezosa y posicionado en `clientX/OFFSET_X`, `clientY/OFFSET_Y`. Cache por `currentSlot`: mismo cable → solo reposicionar; cable nuevo → re-render del innerHTML. Nombres legibles de puertos vía `buildPortNameMap()` (inventory metadata con try/catch y fallback al `qualifiedId` crudo). `PatchCableManager.getSlotData(slotIndex)` expone `{ source, target, amount, active }` (null si el slot no existe o está inactivo; `amount` normalizado, default 1). Constantes y CSS en `cableConstants.ts` (`TOOLTIP` block) y `cables.css` (`.cable-tooltip` con borde `--neon-cyan`). 13 tests nuevos (7 en `cableInteraction.test.ts` + 6 `getSlotData` en `patchCableManager.test.ts`).

### 8.3. Indicador de Flujo de Señal (Opcional) ✅ **IMPLEMENTADO** — animación de pulso `stroke-dashoffset` en `cables.css` (`.patch-cable.signal-active` + `@keyframes signal-pulse`). Opt-in por bandera `INTERACTION.SIGNAL_PULSE` (por defecto `false` en `cableConstants.ts`): si está activada, `PatchCableManager.syncCablesFromState()` añade `.signal-active` a cada path 600ms después de crearlo (tras la animación de enchufado `.entering`). Convive con el ghosting (§7.1): `.patch-cable.ghosted.signal-active` mantiene el pulso. 2 tests opt-in en `patchCableManager.test.ts`.

Animar una "chispa" o "pulso luminoso" que recorra el cable cuando hay señal activa. Se puede conseguir con CSS `stroke-dashoffset` animado:

```css
.patch-cable.signal-active {
    stroke-dasharray: 12 400;
    animation: signal-pulse 1.5s linear infinite;
}

@keyframes signal-pulse {
    0%   { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -412; }
}
```

---

## 9. Ideas Adicionales de Proyectos de Referencia

De la investigación de **Patchcab**, **Noisecraft** y **Noodlerack**:

### De Patchcab (spectrome/patchcab)
- **Drag-to-patch**: Arrastrar un cable desde un jack de salida y soltarlo en un jack de entrada, creando la conexión en la Matrix automáticamente. Elimina la necesidad de usar los dropdowns. ✅ **IMPLEMENTADO** — `CableInteraction.setupDragToPatch(manager)` (retorna `{ dispose }`): `pointerdown` en un jack de SALIDA (`.module-jack[data-jack-direction="output"]`, fallback al metadata de la inventory) arma la sesión; `pointermove` superando `DRAG_TO_PATCH.MIN_DRAG_DISTANCE` (6px) crea la preview SVG colgante (`.cable-drag-preview`, reutiliza `CableRenderer.calculatePath()`), marca el jack origen con `.drag-active-jack` y resalta los jacks de entrada válidos con `.target-highlight`; `pointerup` sobre un jack de entrada válido (nunca sobre el origen) reserva el primer slot libre (`PatchCableManager.getFreeMatrixSlot()`, límite `DRAG_TO_PATCH.MATRIX_SLOT_LIMIT=32`) y despacha `sendUpdate(slot,'source')` + `'target'` + `'amount',1` + `'active',true` — el backend (`RpcModulationController`) NO auto-activa, por eso el drag envía `active`. Constantes y CSS en `cableConstants.ts` y `cables.css`; listeners `pointermove/pointerup` en `document` (no se usa `setPointerCapture`, jsdom no lo tiene) y `document.elementFromPoint?.()` con fallback a `e.target`. 12 tests en `cableInteraction.test.ts`.
- **Cable color picker**: Permitir al usuario personalizar el color de un cable. ✅ **IMPLEMENTADO** — el color se persiste en el **patch** (decisión del usuario), no en localStorage. Full-stack C++: `PatchbayMatrixSlot.color` (`PatchDocument.h`), handler `key == "color"` en `RpcModulationController.cpp`, serialización save/load en `OmegaUiBridge.cpp` + `VarSerialization.cpp` (test round-trip `color == "#ff8800"`). UI: paleta `CABLE_PALETTE` + helpers `normalizeCableColor`/`resolveCableColor` en `cableConstants.ts`; `CableRenderer.createCablePath(..., color?)` aplica el stroke inline SOLO con color personalizado del slot (sin override manda el CSS `[data-signal]`) y `setCableColor`/`setPlugsColor` recolorean en vivo; `PatchCableManager.applyCableColor` (Caso A: slot ya existe → update de color; Caso B: slot nuevo → color en creación), cachea color + señal por cable y es no-op si nada cambió. Inspector: swatches AUTO + paleta en `matrixTemplates.ts`, feedback visual inmediato en el click (`matrixEvents.ts` trogglea `.active` sin esperar re-render). 16 tests nuevos (3 archivos) + test round-trip C++.

### De Noisecraft (maximecb/noisecraft)
- **Compilación JIT del grafo**: Compilar la topología de conexiones en código ejecutable optimizado. Aplicable a nuestro DSP en C++.
- **Tipo de dato unificado**: Todo es un float, sin distinción audio/CV. Simplifica la validación.
- **Diseño minimalista sin dependencias**: Evitar frameworks pesados.

### De Noodlerack / VCV Rack
- **Física de masa-muelle**: Modelar el cable como 15–20 partículas conectadas por muelles. Da aspecto de balanceo muy realista pero consume más CPU.
- **Cable tension control**: Slider global que controla cuánto cuelgan los cables (de "espagueti" a "tenso"). ✅ **IMPLEMENTADO** — slider `#cable-tension` en el top-menu (`index.html`) cableado a `PatchCableManager.applyGlobalTension(t)` → `setGlobalTension()` en `cableConstants.ts` → escala el sag en `CableRenderer.calculatePath()`. Rango 0–1: 0 = espagueti (máximo sag, look por defecto), 1 = tenso (sag × `CABLE_TENSION.MIN_SAG_RATIO`, 0.2). Compone con la repulsión elástica (§7.3) y se preserva en redraws. 5 tests en `cableRenderer.test.ts`.

### Ideas Propias
- **Agrupación de cables**: Si varios cables conectan el mismo par de módulos, agruparlos visualmente en un "mazo". ✅ **IMPLEMENTADO** — cables del mismo par de `instanceId` (clave `a<b ? a|b : b|a`) corren **paralelos**: `computeBundleSpread(ep, position, groupSize)` en `CableRenderer.ts` calcula un offset lateral (normal perpendicular al eje, `(position - (groupSize-1)/2) * CABLE_BUNDLE.SPREAD` con `SPREAD=10`) que se suma a los puntos de control de la Bézier — los extremos quedan clavados en sus jacks y solo el centro se abre. `PatchCableManager` agrupa en `applyCableBundles()` (grupo ordenado por `slotIndex`, menor slot al centro), lo re-aplica como Paso 3.5 de `syncCablesFromState()` (cubre creaciones, cambios de ruta y re-enrutados) y en `redrawAllCables()` (el eje depende de la posición); `setCableBundle` solo redibuja si el offset cambió. Compone aditivamente con la repulsión elástica (§7.3) vía `updateCablePathWithOffsets`. Cada cable conserva su propio path (color, tooltip, ghosting y drag intactos). 11 tests nuevos (5 `computeBundleSpread` + 3 `calculatePath`/`updateCablePath` en `cableRenderer.test.ts`, 3 de agrupación/reagrupación en `patchCableManager.test.ts`).
- **Ruta destacada**: Al seleccionar un slot en la Matrix, hacer que su cable brille mientras el resto se atenúa. ✅ **IMPLEMENTADO** — `ModulePatchbayMatrix` propaga el slot seleccionado (`notifyRouteHighlight()`, llamado al hacer click en un slot de la grid, al añadir modulación y al abrir/cerrar la Matrix) a `PatchCableManager.highlightRoute(slot|null)` → `applyRouteHighlight()` togglea `.route-highlight`/`.route-dimmed` en path y plugs (re-aplicado al final de cada `syncCablesFromState()` para cubrir cables creados posteriormente). CSS en `cables.css`: highlight con opacidad 1, stroke-width 7px y glow; dimmed con opacidad 0.15. Decorativo (try/catch + optional chaining): un fallo de cables no rompe la UI. 4 tests en `patchCableManager.test.ts`.
- **Modo "solo cables"**: Ocultar los módulos y mostrar solo cables + jacks, como un esquema de conexionado. ✅ **IMPLEMENTADO** — `CableInteraction.setupCableSoloMode()` alterna la clase `cables-only` en `#omega-rack` desde el botón `#cable-solo-toggle` del top-menu o la tecla [S]; retorna `{ isActive, dispose }` (mismo patrón que `setupCableRepulsion`). CSS en `cables.css`: los módulos se ocultan con `visibility: hidden` + `opacity: 0` (NUNCA `display: none`, para conservar el layout → los jacks siguen en el DOM y los cables no se despegan) y los plugs crecen (`r: 7px`) para actuar como jacks del esquema. Botón SCHEMATIC estilizado con feedback `.active`. 6 tests en `cableInteraction.test.ts` (botón, tecla [S] case-insensitive, no-interferencia al escribir, módulos siguen en el DOM, no-op sin rack, dispose).

---

## 10. Riesgos, Trampas y Cómo Evitarlas

### Trampa #1: Olvidar `pointer-events: none` en el SVG
- **Síntoma:** Los potenciómetros dejan de responder al ratón.
- **Causa:** El SVG overlay captura todos los eventos del ratón.
- **Solución:** `pointer-events: none` en `#patch-cables-overlay` Y en `.patch-cable`.
- **Cómo verificar:** Hacer clic en un knob con DevTools abierto → verificar que el evento llega al knob, no al SVG.

### Trampa #2: Coordenadas desfasadas tras scroll
- **Síntoma:** Los cables se "despegan" de los jacks al hacer scroll horizontal.
- **Causa:** `getBoundingClientRect()` devuelve coordenadas relativas al viewport, no al rack.
- **Solución:** En `JackRegistry.refresh()`, restar `rackElement.getBoundingClientRect()` a las coordenadas de cada jack. **NO hay que corregir `scrollLeft/scrollTop`**: el scroll ocurre DENTRO de `.rack-row`, y como la recta del rack no se mueve, restarla ya incluye automáticamente el desplazamiento del scroll en las coordenadas del jack. Añadir `scrollLeft` duplicaría la corrección.
- **Cómo verificar:** Hacer scroll horizontal en el lower-rack y ver si los cables siguen pegados.

### Trampa #3: Race condition al añadir módulos
- **Síntoma:** Cable se dibuja pero apunta al vacío.
- **Causa:** La Matrix se actualiza (vía RPC) antes de que el módulo se renderice en el DOM.
- **Solución:** Usar `requestAnimationFrame()` antes de `syncCablesFromState()` para dar tiempo al DOM. Ya está implementado en el plan.
- **Cómo verificar:** Añadir un módulo nuevo y verificar que el cable aparece correctamente.

### Trampa #4: Namespace SVG incorrecto
- **Síntoma:** Se crean `<path>` pero no se ven (0px × 0px).
- **Causa:** Usar `document.createElement('path')` en lugar de `document.createElementNS('http://www.w3.org/2000/svg', 'path')`.
- **Solución:** SIEMPRE usar `createElementNS` con el namespace `http://www.w3.org/2000/svg`.
- **Cómo verificar:** Inspeccionar el `<path>` en DevTools → debe tener `namespaceURI: "http://www.w3.org/2000/svg"`.

### Trampa #5: El instanceId no coincide entre Matrix y JackRegistry
- **Síntoma:** `jackRegistry.getPosition('1.saw_out')` devuelve `null`.
- **Causa:** La Matrix genera instanceIds con una lógica y el JackRegistry con otra distinta.
- **Solución:** Ambos DEBEN usar la MISMA lógica de conteo. Verificar que `buildMetadataFromInventory()` en `matrixLayout.ts` (líneas 128–197) y el `JackRegistry.refresh()` generan IDs idénticos.
- **Cómo verificar:** Ejecutar en consola `window.patchCableManager.jackRegistry.getAllIds()` y comparar con los IDs que aparecen en los dropdowns de la Matrix.

### Trampa #6: Rendimiento al redibujar muchos cables
- **Síntoma:** La UI se congela al redimensionar con 20+ cables.
- **Causa:** Se recalculan y renderizan todos los cables sin agrupar.
- **Solución:** Agrupar en un solo `requestAnimationFrame()` (ya implementado con `scheduleRedraw()`).
- **Cómo verificar:** Abrir DevTools > Performance, redimensionar la ventana y verificar que no hay frames > 16ms.

---

## 11. Glosario para Juniors

| Término | Significado |
|---------|-------------|
| **Jack** | Conector hembra de 3.5mm (minijack) en el panel del módulo. Puede ser de entrada (input) o salida (output). |
| **Patch cable** | Cable que conecta un jack de salida con uno de entrada. En hardware real es un cable mono de 3.5mm con "banana" en cada extremo. |
| **Bézier cúbica** | Curva matemática definida por 4 puntos (inicio, 2 controles, fin). El navegador la dibuja nativamente con `<path d="M... C...">`. |
| **Catenaria** | La forma que adopta un cable colgante bajo su propio peso. Nosotros la aproximamos con Bézier. |
| **Sag (panda)** | Cuánto "cuelga" el punto más bajo del cable respecto a la línea recta entre los dos jacks. Medido en píxeles. |
| **Ghosting (Rayos X)** | Hacer semi-transparente un cable para que no tape los controles que hay debajo. Se activa con la clase CSS `.ghosted`. |
| **qualifiedId** | Identificador completo de un jack: `{instanceId}.{portId}` con `instanceId` **numérico** (ej: `1.saw_out`; el módulo en el DOM es `#mod-v7_1`). El formato `{typeId}_{idx}` solo aparece como fallback aseptic. |
| **SVG overlay** | Elemento `<svg>` transparente superpuesto encima del rack que contiene los `<path>` de los cables. |
| **pointer-events: none** | Propiedad CSS que hace que un elemento sea "invisible" para el ratón. Los clics lo ATRAVIESAN como si no existiera. |
| **debounce** | Técnica para limitar la frecuencia de ejecución de una función. Si se llama 60 veces en 1 segundo, solo ejecuta la última llamada. |
| **MutationObserver** | API del navegador que notifica cuando cambia el DOM (ej: se añaden/quitan hijos). No necesita polling. |
| **namespace SVG** | Los elementos SVG requieren `createElementNS('http://www.w3.org/2000/svg', ...)`. Sin el namespace correcto, no se renderizan. |
| **requestAnimationFrame** | Función que programa código para ejecutarse justo antes del siguiente repintado de pantalla (~60Hz). Agrupa operaciones para rendimiento. |
| **z-index** | Propiedad CSS que controla el orden de apilamiento vertical de elementos. Un z-index mayor aparece "por encima" visualmente. |

---

## 12. Checklist de Verificación

Antes de dar cada fase por completada, verificar cada punto:

### Fase 1 — Infraestructura
- [ ] El `<svg id="patch-cables-overlay">` se ve en DevTools dentro de `#omega-rack`
- [ ] El SVG tiene `position: absolute`, `z-index: 35`, `pointer-events: none`
- [ ] Un jack inspeccionado en DevTools muestra `<div class="port-socket ..." data-source="saw_out">` (sin atributos `data-jack-*` adicionales)
- [ ] `pointer-events: none` funciona: se puede hacer clic en un knob que esté debajo del SVG
- [ ] `JackRegistry.refresh()` llena el mapa (verificar en consola: `patchCableManager.jackRegistry.getAllIds()`)
- [ ] Los qualifiedIds del JackRegistry coinciden con los de la Matrix

### Fase 2 — Motor Bézier
- [ ] Se puede dibujar un cable ficticio desde la consola del navegador
- [ ] El cable tiene forma de curva colgante (NO una línea recta)
- [ ] El color del cable coincide con el tipo de señal (audio=verde, CV=cian, gate=rojo, MIDI=violeta)
- [ ] La panda (sag) aumenta con la distancia entre jacks
- [ ] Los plugs (círculos) aparecen en ambos extremos del cable
- [ ] La animación "entering" funciona al crear el cable

### Fase 3 — Sincronización Matrix
- [ ] Al crear una conexión en la Matrix, aparece automáticamente un cable en el rack
- [ ] Al eliminar una conexión, el cable desaparece con fade-out
- [ ] Al hacer scroll horizontal, los cables se mueven con los jacks
- [ ] Al redimensionar la ventana, los cables se reposicionan
- [ ] Al pulsar "Clear Rack", se eliminan los cables junto con los módulos
- [ ] Al añadir un módulo nuevo, los cables existentes se recalculan
- [ ] Con 0 conexiones, no hay ningún `<path>` en el SVG (inspeccionar en DevTools)

### Fase 4 — Evasión de Controles
- [ ] Al pasar el ratón sobre un knob, los cables que cruzan ese módulo se difuminan
- [ ] Al quitar el ratón del knob, los cables vuelven a su opacidad normal
- [ ] La tecla [H] oculta/muestra todos los cables
- [ ] Los knobs siguen funcionando al 100% con cables encima
- [ ] No se activa el ghosting al escribir en un campo de texto (input)

### Fase 5 — Pulido
- [ ] Los cables aparecen con animación de "caída" (no de golpe)
- [ ] No hay caídas de FPS con 15+ cables activos (DevTools > Performance)
- [ ] El cable se destruye limpiamente al quitar un módulo (sin errores en consola)

---

*Plan preparado para el equipo junior de ABDSynths.*  
*Documento de referencia — NO ejecutar hasta aprobación del líder técnico.*
