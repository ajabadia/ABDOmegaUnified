# OMEGA Visual Parity Contract (VPC)
## Era 7.2.3 — Cross-Project Rendering Specification

> **Objetivo**: Definir el contrato visual único que deben cumplir **ABDOmega** (WebView/JUCE) y **ABDSynthsWeb** (Manifest Editor/React) para que un módulo diseñado en el editor se renderice de forma idéntica en el motor de producción.

> **Fecha**: 2026-05-04  
> **Estado**: APPROVED — Validado por ambos proyectos. Pendiente de validación visual cruzada.
> **Revisión**: v1.3 — Integra Gobernanza Agresiva, Motor de Mockups 8K y Regla de Oro de Identidad (Era 7.2.3)

---

## 1. Diagnóstico Actual

### 1.1 Estado de los Renderers

| Aspecto | ABDOmega (`module_renderer.ts`) | ABDSynthsWeb (Primitivas TSX) |
|---|---|---|
| **Tecnología** | Vanilla TS + `innerHTML` | React 19 + `framer-motion` |
| **Estilos** | Inline styles + clases CSS parciales | Tailwind inline + estilos en JSX |
| **Tokens CSS** | `vars.css` + `themes/industrial/` | `globals.css` + Tailwind config |
| **Variant System** | `.variant-X .class` + inline dims | JS maps (`dims`, `colorMap`) |
| **Skins** | `.skin-X` + `.theme-X` contexto | `skin` prop → Tailwind condicional |
| **Attachments** | HTML string rendering completo | React components (PrimitiveFactory) |
| **Interacción** | `addEventListener` manual | Pointer events + framer-motion |

### 1.2 Divergencias Críticas Detectadas

1. **Color Maps duplicados**: Ambos proyectos definen `colorMap` idénticos pero en sitios distintos (JS en editor, TS en renderer, CSS en `vars.css`). Triple fuente de verdad = inconsistencias garantizadas.
2. **Dimensiones hardcodeadas**: `{ A: 32, B: 24, C: 16, D: 12 }` aparece copiado en cada primitiva TSX y en `module_renderer.ts`. Si se cambia en uno, el otro diverge.
3. **Profundidad visual**: El editor usa `box-shadow`, `backdrop-blur`, `framer-motion` springs. OMEGA usa inline shadows básicos. Resultado: el editor "se ve mejor" pero no es reproducible.
4. **Clases CSS huérfanas**: Existe un sistema CSS excelente en `ui/css/themes/industrial/` (knobs.css, leds.css, ports.css, sliders.css) que **ninguno de los dos renderers consume completamente**.

---

## 2. Arquitectura Propuesta: `omega-ui-core`

### 2.1 Estructura del Paquete

```
omega-ui-core/
├── tokens/
│   ├── vars.css              ← Design tokens (colores, spacing, fonts)
│   ├── signals.css           ← Signal color tokens (audio, cv, gate, midi)
│   └── skins.css             ← Skin system (industrial, carbon, glass, minimal)
├── primitives/
│   ├── knob.css              ← Todas las variantes de knob
│   ├── led.css               ← Todas las variantes de LED
│   ├── port.css              ← Todas las variantes de puerto
│   ├── slider.css            ← Sliders H/V
│   ├── display.css           ← Display con steppers
│   ├── select.css            ← Industrial select
│   ├── switch.css            ← Toggle switch
│   ├── stepper.css           ← Button/Push/Stepper
│   └── label.css             ← Text labels
├── layout/
│   ├── module.css            ← Module shell, header, content, footer
│   ├── containers.css        ← Layout containers (variants)
│   ├── cells.css             ← Control cells y attachment stacks
│   └── screws.css            ← Decorative screws
├── themes/
│   ├── industrial/theme.css  ← Theme-specific overrides
│   ├── carbon/theme.css
│   ├── glass/theme.css
│   └── minimal/theme.css
└── index.css                 ← Master import
```

### 2.2 Principio de Consumo

