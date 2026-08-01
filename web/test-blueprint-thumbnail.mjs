/**
 * Blueprint Thumbnail SVG Validation Script
 * 
 * Tests generateBlueprintThumbnail with realistic mock data that mimics
 * the group blueprint structure created by handleSaveGroupAsBlueprint.
 * 
 * Run: node test-blueprint-thumbnail.mjs
 */

// Simulated OmegaNode structure (same shape as what handleSaveGroupAsBlueprint creates)
const mockGroupBlueprint = {
  id: 'bp_test_group_123',
  kind: 'container',
  role: 'composite',
  layout: {
    pos: { x: 0, y: 0 },
    mode: 'absolute',
  },
  children: [
    {
      id: 'knob_1',
      kind: 'cell',
      cellRef: 'knob',
      layout: {
        pos: { x: 10, y: 10 },
        size: { width: 48, height: 48 },
      },
    },
    {
      id: 'knob_2',
      kind: 'cell',
      cellRef: 'knob',
      layout: {
        pos: { x: 70, y: 10 },
        size: { width: 48, height: 48 },
      },
    },
    {
      id: 'display_1',
      kind: 'cell',
      cellRef: 'display',
      layout: {
        pos: { x: 130, y: 10 },
        size: { width: 80, height: 48 },
      },
    },
    {
      id: 'port_in',
      kind: 'cell',
      cellRef: 'port',
      layout: {
        pos: { x: 10, y: 70 },
        size: { width: 36, height: 36 },
      },
    },
    {
      id: 'led_1',
      kind: 'cell',
      cellRef: 'led',
      layout: {
        pos: { x: 60, y: 75 },
        size: { width: 16, height: 16 },
      },
    },
    {
      id: 'fader_1',
      kind: 'cell',
      cellRef: 'slider',
      layout: {
        pos: { x: 90, y: 70 },
        size: { width: 24, height: 60 },
      },
    },
    {
      id: 'port_out',
      kind: 'cell',
      cellRef: 'port',
      layout: {
        pos: { x: 130, y: 70 },
        size: { width: 36, height: 36 },
      },
    },
    {
      id: 'label_1',
      kind: 'cell',
      cellRef: 'label',
      layout: {
        pos: { x: 10, y: 120 },
        size: { width: 160, height: 20 },
      },
      meta: { label: 'TEST GROUP' },
    },
  ],
};

import { generateBlueprintThumbnail } from './src/omega-ui-core/utils/BlueprintThumbnailGenerator.ts';

console.log('=== Blueprint Thumbnail SVG Validation ===\n');

// Test 1: Default size (200x140)
console.log('--- Test 1: Default thumbnail (200x140) ---');
const svg1 = generateBlueprintThumbnail(mockGroupBlueprint);
validateSvg(svg1, 200, 140);

// Test 2: Small thumbnail (40x28) — same as in BlueprintLibraryPanel
console.log('\n--- Test 2: Small thumbnail (40x28) — same as User Library display ---');
const svg2 = generateBlueprintThumbnail(mockGroupBlueprint, { width: 40, height: 28 });
validateSvg(svg2, 40, 28);

// Test 3: With padding override
console.log('\n--- Test 3: Custom padding (2px) ---');
const svg3 = generateBlueprintThumbnail(mockGroupBlueprint, { width: 200, height: 140, padding: 2 });
validateSvg(svg3, 200, 140);

// Test 4: Single node (no children)
console.log('\n--- Test 4: Leaf node (single knob, no children) ---');
const singleNode = {
  id: 'single_knob',
  kind: 'cell',
  cellRef: 'knob',
  layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 } },
};
const svg4 = generateBlueprintThumbnail(singleNode);
validateSvg(svg4, 200, 140);

// Test 5: Empty node (no layout data)
console.log('\n--- Test 5: Node with minimal/missing layout data ---');
const minimalNode = { id: 'minimal', kind: 'cell', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } };
const svg5 = generateBlueprintThumbnail(minimalNode);
validateSvg(svg5, 200, 140);

