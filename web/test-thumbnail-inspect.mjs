/**
 * Save generated thumbnails to files for visual inspection.
 * Run: node test-thumbnail-inspect.mjs
 */

import { generateBlueprintThumbnail } from './src/omega-ui-core/utils/BlueprintThumbnailGenerator.ts';
import { writeFileSync } from 'fs';

const mockGroup = {
  id: 'bp_test_group_123',
  kind: 'container',
  role: 'composite',
  layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
  children: [
    { id: 'knob_1', kind: 'cell', cellRef: 'knob', layout: { pos: { x: 10, y: 10 }, size: { width: 48, height: 48 } } },
    { id: 'knob_2', kind: 'cell', cellRef: 'knob', layout: { pos: { x: 70, y: 10 }, size: { width: 48, height: 48 } } },
    { id: 'display_1', kind: 'cell', cellRef: 'display', layout: { pos: { x: 130, y: 10 }, size: { width: 80, height: 48 } } },
    { id: 'port_in', kind: 'cell', cellRef: 'port', layout: { pos: { x: 10, y: 70 }, size: { width: 36, height: 36 } } },
    { id: 'led_1', kind: 'cell', cellRef: 'led', layout: { pos: { x: 60, y: 75 }, size: { width: 16, height: 16 } } },
    { id: 'fader_1', kind: 'cell', cellRef: 'slider', layout: { pos: { x: 90, y: 70 }, size: { width: 24, height: 60 } } },
    { id: 'port_out', kind: 'cell', cellRef: 'port', layout: { pos: { x: 130, y: 70 }, size: { width: 36, height: 36 } } },
    { id: 'label_1', kind: 'cell', cellRef: 'label', layout: { pos: { x: 10, y: 120 }, size: { width: 160, height: 20 } }, meta: { label: 'TEST GROUP' } },
  ],
};

// Save full-size preview (200x140)
const svgFull = generateBlueprintThumbnail(mockGroup);
writeFileSync('thumbnail-full.svg', svgFull);
console.log('Saved: thumbnail-full.svg (200x140)');

// Save User Library size (40x28)
const svgSmall = generateBlueprintThumbnail(mockGroup, { width: 40, height: 28 });
writeFileSync('thumbnail-small.svg', svgSmall);
console.log('Saved: thumbnail-small.svg (40x28)');

// Save as HTML viewer (so we can see the thumbnails in a browser)
const html = `<!DOCTYPE html>
<html>
<head><title>Blueprint Thumbnail Viewer</title>
<style>
  body { background: #111; color: #eee; font-family: monospace; padding: 20px; }
  h2 { margin-top: 24px; }
  .preview { border: 1px solid #333; display: inline-block; padding: 8px; background: #000; margin: 4px; }
  .preview.large svg { width: 200px; height: 140px; }
  .preview.small svg { width: 40px; height: 28px; }
  .preview.actual { display: inline-flex; }
  .preview.actual svg { width: auto; height: auto; max-width: 400px; }
  .group { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
  .inline-svg { display: none; } /* hide the raw svg used for scaling */
  code { font-size: 11px; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>Blueprint Thumbnail Quality Review</h1>

  <h2>Full Size (200x140) — as generated</h2>
  <div class="group">
    <div class="preview actual">${svgFull}</div>
  </div>

  <h2>Small (40x28) — as used in User Library</h2>
  <div class="group">
    <div class="preview small">${svgSmall}</div>
  </div>

  <h2>Small at actual rendered size (40x28) — what User Library shows</h2>
  ${svgSmall}

  <h2>SVG Source (small 40x28)</h2>
  <code>${svgSmall.replace(/</g, '&lt;')}</code>
</body>
</html>`;
writeFileSync('thumbnail-preview.html', html);
console.log('Saved: thumbnail-preview.html (open in browser to inspect)');

// Print summary
const shapeCountFull = (svgFull.match(/<(circle|rect|line|text)/g) || []).length;
const shapeCountSmall = (svgSmall.match(/<(circle|rect|line|text)/g) || []).length;
console.log(`\nFull: ${shapeCountFull} SVG elements`);
console.log(`Small: ${shapeCountSmall} SVG elements`);
console.log('\nOpen thumbnail-preview.html in a browser to visually inspect the thumbnails.');
