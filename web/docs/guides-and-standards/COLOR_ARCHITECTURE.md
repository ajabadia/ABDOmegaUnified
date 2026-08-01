# Color Architecture (Era 7.2.3)

Single reference for how colors flow from manifest data to rendered pixels. All color resolution in OMEGA follows a **token-first** philosophy: components never use raw hex values directly — they reference named tokens that are resolved at render time.

---

## 1. Data Flow Overview

```
MANIFEST (ui.palette, ui.colors, ui.typography)
        │
   ┌────┴────┐
   │         │
useRackTokens   useDesignTokens
(13 DNA tokens)  (merged tokens + CSS vars)
   │         │
SmartColorPicker   CSS Variables
(swatches UI)     (--omega-*, --wb-*)
   │         │
ThemePaletteGovernance   ColorResolver.resolve()
(global editor)         (token → HEX translation)
   │         │
ModuleSkinSelector   Renderers
(preset themes)     (CellRenderer, ContainerRenderer, etc.)
```

---

## 2. Source of Truth: The Manifest

Every color in the system originates from the `OMEGA_Manifest` structure:

```typescript
interface OMEGA_Manifest {
  ui?: {
    palette: Record<string, string>;  // 13 functional DNA tokens
    colors: Record<string, string>;   // infrastructure tokens
    typography: { ... };
  };
  // ... entities with style nodes
}
```

### 2.1 Palette Tokens (Functional)

The 13 **DNA tokens** define the visual identity of a module:

| Token | Purpose | Default | CSS Class |
|-------|---------|---------|-----------|
| `primary` | Primary accent | `#00f2ff` | `text-primary` |
| `secondary` | Secondary accent | `#ff8c00` | `text-accent` |
| `utility` | Utility / support | `#a0a0a0` | `text-white/40` |
| `feedback` | Signal / feedback | `#32cd32` | `text-green-400` |
| `hardware` | Hardware / rails | `#777777` | `text-accent/60` |
| `glow` | Atmospheric glow | `#00f2ff` | `text-primary/80` |
| `glass` | Glass / display | `rgba(255,255,255,0.05)` | `text-white/10` |
| `warning` | Warning / peak | `#ff3300` | `text-red-500` |
| `highlight` | Selection highlight | `#ffffff` | `text-white` |

### 2.2 Color Tokens (Infrastructure)

| Token | Purpose | Default |
|-------|---------|---------|
| `surface` | Surface / background | `#1a1c1e` |
| `text` | Text / labeling | `#ffffff` |
| `chassis` | Master chassis | `#1a1a1a` |
| `weak` | Weak tone / detail | `#555555` |

---

## 3. Resolution Layers

### 3.1 ColorResolver (Core Engine)

**File:** `omega-ui-core/utils/ColorResolver.ts`

The single source of truth for translating token strings to physical HEX/RGBA values.

```typescript
ColorResolver.resolve(col, manifest)  // → hex string
ColorResolver.resolveStyle(style, manifest)  // → resolved style object
```

**Resolution order:**
1. Check manifest `ui.palette` for token match
2. Check manifest `ui.colors` for token match
3. Fall back to canonical defaults
4. Support alpha syntax: `primary/0.5` → primary with 50% opacity

**Supported color properties in `resolveStyle`:**
- `color`, `indicatorColor`, `glowColor`, `glassColor`, `fontColor`
- `shadowColor`, `ambientColor`, `specularColor`
- `warningColor`, `borderColor`, `backgroundColor`
- `activeColor`, `hoverColor`

### 3.2 useDesignTokens (Hook)

**File:** `omega-ui-core/hooks/useDesignTokens.ts`

Merges `DESIGN_TOKENS` constants with manifest overrides. Generates CSS custom properties.

```typescript
const { colors, physics, resolveColor, cssVars } = useDesignTokens(manifest);
```

**Returns:**
- `colors` — resolved color palette
- `physics` — shadow/lighting calculations
- `resolveColor(token)` — function to resolve any token
- `cssVars` — object with `--omega-color-*` CSS variables

### 3.3 useRackTokens (Hook)

**File:** `manifest-editor/hooks/useRackTokens.ts`

Generates the 13 DNA token objects for the color picker UI.

```typescript
const { dna, fonts, defaultFont } = useRackTokens(manifest);
// dna.primary = { label: 'Primary Accent', hex: '#00f2ff', class: 'text-primary' }
```

---

## 4. CSS Token System

### 4.1 Source Files (Single Source of Truth)

| File | Purpose | Tokens |
|------|---------|--------|
| `omega-ui-core/tokens/vars.css` | Master workbench tokens | `--wb-*`, `--primitive-*`, `--omega-*` |
| `omega-ui-core/tokens/signals.css` | Signal-type colors | `--signal-audio`, `--signal-cv`, etc. |
| `omega-ui-core/tokens/skins.css` | Skin variant overrides | `.skin-carbon`, `.skin-glass`, etc. |
| `app/globals.css` | App-level overrides only | `--primary-rgb`, Tailwind `@theme` |

