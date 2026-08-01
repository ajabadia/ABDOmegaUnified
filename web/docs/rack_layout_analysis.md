# Análisis del Sistema de Layout, Posicionamiento y Movimiento en el Rack

## Fecha: 2026-06-03

---

## 1. Sistema de Coordenadas

**Tipo**: Absoluto en píxeles, origen (0,0) en top-left del contenedor padre.
**Unidades**: Solo píxeles. No hay coordenadas relativas, porcentuales ni mixtas.

### 1.1 Almacenamiento
- `OmegaNode.layout.pos: { x: number; y: number }` — coordenadas absolutas en píxeles
- `CellNode.tsx:83-84` — renderizado como `left: ${x}px; top: ${y}px`
- `StructuralNode.tsx:69-70` — mismo patrón

### 1.2 Factor de escala 1.5x
Aparece hardcodeado en **5+ lugares**:
- `useRackLayout.ts:17` — `width = hp * 15 * 1.5`
- `useRackLayout.ts:18` — `height = (height || default) * 1.5`
- `CellRenderer.ts:537-538` — `cellOffsetX = offsetX * 1.5`, `cellOffsetY = offsetY * 1.5`
- `CellRenderer.ts:540` — `containerWidth = compRadius * 2 * 1.5`

**Problema**: No es una constante configurable. Si cambia la convención de 15px/HP,
el 1.5 se multiplica de forma inconsistente.

### 1.3 Posición Mundial (World Position)
`calculateWorldPosition()` en `treeUtils.ts:198-214` suma recursivamente `pos.x`/`pos.y`
desde la raíz hasta el nodo destino. **Duplicado** en `ucaInspectorAdapter.ts:235-251`
con lógica idéntica — riesgo de divergencia.

---

## 2. Sistema de Grid

### 2.1 Configuración
```typescript
interface GridConfig {
  enabled: boolean;      // default: false
  spacingX: number;      // default: 24
  spacingY: number;      // default: 24
  snapMode: 'center' | 'corner' | 'edge';
}
```
Definido en `manifest.ts:491-496`. Configurable en `ModuleMechanicalSpec.tsx:86-141`.

### 2.2 Lógica de Snap
`spatialConstraints.ts:25-32`:
```typescript
snapToGrid(pos, config) {
  if (!config.enabled) return pos;
  return {
    x: Math.round(pos.x / config.spacingX) * config.spacingX,  // ❌ snapMode ignorado
    y: Math.round(pos.y / config.spacingY) * config.spacingY,  // ❌ snapMode ignorado
  };
}
```

### 2.3 ⚠️ Problemas detectados

| # | Problema | Impacto |
|---|----------|---------|
| **C1** | `snapMode` definido en el type pero **nunca se usa** en `snapToGrid()` | Las 3 variantes (center/corner/edge) se comportan igual |
| **C2** | **No hay grid visual** en el rack. Solo se ve en `CADOverlay.tsx` durante drag con debug mode | El usuario no sabe a dónde va a snapear |
| **C3** | Grid default 24px **no alinea con HP** (22.5px/HP efectivo) | Elementos snapeados al grid no caen en bordes de HP |
| **C4** | Grid snap solo se aplica **al soltar** el drag, no durante el arrastre | No hay feedback en tiempo real de la posición snapeada |

---

## 3. Drag & Drop

### 3.1 Motor
Usa `framer-motion` con `motion.div` drag. Implementado en `useUCADrag.ts`.

### 3.2 Qué es draggable
| Elemento | Draggable | Archivo |
|---|---|---|
| `CellNode` (knobs, sliders, etc.) | ✅ Sí (a menos que locked) | `CellNode.tsx:77` |
| `StructuralNode` (containers, groups) | ✅ Sí (excepto rack root) | `StructuralNode.tsx:63` |
| `asset-layer` | ❌ No | `UniversalRenderer.tsx` |

### 3.3 ⚠️ Problemas detectados

| # | Problema | Impacto |
|---|----------|---------|
| **D1** | **No hay multi-select drag**. `useUCADrag.ts` opera sobre nodos individuales. Los IDs multiseleccionados existen pero no se usan para arrastrar | Mover varios elementos requiere moverlos uno por uno |
| **D2** | **No hay teclado**. No existe nudge con flechas, ni enter para confirmar. 100% mouse-dependent | Inaccesible para usuarios que prefieren/precisan teclado |
| **D3** | **Drag momentum desactivado** (`dragMomentum={false}`) | Se siente rígido, sin inercia natural |
| **D4** | **No hay feedback de nodos bloqueados**. `lockedNodeIds` existe pero no hay indicador visual | El usuario no sabe por qué no puede arrastrar un elemento |
| **D5** | **No hay snapping a otros elementos**. Solo snap a grid abstracto | No hay guías de alineación entre elementos (tipo Figma) |

