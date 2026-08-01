# Análisis Completo del Sistema de Filmstrips

## Fecha: 2026-06-03

---

## 1. ¿Qué es un filmstrip en OMEGA?

Una tira de sprites (sprite strip) donde cada fotograma de un control (knob, slider, LED, etc.)
se almacena en una sola imagen PNG. El frame activo se muestra mediante `background-position` CSS.
El sistema asume que todos los fotogramas tienen el mismo tamaño.

---

## 2. Arquitectura del Pipeline

```
USUARIO
  │  Sube imágenes sueltas o selecciona un filmstrip de la biblioteca
  ▼
SequenceIngestionLab.tsx    ◄── Cose imágenes individuales en un PNG filmstrip
  │                            (canvas.toBlob + metadatos: frames, orientation, etc.)
  ▼
triggerAssetUpload           ◄── PUENTE ROTO — nunca definido (ver §3)
  │
  ▼
Manifiesto (.acemm)          ◄── Asset registrado con type: 'filmstrip'
  │                            frames, frameWidth, frameHeight, orientation
  ▼
Governance (UI)              ◄── 2 componentes ORFANOS — nunca importados
  ├── UnifiedGraphicGovernance  (nunca se usa)
  └── IdentityGovernance        (nunca se usa)
  ▼
CellRenderer.ts              ◄── Motor maestro que distribuye a renderizadores
  ├── knob        → KnobRenderer.ts      (⚠️ bugs)
  ├── led         → LedRenderer.ts       (🔥 ROTO — no recibe assets)
  ├── slider-v/h  → SliderRenderer.ts    (⚠️ bugs)
  └── sequence-layer → SequenceRenderer.ts  (✅ mejor implementado)
  ▼
CSS background-position       ◄── .knob-asset.filmstrip-v, .led-asset.filmstrip-h, etc.
```

---

## 3. Problemas CRÍTICOS (Bloqueantes)

### 🔴 B1: `triggerAssetUpload` nunca está definido

**Archivos**: `AssetSelector.tsx` líneas 142-145, 352-354
**Impacto**: La subida de cualquier asset (filmstrip o static) a la biblioteca del manifiesto
está completamente rota. El código referencia `(window as unknown).triggerAssetUpload` pero
esa función global nunca se asigna en ningún lugar del código base.

### 🔴 B2: LED filmstrip no recibe assets

**Archivo**: `CellRenderer.ts` líneas 144-153
**Impacto**: El renderizador LED no recibe `assetUrl`, `frames` ni `orientation`.
Aunque `LedRenderer.ts` SÍ tiene lógica para renderizar filmstrips, el motor maestro
(`CellRenderer`) nunca le pasa los datos necesarios. Los LEDs con filmstrip siempre
se renderizan como si no tuvieran asset.

### 🔴 B3: Componentes de gobernanza huérfanos

**Archivos**: `UnifiedGraphicGovernance.tsx`, `IdentityGovernance.tsx`
**Impacto**: Estos dos componentes, que son la interfaz principal para seleccionar y
configurar filmstrips, **nunca se importan en ningún lugar del código**. Existen como
archivos pero están completamente desconectados del árbol de renderizado. El usuario
nunca puede ver ni usar estos paneles.

---

## 4. Problemas ALTOS (Afectan precisión)

### 🟠 H1: Cálculo de frame index inconsistente

| Renderizador | Fórmula | Nota |
|---|---|---|
| `KnobRenderer.ts:73` | `Math.min(Math.floor(value * frames), frames - 1)` | Rango correcto con clamp |
| `LedRenderer.ts:45` | `Math.min(Math.floor(value * frames), frames - 1)` | Ídem |
| `SliderRenderer.ts:51` | `Math.min(Math.floor(value * frames), frames - 1)` | Ídem |
| `SequenceRenderer.ts:47` | `Math.round(effectiveValue * (frames - 1))` | FÓRMULA DIFERENTE |
| `behaviorResolver.ts:61` | `Math.floor(v * (frameCount - 1))` | FÓRMULA DIFERENTE |

**Impacto**: Los 4 renderizadores y el resolver pueden dar resultados distintos para
los mismos inputs. El frame final visible varía según el tipo de componente.

### 🟠 H2: `polarity` solo se maneja en SequenceRenderer

**Archivos**: `KnobRenderer.ts`, `LedRenderer.ts`, `SliderRenderer.ts`
**Impacto**: La polaridad invertida (`polarity: 'inverted'`) se ignora en los 3
renderizadores principales. Solo `SequenceRenderer.ts` la implementa.

### 🟠 H3: `zeroAnchor` existe en la UI pero ningún renderizador lo usa

**Archivos**: `OmegaStyleNode` (type), `SequenceAnatomyInspector` (UI), `IdentityGovernance` (UI)
**Impacto**: El usuario puede configurar `zeroAnchor` en el inspector, pero ese valor
nunca se pasa ni se utiliza en ningún renderizador. Es decorativo.

---

## 5. Problemas en assets de la biblioteca