```
┌─────────────────────────────────────────────────────┐
│              omega-ui-core/index.css                 │
│       (Tokens + Primitivas + Layout + Themes)        │
└──────────┬───────────────────────────┬──────────────┘
           │                           │
    ┌──────▼──────┐            ┌───────▼───────┐
    │  ABDOmega   │            │ ABDSynthsWeb  │
    │  WebView    │            │ Manifest Editor│
    │             │            │               │
    │ innerHTML   │            │ React TSX     │
    │ + className │            │ + className   │
    │ (NO inline  │            │ (NO inline    │
    │  styles)    │            │  Tailwind for │
    │             │            │  primitives)  │
    └─────────────┘            └───────────────┘
```

**Regla de oro**: Las primitivas visuales (knob, led, port, etc.) se estilizan **exclusivamente** con clases CSS del paquete `omega-ui-core`. Los estilos inline y Tailwind quedan reservados para la capa de interacción (pointer events, drag constraints, animations) y layout del workspace (panels, modals, HUD).

---

## 3. Catálogo de Primitivas Canónicas

### 3.1 Convención de Nombrado de Variantes

Todas las primitivas siguen el patrón: `{SIZE}_{COLOR}`

```
Ejemplos: B_cyan, A_orange, C_red, D_green
```

#### Sizes (Tamaños)

| Code | Nombre | Knob (px) | LED (px) | Port (px) | Slider (px) | Display (px) | Select (px) |
|------|--------|-----------|----------|-----------|-------------|-------------|-------------|
| `A`  | Master | 32 | 12 | 28 | 80 | 100×33 | 120×24 |
| `B`  | Standard | 24 | 8 | 24 | 60 | 80×26 | 100×24 |
| `C`  | Small | 16 | 5 | 20 | 40 | 60×20 | 80×24 |
| `D`  | Mini | 12 | 3 | 16 | 30 | 40×14 | 60×24 |

#### Colors (Colores)

| Token | CSS Variable | Hex Fallback | Uso Semántico |
|-------|-------------|-------------|---------------|
| `cyan` | `--wb-primary` | `#00f0ff` | Principal / Audio / CV |
| `red` | — | `#ff4444` | Alerta / Peak / Record |
| `orange` | `--wb-accent` | `#ff8c00` | Acento / Modulación |
| `green` | — | `#00ff88` | OK / Gate / Sync |
| `white` | — | `#ffffff` | Neutro / Gate genérico |

#### Signal Colors (Para Puertos)

| Token | CSS Variable | Hex | Uso |
|-------|-------------|-----|-----|
| `audio` | `--signal-audio` | `#00f0ff` | Audio buffers, CV |
| `cv` | `--signal-cv` | `#ffaa00` | Control voltage, Mod |
| `gate` | `--signal-gate` | `#ffffff` | Gate, Trigger |
| `midi` | `--signal-midi` | `#ff5500` | MIDI I/O |

---

### 3.2 Knob

**Canonical CSS Class**: `.knob-container.size-{S}.color-{C}`

```css
/* Estructura HTML Canónica */
<div class="knob-container size-B color-cyan">
    <div class="knob-cap"></div>
    <div class="knob-marker" style="transform: rotate({rotation}deg)"></div>
</div>
```

| Propiedad | Valor Canónico |
|-----------|---------------|
| Border | `2px solid #333` |
| Background | `#111` |
| Border Radius | `50%` |
| Marker Width | `2px` |
| Marker Height | `40%` |
| Marker Shadow | `0 0 8px {color}66` |
| Cap Overlay | `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)` |
| Rotation Range | `-135deg` a `+135deg` (270° total) |

**Estado actual**:
- **OMEGA**: ✅ Genera la estructura correcta con clases `variant-X size-X color-X`. El CSS en `themes/industrial/knobs.css` está preparado.
- **Editor**: ❌ Usa inline styles y Tailwind (`rounded-full border-2 border-[#333] bg-[#111]`). No emite clases CSS compartidas.

---

### 3.3 LED
 
 **Canonical CSS Class**: `.led.size-{S}.color-{C}`
  ```css
  <div class="led size-B color-cyan" data-source="{bindId}">
      <div class="led-glass-overlay"></div>
      <div class="led-internal-glow"></div>
  </div>
  ```
 
 | Propiedad | Valor Canónico |
 |-----------|---------------|
 | Border Radius | `50%` |
 | Border | `1px solid rgba(255,255,255,0.1)` |
 | Default Opacity | `0.3` |
 | Active Opacity | `1.0` |
 | Internal Glow | `.led-glow` (Efecto de cristal y profundidad) |
 | Glow (active) | `0 0 {size}px {color}99` |
 | Transition | `all 0.1s ease-out` |
  **Estado actual**:
  - **OMEGA**: ✅ Implementado en Era 7.2.3 (incluye capas de cristal).
  - **Editor**: ✅ Implementado en Era 7.2.3.