### 3.4 Compensación de Zoom — ✅ Correcta
`useUCADrag.ts:87-88`: `info.offset.x / zoomFactor` — convierte delta screen-space
a delta rack-local. Esto está bien implementado.

---

## 4. Modelo de Layout

### 4.1 Modos Soportados
| Modo | Comportamiento | Uso típico |
|---|---|---|
| `absolute` (default) | Posición libre por `pos: {x, y}` | Layout tradicional de rack |
| `stack-v` | Auto-posicionamiento vertical con gap/padding | Contenedores apilados |
| `stack-h` | Auto-posicionamiento horizontal con gap/padding | Hileras de controles |

### 4.2 Resolución de Layout
`layoutResolver.ts` (151 líneas) implementa:
- Resolución bottom-up recursiva (hijos primero)
- Auto-sizing con fallback a 80px
- Justify: `start`, `center`, `end`, `space-between`
- Align: `start`, `center`, `end`, `stretch`

### 4.3 ⚠️ Problemas detectados

| # | Problema | Impacto |
|---|----------|---------|
| **L1** | `ContainerSize` permite `string` (`'1U'`, `'100%'`) pero `manifestToTree.ts:50` solo maneja `number` | Round-trip manifest→tree→manifest pierde tamaños string |
| **L2** | Z-index: seleccionados = 100 (cells) / 101 (structural). Sin `isolation` CSS | Posible overlap con containers que tengan z-index mayor |
| **L3** | `treeToManifest.ts:14-31` pierde propiedades al convertir `OmegaNode` → `LayoutContainer` | Round-trip con pérdida de datos |
| **L4** | No hay comando explícito de agrupar/desagrupar | `kind: 'group'` existe pero sin UI para crearlos |

---

## 5. Dimensiones del Rack

### 5.1 Cálculo
```typescript
// useRackLayout.ts:14-18
hp = manifest?.metadata?.rack?.hp || 12;
width = hp * 15 * 1.5;           // 12HP → 270px efectivos
height = (height || (compact ? 140 : 420)) * 1.5;  // compact→210px, expanded→630px
```

### 5.2 ⚠️ Problemas detectados

| # | Problema | Impacto |
|---|----------|---------|
| **R1** | **Triple fuente de dimensiones**: `metadata.rack`, `ui.dimensions`, `ui.layout` | Sin single source of truth. `useRackLayout` lee width de `metadata.rack.hp` pero height de `ui.dimensions?.height` |
| **R2** | **HP real vs documentado**: 22.5px/HP efectivo vs 15px/HP documentado en `ModuleMechanicalSpec.tsx:95` | Inconsistencia que puede confundir al convertir medidas físicas a píxeles |

---

## 6. Resumen de Prioridades

### 🔴 Crítico
| ID | Ítem | Esfuerzo |
|---|---|---|
| C1 | `snapMode` no se usa en `snapToGrid()` | Trivial (1 línea) |
| C2 | No hay grid visual en el rack | Medio (componente overlay) |
| D1 | No hay multi-select drag | Alto (requiere modificar `useUCADrag`) |
| R1 | Triple fuente de dimensiones del rack | Medio (refactor data model) |

### 🟠 Alto
| ID | Ítem | Esfuerzo |
|---|---|---|
| D2 | No hay nudge por teclado | Bajo (handler keyDown + update) |
| D4 | Sin feedback visual de nodos bloqueados | Bajo (css class + tooltip) |
| C4 | Snap solo al soltar, no durante drag | Medio (framer-motion drag constraints) |
| L2 | Z-index sin isolation | Bajo (añadir `isolation: isolate`) |

### 🟡 Medio
| ID | Ítem | Esfuerzo |
|---|---|---|
| C3 | Grid 24px no alinea con HP 22.5px | Bajo (cambiar default a 22.5 o 45) |
| D5 | Sin snapping entre elementos | Alto (sistema de guías) |
| D3 | Sin drag momentum | Trivial (cambiar `dragMomentum={true}`) |
| L1 | ContainerSize string no resuelto | Medio (parser de unidades) |
| L3 | Round-trip con pérdida de datos | Alto (mapeo completo en treeToManifest) |

---

## 7. Conclusión

El sistema de layout del rack está **bien concebido en arquitectura** pero tiene
**múltiples pequeños problemas que lo hacen sentir tosco**:

✅ **Aciertos**:
- Zoom compensation en drag está correcta
- Sistema de layout recursivo con stack modes es potente
- Snap-to-grid con grid configurable en inspector
- CAD overlay con feedback de posición durante drag

❌ **Problemas principales**:
- No hay grid visual permanente (el usuario no ve dónde va a snapear)
- No se puede mover múltiples elementos a la vez
- `snapMode` está definido pero no implementado
- Las dimensiones del rack están triplicadas sin sincronización
- Sin accesibilidad por teclado para posicionamiento

El sistema necesita una **refactorización focalizada en los items críticos** (C1, C2, D1, R1)
para pasar de "funciona pero se siente básico" a "profesional y predecible".