### 🟡 M1: Asset faltante en disco

**Archivo**: `public/assets/elements/sequences/sequences-registry.json` línea 27
**Problema**: `vintage_vumeter.png` está registrado con `frames: 64` pero el archivo
**no existe en disco**. Carga fallida silenciosa.

### 🟡 M2: Asset huérfano (existe pero no está registrado)

**Archivo**: `public/assets/elements/sequences/simple_knob.png` (42KB)
**Problema**: El archivo existe pero NO aparece en `sequences-registry.json`.
Nunca se muestra al usuario en el selector de assets.

### 🟡 M3: Metadatos en `.txt` ignorados

**Archivo**: `public/assets/elements/sequences/moog_knob_sm.txt`
**Problema**: Contiene `frame_size`, `padding`, `mouse_response` pero ningún código
lee este archivo. Los metadatos están duplicados y parcialmente incorrectos en el JSON.

---

## 6. Problemas de usabilidad

### 🟡 M4: Category hardcodeada a 'knob'

**Archivo**: `SequenceIngestionLab.tsx` línea 81
**Impacto**: Al coser un filmstrip, siempre se etiqueta `category: 'knob'` aunque
sean fotogramas de slider, LED, o VU meter. No hay detección automática ni selector.

### 🟡 M5: `behaviorResolver.ts` desconectado

**Archivo**: `behaviorResolver.ts` (108 líneas)
**Impacto**: Existe un sistema completo de resolución de comportamiento con funciones
para rotary, slider, switch, button, meter, LED. Pero **CellRenderer nunca lo llama**.
Cada renderizador hace su propio cálculo. El resolver y los renderizadores pueden
dar resultados divergentes.

### 🟡 M6: `Alert()` del navegador para errores

**Archivo**: `SequenceIngestionLab.tsx` línea 90
**Impacto**: Si la costura del filmstrip falla, se muestra un `alert()` genérico del
navegador en lugar de una notificación elegante en la UI.

### 🟡 M7: Sin detección de dimensiones desiguales

**Archivo**: `SequenceIngestionLab.tsx`
**Impacto**: Si las imágenes subidas tienen diferente tamaño, la primera determina
el tamaño de todos los fotogramas. Las demás se dibujan en coordenadas incorrectas
sin escalado ni centrado. El usuario no recibe advertencia.

### 🟡 M8: Terminología inconsistente

| UI dice | Código dice |
|---|---|
| `rotate` | `rotary` (en presets) |
| `sequence` | `filmstrip` (en presets) |
| `behaviorMode` | `preset` (en AssetBehavior) |

**Impacto**: Confusión al leer el código vs la interfaz. Dificulta el mantenimiento.

---

## 7. Assets que existen realmente

```
public/assets/elements/sequences/
  ├── sequences-registry.json   ✅  (pero con entrada faltante)
  ├── moog_knob_sm.png          ✅  (101 frames, 30x29, vertical)
  ├── moog_knob_sm.txt          ✅  (metadatos no leídos por el código)
  ├── simple_knob.png           ✅  (42KB, NO registrado en JSON)
  └── vintage_vumeter.png       ❌  (registrado pero FALTANTE)
```

---

## 8. Mapa de prioridades para arreglar

### Inmediato (bloqueantes)
1. Arreglar `triggerAssetUpload` — definir la función global o migrar a callback React
2. Importar `UnifiedGraphicGovernance` o eliminar los componentes huérfanos
3. Pasar `assetUrl`/`frames`/`orientation` al renderizador LED en `CellRenderer.ts`

### Corto plazo
4. Unificar frame index: `Math.floor(value * (frames - 1))` en todos los renderizadores
5. Implementar `polarity` en KnobRenderer, LedRenderer, SliderRenderer
6. Agregar `vintage_vumeter.png` real o quitarlo del registry
7. Registrar `simple_knob.png` en sequences-registry.json

### Medio plazo
8. Conectar `behaviorResolver.ts` a CellRenderer como fuente única de verdad
9. Implementar `zeroAnchor` en los renderizadores
10. Reemplazar `alert()` con notificaciones UI
11. Agregar detección de dimensiones desiguales en el lab de costura
12. Hacer configurable la categoría en SequenceIngestionLab

---

## 9. Conclusión

El sistema de filmstrips tiene **una arquitectura conceptualmente correcta** pero
**múltiples puntos de rotura** que lo hacen no funcional en la práctica:

- **No se pueden subir assets** (triggerAssetUpload roto)
- **No se puede configurar el filmstrip** (governance huérfano)
- **Los LEDs con filmstrip no funcionan** (datos no pasados)
- **El frame mostrado puede ser incorrecto** (cálculos inconsistentes)
- **El registry de assets tiene datos inconsistentes** (faltantes, huérfanos)

El pipeline está implementado "en horizontal" (tiene todas las capas) pero cada capa
tiene desconexiones con la siguiente. Es como un cableado eléctrico donde cada
componente existe pero los cables entre ellos están sueltos.