---

### 3.4 Port (Jack)

**Canonical CSS Class**: `.port-socket.size-{S}.color-{C}`

```css
<div class="port-socket size-B color-accent" data-port="{portId}">
    <div class="port-inner">
        <div class="port-led" data-source="{portId}"></div>
    </div>
</div>
```

| Propiedad | Valor Canónico |
|-----------|---------------|
| Border | `2px solid #444` |
| Background | `#000` |
| Border Radius | `50%` |
| Inner Size | `60%` |
| Inner Background | `#111` |
| Inner Shadow | `inset 0 2px 4px rgba(0,0,0,0.8)` |
| LED Size | `4px` |
| Hover Border | `#666` |

**Color Inference Logic** (compartida):
```
1. Si color explícito en manifest → usar directamente
2. Si id/label contiene "midi" → --signal-midi
3. Si id/label contiene "gate/trig" → --signal-gate
4. Si id/label contiene "cv/mod" → --signal-cv
5. Si id/label contiene "pitch/freq/out/in" → --signal-audio
6. Default → --wb-primary
```

**Estado actual**:
- **OMEGA**: ✅ Genera estructura correcta. CSS en `themes/industrial/ports.css`.
- **Editor**: ❌ Estructura correcta pero con Tailwind inline.

---

### 3.5 Slider (Vertical / Horizontal)

**Canonical CSS Class**: `.slider-wrapper.slider-{v|h}.size-{S}.color-{C}`

```css
<div class="slider-wrapper slider-v size-B color-cyan" data-param="{id}">
    <div class="slider-rail-active"></div>
    <div class="slider-cap"></div>
</div>
```

| Propiedad | Valor Canónico |
|-----------|---------------|
| Background | `rgba(0,0,0,0.4)` |
| Border | `1px solid var(--wb-outline)` |
| Border Radius | `20px` |
| Rail Active | `rgba(0,240,255,0.1)` |
| Cap Shadow | `0 0 10px {color}` |
| Cursor | `crosshair` |

**Estado actual**:
- **OMEGA**: ✅ CSS en `themes/industrial/sliders.css`.
- **Editor**: ❌ Tailwind inline.

---

### 3.6 Display

**Canonical CSS Class**: `.mini-display.variant-{A|B|C}.color-{C}`

> [!IMPORTANT]
> El Display tiene **3 variantes visuales** (no de tamaño, sino de estilo) heredadas de OMEGA `controls.css`. Las 3 deben estar disponibles en ambos renderers.

```css
<div class="mini-display variant-{A|B|C} color-{C}">
    <div class="display-glass-overlay"></div>
    <div class="display-internal-glow"></div>
    <div class="display-scanlines"></div>
    <button class="display-btn minus">−</button>
    <div class="display-value" data-source="{id}">{value}</div>
    <button class="display-btn plus">+</button>
</div>
```

#### Variantes de Display

| Variant | Nombre | Background | Value Color | Value Shadow | Font | Estilo |
|---------|--------|-----------|-------------|-------------|------|--------|
| `A` (default) | **OLED** | `#000` | `var(--data-float)` / `{color}` | `0 0 8px {color}` | `'SevenSegment', monospace` | Scanlines verdes, glow cyan |
| `B` | **LCD** | `#7a8a6d` (GameBoy green) | `rgba(0,0,0,0.8)` | `1px 1px 0 rgba(255,255,255,0.1)` | `'SevenSegment', monospace` | Retro LCD, sin glow |
| `C` | **LED** | `#1a0000` (deep red glass) | `#ff3300` | `0 0 12px #ff3300, 0 0 2px #ff0000` | `'SevenSegment', monospace` | Red 7-segment, glow intenso |

#### Propiedades Compartidas

| Propiedad | Valor Canónico |
|-----------|---------------|
| Border | `1px solid rgba(255,255,255,0.1)` |
| Shadow | `inset 0 0 15px rgba(0,0,0,1)` |
| Font Primary | `'SevenSegment', monospace` (para valores numéricos) |
| Font Fallback | `'Fragment Mono', monospace` (para texto/labels) |
| Button Hover | `rgba(255,255,255,0.05)` |
| Button Active | `rgba(0,242,255,0.2)` |