// Test 6: Large group with many component types
console.log('\n--- Test 6: Large group with all component types ---');
const largeGroup = {
  id: 'large_group',
  kind: 'container',
  layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
  children: [
    { id: 'a', kind: 'cell', cellRef: 'knob', layout: { pos: { x: 0, y: 0 }, size: { width: 40, height: 40 } } },
    { id: 'b', kind: 'cell', cellRef: 'button', layout: { pos: { x: 50, y: 0 }, size: { width: 30, height: 30 } } },
    { id: 'c', kind: 'cell', cellRef: 'switch', layout: { pos: { x: 90, y: 0 }, size: { width: 30, height: 40 } } },
    { id: 'd', kind: 'cell', cellRef: 'led', layout: { pos: { x: 0, y: 50 }, size: { width: 15, height: 15 } } },
    { id: 'e', kind: 'cell', cellRef: 'display', layout: { pos: { x: 25, y: 50 }, size: { width: 60, height: 30 } } },
    { id: 'f', kind: 'cell', cellRef: 'port', layout: { pos: { x: 95, y: 50 }, size: { width: 30, height: 30 } } },
    { id: 'g', kind: 'cell', cellRef: 'slider', layout: { pos: { x: 0, y: 90 }, size: { width: 20, height: 50 } } },
    { id: 'h', kind: 'cell', cellRef: 'label', layout: { pos: { x: 30, y: 100 }, size: { width: 60, height: 15 } }, meta: { label: 'MIX' } },
    { id: 'i', kind: 'cell', cellRef: 'container', layout: { pos: { x: 0, y: 0 }, size: { width: 130, height: 130 } }, meta: { label: 'MASTER' } },
  ],
};
const svg6 = generateBlueprintThumbnail(largeGroup);
validateSvg(svg6, 200, 140);

// Helper: validate SVG structure
function validateSvg(svg, expectedW, expectedH) {
  const issues = [];

  // Check basic structure
  if (!svg.startsWith('<svg')) issues.push('Does not start with <svg tag');
  if (!svg.endsWith('</svg>')) issues.push('Does not end with </svg>');
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) issues.push('Missing SVG namespace');

  // Check dimensions
  const wMatch = svg.match(/width="(\d+)"/);
  const hMatch = svg.match(/height="(\d+)"/);
  if (wMatch) {
    if (parseInt(wMatch[1]) !== expectedW) issues.push(`Expected width=${expectedW}, got ${wMatch[1]}`);
  } else {
    issues.push('Missing width attribute');
  }
  if (hMatch) {
    if (parseInt(hMatch[1]) !== expectedH) issues.push(`Expected height=${expectedH}, got ${hMatch[1]}`);
  } else {
    issues.push('Missing height attribute');
  }

  // Check viewBox
  const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (vbMatch) {
    if (parseInt(vbMatch[1]) !== expectedW) issues.push(`viewBox width mismatch: ${vbMatch[1]} vs ${expectedW}`);
    if (parseInt(vbMatch[2]) !== expectedH) issues.push(`viewBox height mismatch: ${vbMatch[2]} vs ${expectedH}`);
  } else {
    issues.push('Missing or malformed viewBox');
  }

  // Check background rect
  if (!svg.includes('<rect width="100%" height="100%"')) issues.push('Missing background rect');
  if (!svg.includes('fill="rgba(8,8,8,0.95)"')) issues.push('Missing dark background fill');

  // Check for drawn shapes
  const shapeCount = (svg.match(/<circle/g) || []).length 
    + (svg.match(/<rect/g) || []).length 
    + (svg.match(/<line/g) || []).length 
    + (svg.match(/<text/g) || []).length;
  if (shapeCount > 10) {
    // Expected: background rect + shapes for mock data components
    // Knobs: circle+circle+line=3 each × 2 knobs = 6
    // Display: rect+line+line = 3
    // Ports: circle+circle = 2 each × 2 ports = 4
    // LED: circle = 1
    // Slider: rect+rect = 2
    // Label: text = 1
    // Total elements > 10
    console.log(`  ✅ ${shapeCount} shapes rendered`);
  }
  // Actually the shape count includes <rect> for background etc.
  // Let's just check minimum

  if (issues.length === 0) {
    console.log(`  ✅ Valid SVG (${expectedW}x${expectedH}) — ${shapeCount} SVG elements`);
  } else {
    console.log(`  ❌ Issues found:`);
    issues.forEach(i => console.log(`     - ${i}`));
  }
}

console.log('\n=== Summary ===');
console.log('All tests completed.');
