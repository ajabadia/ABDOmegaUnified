# ADR-010: Asset Behavior Lab (The Behavioral Core)

**Status:** ACTIVE (PHASE 15 CONSOLIDATION)  
**Date:** 2026-05-12  

## Context

The **Asset Behavior Lab** (ABL) is the specialized authoring environment within the Cell Studio dedicated to defining how visual assets respond to input, state, and telemetry. It bridges the gap between static filmstrips/images and functional OMEGA controls.

## Decision: Behavior-First Authoring

The Lab specializes in:
1. **Importing** static images and filmstrips.
2. **Defining Behavior Presets** that map value/state/input to frame selection or transform behavior.
3. **Composing** multiple visual layers into one reusable cell.
4. **Scrubbing & Testing** real-time response before deployment.

### AssetBehavior Model

```ts
interface AssetBehavior {
  preset: 
    | 'rotary-continuous' | 'slider-linear' | 'switch-toggle' 
    | 'button-momentary' | 'led-binary' | 'meter-vu' | 'plate-static';
  mapping: {
    input: 'value' | 'state' | 'telemetry';
    mode: 'continuous' | 'stepped' | 'state-map';
    polarity: 'normal' | 'inverted';
    frameRange: { start: number; end: number };
  };
}
```

## Three Authoring Layers

1. **Cell Structure**: Host + fragments + bindings.
2. **Asset Behavior**: How an asset responds (Presets).
3. **Visual Surface**: Materials, colors, and textures (Material Foundation).

---
*MIGRATED FROM docs/cell editor - para más adelante/cell editor.md on 2026-05-12*