#### Tamaños de Display

| Size | Width | Height |
|------|-------|--------|
| `A` | 100px | 33px |
| `B` | 80px | 26px |
| `C` | 60px | 20px |
| `D` | 40px | 14px |

**Estado actual**:
- **OMEGA**: ✅ Implementa variantes y Glassmorphism (Era 7.2.3).
- **Editor**: ✅ Soporte completo para variantes y Glassmorphism (Fase 15).

---

### 3.11 Illustration (Branding / Technical)

**Canonical CSS Class**: `.illustration-container`

```css
<div class="illustration-container" style="background-image: url({resolvedAsset})">
    <div class="illustration-overlay"></div>
</div>
```

| Property | Valor Canónico |
|-----------|---------------|
| Fit | `contain` / `cover` / `fill` (configurable) |
| Border | `1px solid rgba(255,255,255,0.05)` |
| Filter | `drop-shadow(0 2px 4px rgba(0,0,0,0.2))` |
| Missing Asset | Patrón de peligro industrial agresivo (rayas rojas/negras a 45° con animación `Hazard Pulse`) |

**Regla de Oro (Identidad)**: Las ilustraciones de identidad (`module_logo`) deben renderizarse obligatoriamente con un filtro de saturación al 0.8 y un `drop-shadow(0 2px 4px rgba(0,0,0,0.2))` para simular serigrafía industrial.

---

### 3.7 Select

**Canonical CSS Class**: `.industrial-select-wrapper.size-{S}.color-{C}`

```css
<div class="industrial-select-wrapper size-B color-cyan" data-param="{id}">
    <div class="industrial-select-label">{currentLabel}</div>
    <div class="industrial-select-icon">▼</div>
</div>
```

---

### 3.8 Switch

**Canonical CSS Class**: `.switch-container.size-{S}.color-{C}`

> [!WARNING]
> **Deprecation Notice**: OMEGA actualmente usa `.sw-unit` + `.sw-peg` con assets PNG (`switch_up.png`, `switch_down.png`). Este sistema queda **DEPRECATED**. El nuevo estándar es CSS puro, como implementa `Switch.tsx` en el editor. Las clases `.sw-unit` y `.sw-peg` se mantienen temporalmente para retrocompatibilidad pero no deben usarse en módulos nuevos.

```css
/* NUEVO ESTÁNDAR (CSS puro) */
<div class="switch-container size-B color-cyan" data-param="{id}">
    <div class="switch-dot top"></div>
    <div class="switch-dot bottom"></div>
</div>

/* DEPRECATED (PNG legacy — NO usar en módulos nuevos) */
<div class="sw-unit">...</div>
```

| Propiedad | Valor Canónico (Nuevo Estándar) |
|-----------|---------------|
| Background | `#000` |
| Border | `1px solid var(--wb-outline)` |
| Border Radius | `9999px` (pill) |
| Dot Active | `background: {color}; box-shadow: 0 0 8px {color}` |
| Dot Inactive | `background: rgba(255,255,255,0.04)` |
| Aspect Ratio | `1:1.8` (w:h) |

**Estado actual**:
- **OMEGA**: ⚠️ Usa `.sw-unit` + PNGs. Requiere migración a `.switch-container` CSS puro.
- **Editor**: ✅ Ya implementa el estándar CSS puro en `Switch.tsx`.

---

### 3.9 Stepper / Button / Push

**Canonical CSS Class**: `.industrial-btn.size-{S}.color-{C}`

```css
<div class="industrial-btn size-B color-cyan" data-param="{id}">
    <div class="btn-indicator"></div>
</div>
```

---

### 3.10 Label (Attachment)

**Canonical CSS Class**: `.cell-label`

```css
<label class="cell-label">{text}</label>
```

| Propiedad | Valor Canónico |
|-----------|---------------|
| Font Size | `9px` |
| Font Weight | `900` |
| Color | `var(--wb-text-muted)` |
| Text Transform | `uppercase` |
| Letter Spacing | `2px` |
| Pointer Events | `none` |

---

## 4. Layout Containers

### 4.1 Container Variants