### 4.2 Workbench Tokens (`--wb-*`)

Defined in `vars.css` with dark/light theme variants:

```css
:root {
  --wb-bg: #050505;
  --wb-surface: #0a0a0b;
  --wb-surface-hover: #141416;
  --wb-outline: rgba(255, 255, 255, 0.08);
  --wb-text: #e0e0e0;
  --wb-primary: #00f0ff;
  --wb-accent: #ff8c00;
}

[data-ui-theme="light"] {
  --wb-bg: #f8fafc;
  --wb-surface: #ffffff;
  /* ... */
}
```

### 4.3 Component Tokens (`--primitive-*`)

Base values for industrial components:

```css
--primitive-bg: #111;
--primitive-bg-dark: #000;
--primitive-border-color: #333;
--primitive-accent: var(--wb-primary);
```

### 4.4 Omega Atmospheric Tokens

Shadow and lighting physics, injected by `useDesignTokens`:

```css
--omega-shadow-angle: 135deg;
--omega-shadow-color: rgba(0, 0, 0, 0.5);
--omega-height: 1.0;
```

---

## 5. Theme System

### 5.1 Starter Themes

**File:** `constants/manifest-editor/themes.ts`

Four baked-in themes applied to new manifests:

| Theme | Accent | Surface | Character |
|-------|--------|---------|-----------|
| `industrial` | `#00f2ff` (cyan) | `#1a1c1e` | Dark, technical |
| `carbon` | `#32cd32` (green) | `#0a0f0a` | Tactical dark |
| `glass` | `#ffffff` (white) | `rgba(255,255,255,0.1)` | Translucent |
| `minimal` | `#000000` (black) | `#f8fafc` | Light lab |

### 5.2 Theme Toggle

**File:** `header/ThemeToggle.tsx`

Switches `data-ui-theme` attribute between `dark` and `light`, activating the corresponding CSS variable set.

### 5.3 CSS Skins

**File:** `omega-ui-core/tokens/skins.css`

Visual skin variants that override `--primitive-bg`, `--primitive-border`, and backdrop filters.

---

## 6. Governance Panels

Color editing is split across domain-specific governance components:

| Component | Domain | Properties |
|-----------|--------|------------|
| `ColorGovernance` | Chromatic | `color`, `indicatorColor`, `glowColor`, `glassColor` |
| `MechanicalGovernance` | Surface | `color`, `indicatorColor` + mechanical props |
| `LabelGovernance` | Label | `labelBg` |
| `RackChassisGovernance` | Hardware | `railColor` |
| `ThemePaletteGovernance` | Global | All 13 DNA tokens + 4 infrastructure |

All use `SmartColorPicker` as the editing widget.

---

## 7. UI Components

| Component | Purpose | Used By |
|-----------|---------|---------|
| `SmartColorPicker` | Advanced picker with DNA swatches + alpha | All governance panels |
| `ColorTokenInput` | Simple color input with RGBA indicator | `RackChassisGovernance` |

---

## 8. File Reference

### Core Engine
- `omega-ui-core/utils/ColorResolver.ts` — Token-to-HEX translation
- `omega-ui-core/constants/design-tokens.ts` — Base constants
- `omega-ui-core/hooks/useDesignTokens.ts` — Token merger + CSS vars

### Hooks
- `manifest-editor/hooks/useRackTokens.ts` — 13 DNA token generator

### CSS Tokens
- `omega-ui-core/tokens/vars.css` — Master `--wb-*` variables (single source)
- `omega-ui-core/tokens/signals.css` — Signal colors
- `omega-ui-core/tokens/skins.css` — Skin variants
- `app/globals.css` — App-level overrides + Tailwind `@theme`

### Types
- `omega-ui-core/types/manifest.ts` — `OmegaStyleNode`, `Presentation`, color interfaces

### Themes
- `constants/manifest-editor/themes.ts` — 4 starter theme definitions

### UI
- `inspector/shared/SmartColorPicker.tsx` — Color picker component
- `inspector/shared/ColorTokenInput.tsx` — Simple color input

---

## 9. Rules for New Code

1. **Never hardcode hex values** in components — always reference tokens
2. **Add new color tokens** to `useRackTokens` DNA_TOKENS and `ColorResolver` defaults
3. **CSS variables** go in `vars.css` (workbench) or `signals.css` (signal types)
4. **App-only overrides** (RGB variants, Tailwind mappings) go in `globals.css`
5. **New governance panels** should use `SmartColorPicker` and register in `GovernanceRegistry`
6. **Theme presets** are added to `OMEGA_THEMES` array in `themes.ts`

---

*Last updated: Era 7.2.3 — Color Architecture Consolidation*
