/**
 * Tests for templates.ts — pure HTML string builders
 * No DOM required; these are pure functions.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveContainerWidth,
  shouldRenderInTab,
  renderItemHTML,
  renderContainersHTML,
  buildPanelHTML,
} from '../../src/Renderers/templates.js';

// ---------------------------------------------------------------------------
// resolveContainerWidth
// ---------------------------------------------------------------------------
describe('resolveContainerWidth', () => {
  it('returns the raw number when w is numeric', () => {
    expect(resolveContainerWidth(42, 120)).toBe(42);
  });

  it('returns rackWidth for "full"', () => {
    expect(resolveContainerWidth('full', 120)).toBe(120);
    expect(resolveContainerWidth('full', 84)).toBe(84);
  });

  it('returns half rackWidth for "1/2"', () => {
    expect(resolveContainerWidth('1/2', 120)).toBe(60);
    expect(resolveContainerWidth('1/2', 100)).toBe(50);
  });

  it('parses a numeric string', () => {
    expect(resolveContainerWidth('80', 120)).toBe(80);
  });

  it('falls back to rackWidth for unknown string values', () => {
    expect(resolveContainerWidth('unknown', 96)).toBe(96);
  });

  it('returns NaN when rackWidth is not provided and w is unknown', () => {
    const result = resolveContainerWidth('bogus', NaN);
    expect(result).toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// shouldRenderInTab
// ---------------------------------------------------------------------------
describe('shouldRenderInTab', () => {
  const descriptor = {
    ui: {
      layout: {
        containers: [
          { id: 'ctrl-group', tab: 'CONTROL' },
          { id: 'mod-group', tab: 'MODULATION' },
        ],
      },
    },
  };

  it('renders item with tab matching activeTab', () => {
    const item = { presentation: { tab: 'CONTROL' } };
    expect(shouldRenderInTab(item, 'CONTROL', descriptor)).toBe(true);
  });

  it('hides item with different tab', () => {
    const item = { presentation: { tab: 'MODULATION' } };
    expect(shouldRenderInTab(item, 'CONTROL', descriptor)).toBe(false);
  });

  it('renders item with no tab when activeTab is missing (defaults to MAIN)', () => {
    const item = { presentation: { } };
    expect(shouldRenderInTab(item, '', descriptor)).toBe(true);
  });

  it('renders item with tab MAIN when activeTab is empty', () => {
    const item = { presentation: { tab: 'MAIN' } };
    expect(shouldRenderInTab(item, '', descriptor)).toBe(true);
  });

  it('renders item when container tab matches activeTab', () => {
    const item = { presentation: { container: 'ctrl-group' } };
    expect(shouldRenderInTab(item, 'CONTROL', descriptor)).toBe(true);
  });

  it('renders item when container group matches activeTab', () => {
    const item = { presentation: { group: 'mod-group' } };
    expect(shouldRenderInTab(item, 'MODULATION', descriptor)).toBe(true);
  });

  it('hides item when container tab does not match activeTab', () => {
    const item = { presentation: { container: 'mod-group' } };
    expect(shouldRenderInTab(item, 'CONTROL', descriptor)).toBe(false);
  });

  it('returns true when descriptor has no layout (no containers to check)', () => {
    const emptyDesc = { ui: {} };
    const item = { presentation: { tab: 'MAIN' } };
    expect(shouldRenderInTab(item, 'MAIN', emptyDesc)).toBe(true);
  });

  it('returns false when container is not found in layout and item has no tab', () => {
    const item = { presentation: { container: 'nonexistent' } };
    // When container not found, falls through to item.presentation?.tab which is undefined → 'MAIN'
    // If activeTab is 'MODULATION', they differ → false
    expect(shouldRenderInTab(item, 'MODULATION', descriptor)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renderItemHTML
// ---------------------------------------------------------------------------
describe('renderItemHTML', () => {
  const minimalItem = {
    bind: 'VOLUME',
    pos: { x: 10, y: 20 },
    kind: 'knob',
  };

  const descriptor = {
    id: 'test-module',
    ui: { skin: 'industrial' },
  };

  it('returns an HTML string containing a cell-anchor div', () => {
    const html = renderItemHTML(minimalItem, descriptor, { VOLUME: 0.5 }, 1);
    expect(html).toContain('cell-anchor');
  });

  it('positions the anchor at the item coordinates', () => {
    const html = renderItemHTML(minimalItem, descriptor, {}, 1);
    expect(html).toContain('left: 10px');
    expect(html).toContain('top: 20px');
  });

  it('scales coordinates', () => {
    const html = renderItemHTML(minimalItem, descriptor, {}, 2);
    expect(html).toContain('left: 20px');
    expect(html).toContain('top: 40px');
  });

  it('includes runtime value from values map and passes it to CellRenderer', () => {
    const html = renderItemHTML(
      { bind: 'OSC1', pos: { x: 0, y: 0 } },
      descriptor,
      { OSC1: 0.75 },
      1,
    );
    expect(html).toContain('cell-anchor');
    // The value 0.75 is passed to CellRenderer.renderCellHTML -> runtimeValue
    // It affects knob rotation and display, but the bind id itself doesn't appear in output
  });

  it('handles item with source and portId (jack-type item)', () => {
    const jackItem = {
      source: 'CV_IN',
      portId: 'cv1',
      pos: { x: 5, y: 5 },
    };
    const html = renderItemHTML(jackItem, descriptor, { CV_IN: 0 }, 1);
    expect(html).toContain('cell-anchor');
  });

  it('uses a fallback value of 0 when id not found in values', () => {
    const html = renderItemHTML(
      { bind: 'UNKNOWN', pos: { x: 0, y: 0 } },
      descriptor,
      { OTHER: 1 },
      1,
    );
    expect(html).toContain('cell-anchor');
  });

  it('sets omega-height data attribute from presentation', () => {
    const tallItem = { ...minimalItem, presentation: { height: 2.5 } };
    const html = renderItemHTML(tallItem, descriptor, { VOLUME: 0 }, 1);
    expect(html).toContain('--omega-height: 2.5');
  });
});

// ---------------------------------------------------------------------------
// renderContainersHTML
// ---------------------------------------------------------------------------
describe('renderContainersHTML', () => {
  const baseDescriptor = {
    id: 'test',
    ui: {
      dimensions: { width: 120 },
      skin: 'industrial',
      layout: {
        containers: [
          { id: 'c1', pos: { x: 0, y: 0 }, size: { w: 120, h: 200 }, tab: 'MAIN' },
          { id: 'c2', pos: { x: 0, y: 200 }, size: { w: 60, h: 100 }, tab: 'MODULATION' },
        ],
      },
    },
  };

  it('returns an empty string when descriptor has no layout', () => {
    const html = renderContainersHTML({ id: 't', ui: {} }, 'MAIN', 1);
    expect(html).toBe('');
  });

  it('returns an empty string when layout has no containers', () => {
    const html = renderContainersHTML({ id: 't', ui: { layout: {} } }, 'MAIN', 1);
    expect(html).toBe('');
  });

  it('renders only containers for the active tab', () => {
    const html = renderContainersHTML(baseDescriptor, 'MAIN', 1);
    expect(html).toContain('data-container-id="c1"');
    expect(html).not.toContain('data-container-id="c2"');
  });

  it('renders modulation containers when activeTab is MODULATION', () => {
    const html = renderContainersHTML(baseDescriptor, 'MODULATION', 1);
    expect(html).toContain('data-container-id="c2"');
    expect(html).not.toContain('data-container-id="c1"');
  });

  it('includes container-label-pill when a label is set', () => {
    const desc = {
      id: 't',
      ui: {
        dimensions: { width: 120 },
        skin: 'industrial',
        layout: {
          containers: [
            { id: 'c1', pos: { x: 0, y: 0 }, size: { w: 120, h: 200 }, label: 'Effects' },
          ],
        },
      },
    };
    const html = renderContainersHTML(desc, 'MAIN', 1);
    expect(html).toContain('container-label-pill');
    expect(html).toContain('Effects');
  });

  it('applies scale to dimensions', () => {
    const html = renderContainersHTML(baseDescriptor, 'MAIN', 2);
    expect(html).toContain('width: 240px');
    expect(html).toContain('height: 400px');
  });

  it('sorts containers by zIndex', () => {
    const desc = {
      id: 't',
      ui: {
        dimensions: { width: 120 },
        skin: 'industrial',
        layout: {
          containers: [
            { id: 'top', pos: { x: 0, y: 0 }, size: { w: 60, h: 100 }, zIndex: 10 },
            { id: 'bottom', pos: { x: 0, y: 0 }, size: { w: 60, h: 100 }, zIndex: 1 },
          ],
        },
      },
    };
    const html = renderContainersHTML(desc, 'MAIN', 1);
    // bottom (zIndex 1) should appear before top (zIndex 10)
    const bottomIdx = html.indexOf('data-container-id="bottom"');
    const topIdx = html.indexOf('data-container-id="top"');
    expect(bottomIdx).toBeLessThan(topIdx);
  });
});

// ---------------------------------------------------------------------------
// buildPanelHTML
// ---------------------------------------------------------------------------
describe('buildPanelHTML', () => {
  const minimalDesc = {
    id: 'minimal-module',
    ui: {
      skin: 'industrial',
      dimensions: { width: 120, height: 420 },
      controls: [
        { bind: 'VOLUME', pos: { x: 10, y: 20 }, kind: 'knob' },
      ],
    },
  };

  it('returns a complete panel HTML string', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', { VOLUME: 0 }, 1);
    expect(html).toContain('module-panel');
    expect(html).toContain('skin-industrial');
  });

  it('sets panel dimensions', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', {}, 1);
    expect(html).toContain('width: 120px');
    expect(html).toContain('height: 420px');
  });

  it('applies scale to dimensions', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', {}, 2);
    expect(html).toContain('width: 240px');
    expect(html).toContain('height: 840px');
  });

  it('includes industrial screws (top-left, top-right, bottom-left, bottom-right)', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', {}, 1);
    expect(html).toContain('module-screw top-left');
    expect(html).toContain('module-screw top-right');
    expect(html).toContain('module-screw bottom-left');
    expect(html).toContain('module-screw bottom-right');
  });

  it('renders no tabs when only one tab exists', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', {}, 1);
    expect(html).not.toContain('module-tabs');
  });

  it('renders tabs when multiple tabs exist', () => {
    const multiTabDesc = {
      ...minimalDesc,
      ui: {
        ...minimalDesc.ui,
        controls: [
          { bind: 'A', pos: { x: 0, y: 0 }, presentation: { tab: 'MAIN' }, kind: 'knob' },
          { bind: 'B', pos: { x: 0, y: 10 }, presentation: { tab: 'MOD' }, kind: 'knob' },
        ],
      },
    };
    const html = buildPanelHTML(multiTabDesc, 'MAIN', {}, 1);
    expect(html).toContain('module-tabs');
    expect(html).toContain('data-tab="MAIN"');
    expect(html).toContain('data-tab="MOD"');
  });

  it('marks the active tab button as active', () => {
    const multiTabDesc = {
      ...minimalDesc,
      ui: {
        ...minimalDesc.ui,
        controls: [
          { bind: 'A', pos: { x: 0, y: 0 }, presentation: { tab: 'MAIN' }, kind: 'knob' },
          { bind: 'B', pos: { x: 0, y: 10 }, presentation: { tab: 'MOD' }, kind: 'knob' },
        ],
      },
    };
    const html = buildPanelHTML(multiTabDesc, 'MOD', {}, 1);
    expect(html).toContain('tab-btn active" data-tab="MOD"');
  });

  it('renders controls in the layer-controls div', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', { VOLUME: 0.5 }, 1);
    expect(html).toContain('layer-controls');
    expect(html).toContain('cell-anchor');
  });

  it('includes shadow CSS custom properties', () => {
    const html = buildPanelHTML(minimalDesc, 'MAIN', {}, 1);
    expect(html).toContain('--omega-shadow-angle');
    expect(html).toContain('--omega-shadow-blur');
    expect(html).toContain('--omega-shadow-color');
  });

  it('includes faceplate styling when present', () => {
    const descWithFaceplate = {
      ...minimalDesc,
      ui: { ...minimalDesc.ui, faceplate: 'illustration.svg' },
    };
    const html = buildPanelHTML(descWithFaceplate, 'MAIN', {}, 1);
    expect(html).toContain('background-image');
  });

  it('handles lighting customizations', () => {
    const descWithLighting = {
      ...minimalDesc,
      ui: {
        ...minimalDesc.ui,
        lighting: {
          shadowAngle: 45,
          distance: 8,
          blur: 10,
          shadowColor: 'rgba(0,0,0,0.7)',
        },
      },
    };
    const html = buildPanelHTML(descWithLighting, 'MAIN', {}, 1);
    // angle 45° → cos=0.7071, sin=0.7071, distance=8 → shadowX ≈ 5.66
    expect(html).toContain('--omega-shadow-x: 5.66px');
    expect(html).toContain('--omega-shadow-y: 5.66px');
    expect(html).toContain('--omega-shadow-blur: 10px');
    expect(html).toContain('--omega-shadow-color: rgba(0,0,0,0.7)');
  });

  it('emits aesthetic CSS variables from ui.colors', () => {
    const descWithColors = {
      ...minimalDesc,
      ui: {
        ...minimalDesc.ui,
        colors: { 'bg-primary': '#1a1a2e', 'accent': '#ff6b35' },
      },
    };
    const html = buildPanelHTML(descWithColors, 'MAIN', {}, 1);
    expect(html).toContain('--omega-bg-primary: #1a1a2e');
    expect(html).toContain('--omega-accent: #ff6b35');
  });

  it('emits aesthetic CSS variables from ui.typography', () => {
    const descWithTypography = {
      ...minimalDesc,
      ui: {
        ...minimalDesc.ui,
        typography: { 'label-size': '10px', 'font-primary': 'Inter' },
      },
    };
    const html = buildPanelHTML(descWithTypography, 'MAIN', {}, 1);
    expect(html).toContain('--omega-label-size: 10px');
    expect(html).toContain('--omega-font-primary: Inter');
  });
});