| Variant | Background | Border | Extras |
|---------|-----------|--------|--------|
| `default` | `rgba(255,255,255,0.015)` | `1px solid rgba(255,255,255,0.05)` | — |
| `header` | `rgba(255,255,255,0.05)` | `1px solid rgba(255,255,255,0.15)` | `border-bottom: 2px` |
| `section` | `transparent` | `border-left: 2px solid rgba(255,255,255,0.1)` | No border-radius |
| `panel` | `rgba(255,255,255,0.02)` | `1px solid rgba(255,255,255,0.08)` | — |
| `inset` | `rgba(0,0,0,0.3)` | `1px solid rgba(0,0,0,0.4)` | `box-shadow: inset 0 2px 8px rgba(0,0,0,0.5)` |
| `minimal` | `transparent` | `1px dashed rgba(255,255,255,0.1)` | — |

### 4.2 Container Label Pill

```css
.container-label-pill {
    position: absolute;
    top: -7px; left: 10px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 1px 8px;
    font-size: 7px;
    font-weight: 900;
    color: #fff;
    text-transform: uppercase;
    border-radius: 20px;
    letter-spacing: 1px;
}
```

**Regla de Paridad**: Sin chevrones ni indicadores interactivos. La pill es puramente informativa.

---

## 5. Skins y Themes

### 5.1 Skin System (Module Shell)

| Skin | CSS Class | Background | Border |
|------|-----------|-----------|--------|
| `industrial` | `.skin-industrial` | `#1a1c1e` + gradient overlay | `rgba(255,255,255,0.08)` |
| `carbon` | `.skin-carbon` | `#0a0a0a` + carbon texture | `rgba(255,255,255,0.05)` |
| `glass` | `.skin-glass` | `rgba(20,25,30,0.4)` + `backdrop-filter: blur(12px)` | `rgba(255,255,255,0.1)` |
| `minimal` | `.skin-minimal` | `transparent` | `1px dashed rgba(255,255,255,0.1)` |

### 5.2 Theme Context

El theme envuelve al módulo con `.omega-theme-context.theme-{name}`. Los archivos en `themes/{name}/` sobrescriben las primitivas para ese contexto específico.

```html
<div class="omega-theme-context theme-industrial skin-industrial">
    <!-- Todas las primitivas hijas heredan el theme -->
</div>
```

---

## 6. Attachment System

### 6.1 Estructura de Celda

```html
<div class="control-cell variant-{variant}">
    <div class="attachment-stack stack-top"><!-- labels, leds --></div>
    <div class="cell-row-middle">
        <div class="attachment-stack stack-left"><!-- side attachments --></div>
        <div class="cell-main"><!-- primary component --></div>
        <div class="attachment-stack stack-right"><!-- side attachments --></div>
    </div>
    <div class="attachment-stack stack-bottom"><!-- labels, displays --></div>
</div>
```

### 6.2 Tipos de Attachment Soportados

| Type | Clase CSS | Posiciones |
|------|----------|-----------|
| `label` | `.cell-label` | top, bottom, left, right |
| `led` | `.led.size-X.color-X` | top, bottom, left, right |
| `display` | `.mini-display` | top, bottom |
| `stepper` | `.stepper-attachment` | left, right |

### 6.3 Offsets

Los offsets (`offsetX`, `offsetY`) se aplican vía `transform: translate()` y se escalan por `RENDER_SCALE` (1.5x).

---

## 7. Plan de Migración

### Fase A: Extraer `omega-ui-core` (ABDOmega)

1. **Mover** los archivos CSS existentes de `ui/css/` a la estructura propuesta.
2. **Consolidar** `controls.css` descomponiéndolo en primitivas individuales (`knob.css`, `led.css`, etc.).
3. **Eliminar** los inline styles de `module_renderer.ts` y sustituirlos por clases CSS. Ejemplo:

```diff
- style="width: ${d}px; height: ${d}px; border-radius: 50%; border: 2px solid #333; background: #111;"
+ class="knob-container size-${size} color-${colorId}"
```

### Fase B: Consumir `omega-ui-core` (ABDSynthsWeb)

1. **Importar** `omega-ui-core/index.css` en `globals.css` del editor.
2. **Refactorizar** cada primitiva TSX para emitir clases CSS en lugar de Tailwind:

```diff
// Knob.tsx
- className="rounded-full border-2 border-[#333] bg-[#111]"
+ className={`knob-container size-${size} color-${colorId}`}
```

3. **Mantener** `framer-motion` para animaciones e interacción (estas no tienen equivalente CSS puro).

### Fase C: Validación Visual

1. Cargar el manifiesto `midi_in.acemm` en ambos renderers.
2. Captura de pantalla lado a lado.
3. Verificar pixel-match para: knobs, leds, ports, sliders, containers, labels.
4. Iterar diferencias hasta `< 2px` de desviación.

---

## 8. Archivos Afectados

### ABDOmega (Motor)

| Archivo | Acción |
|---------|--------|
| `ui/module_renderer.ts` | Eliminar inline styles → clases CSS |
| `ui/css/controls.css` | Descomponer en primitivas individuales |
| `ui/css/vars.css` | Mover a `omega-ui-core/tokens/` |
| `ui/css/skins.css` | Mover a `omega-ui-core/tokens/` |
| `ui/css/themes/industrial/*` | Mover a `omega-ui-core/themes/industrial/` |

### ABDSynthsWeb (Editor)

| Archivo | Acción |
|---------|--------|
| `primitives/Knob.tsx` | Emitir `.knob-container.size-X.color-X` |
| `primitives/Led.tsx` | Emitir `.led.size-X.color-X` |
| `primitives/Port.tsx` | Emitir `.port-socket.size-X.color-X` |
| `primitives/Slider.tsx` | Emitir `.slider-wrapper.slider-v/h.size-X.color-X` |
| `primitives/Display.tsx` | Emitir `.mini-display.size-X.color-X` |
| `primitives/Select.tsx` | Emitir `.industrial-select-wrapper.size-X.color-X` |
| `primitives/Switch.tsx` | Emitir `.switch-unit.size-X.color-X` |
| `primitives/Stepper.tsx` | Emitir `.industrial-btn.size-X.color-X` |
| `primitives/Label.tsx` | Emitir `.cell-label` |
| `rack/RackContainer.tsx` | Emitir `.layout-container.container-X.variant-X` |
| `rack/RackEntity.tsx` | Emitir `.control-cell.variant-X` + attachment stacks |
| `globals.css` | Importar `omega-ui-core/index.css` |

---

## 9. Constantes Compartidas (Single Source of Truth)

### 9.1 RENDER_SCALE

```
RENDER_SCALE = 1.5
```

Ambos renderers multiplican las coordenadas del manifiesto por 1.5 para el render visual.

### 9.2 Rotation Formula (Knobs)

```
rotation = -135 + (normalizedValue × 270)
```

### 9.3 Grid Snap

```
gridSnap = 5px (pre-scale)
```

### 9.4 Rack Dimensions

> [!IMPORTANT]
> **Divergencia detectada**: El editor calcula `height` a partir de constantes fijas (`420` para 3U, `210` para 1U basándose en `height_mode`). OMEGA lee `height` directamente del manifiesto (`desc.ui.dimensions.height`). La fuente de verdad debe ser **el manifiesto**. El editor debe escribir el `height` correcto al manifiesto cuando cambia el `height_mode`, y ambos renderers deben leer de `ui.dimensions.height`.

```
width = HP × 15 × RENDER_SCALE
height = manifest.ui.dimensions.height × RENDER_SCALE  (SOT: el manifiesto)
```

**Valores por defecto según `height_mode`**:

| height_mode | slot | height (manifiesto) | height renderizado |
|------------|------|--------------------|-----------------|
| `full` | `main` / `lower` | `420` | 630px (×1.5) |
| `compact` | `upper` / `top` | `140` | 210px (×1.5) |

**Regla**: Cuando el editor cambia `height_mode` a `compact`, debe escribir `ui.dimensions.height = 140` en el manifiesto. Cuando cambia a `full`, debe escribir `420`. OMEGA lee siempre `ui.dimensions.height` sin interpretar `height_mode`.

---

## 10. Decisiones Resueltas

> Todas las Open Decisions han sido resueltas por consenso entre ambos proyectos.

### OD-1: Ubicación física de `omega-ui-core` — ✅ OPCIÓN C

**Resolución**: `ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/` es la ubicación canónica.

**Justificación**: ABDSynthsWeb es la fuente de verdad visual porque tiene hot-reload para iterar CSS en segundos. Si el CSS viviera en OMEGA, cada cambio estético requeriría editar allí, sincronizar al editor, y verificar en dos sitios. Con Opción C, editas con feedback instantáneo y OMEGA solo ejecuta `sync_omega_ui.bat`.

**Flujo de trabajo**:
```
ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/  (EDITAR AQUÍ)
        │
        │  sync_omega_ui.bat (robocopy, unidireccional)
        ▼
ABDOmega/ui/omega-ui-core/  (COPIA — NO EDITAR)
```

> [!CAUTION]
> Los archivos en `ABDOmega/ui/omega-ui-core/` llevarán el header `/* DO NOT EDIT — Synced from ABDSynthsWeb */`. Cualquier cambio directo será sobreescrito en el próximo sync.

### OD-2: ¿Eliminar Tailwind de las primitivas? — ✅ SÍ

**Resolución**: Separación estricta.
- `omega-ui-core` = estilos de módulos y primitivas (CSS puro).
- Tailwind = workspace del editor (panels, modals, inspector, HUD).

Las primitivas TSX (`Knob.tsx`, `Led.tsx`, etc.) emitirán exclusivamente clases de `omega-ui-core`. Se permite `style={}` solo para propiedades dinámicas que no pueden resolverse con CSS (e.g., `transform: rotate()` del knob marker, `opacity` dinámica de LEDs).

### OD-3: ¿Migrar `module_renderer.ts` de inline HTML a DOM API? — ✅ NO AHORA

**Resolución**: Se mantiene `innerHTML`. La prioridad es que emita las clases CSS correctas de `omega-ui-core`. La migración a DOM API queda como optimización futura opcional.

### OD-4: ¿Incluir assets (PNGs) en `omega-ui-core`? — ✅ SÍ (CORTO PLAZO)

**Resolución**: Los assets PNG de controles (`button_*.png`, `switch_*.png`, `slider_*.png`) se mantienen en `ABDOmega/ui/assets/controls/` como fallback legacy. **No** se incluyen en `omega-ui-core`.

A largo plazo, los componentes que actualmente dependen de PNGs (switches, buttons) migrarán a CSS puro siguiendo el patrón ya implementado en `Switch.tsx` del editor. Las clases PNG-dependientes (`.sw-unit`, `.sw-peg`, `.sq`) quedan **DEPRECATED**.

---

## 11. Identidad Industrial y Gestión de Assets

### 11.1 Resolución de module_logo.svg

Para garantizar la portabilidad absoluta, el host (**ABDOmega**) debe implementar el siguiente algoritmo de resolución para la identidad visual del módulo:

1. **Root Search**: Intentar cargar `module_logo.svg` desde la raíz del paquete `.acepack` o directorio del módulo.
2. **Manifest Fallback**: Si no existe en raíz, consultar `resources.assets` en el manifiesto para localizar la referencia.
3. **Internal Fallback**: Si falla lo anterior, usar el icono genérico de la familia (oscillator, filter, etc.).

### 11.2 Ingesta de Assets

Todos los assets referenciados en el manifiesto (ilustraciones, fondos) deben ser inyectados en el motor mediante el bridge de assets (`OmegaUiBridge`). El host debe garantizar que estos recursos estén disponibles antes del primer frame de renderizado para evitar parpadeos visuales.

## 12. Gobernanza Agresiva y Certificación (Era 7.2.3)

### 12.1 Nivel de Severidad CRITICAL
Se introduce el nivel `CRITICAL` para violaciones que impiden el despliegue del módulo:
-   **Missing Assets**: Cualquier referencia a un asset (fondo, logo, knob personalizado) que no sea resoluble.
-   **Identity Breach**: Ausencia del `module_logo` o bind incorrecto a la identidad del módulo.

### 12.2 Bloqueo de Exportación (Safety Lock)
Cualquier issue marcada como `CRITICAL` en el motor de auditoría debe **bloquear** la generación de:
1.  **Mockups**: El botón "Export 8K Studio Shot" debe deshabilitarse.
2.  **Deployment**: La exportación del archivo `.zip` / `.acepack` debe ser denegada por el sistema.

---

*Documento actualizado para Era 7.2.3 — 2026-05-05*
*v1.3 — Gobernanza Agresiva, Mockups 8K y Sincronización de Identidad*
