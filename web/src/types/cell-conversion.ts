/**
 * @purpose Gestiona conversión bidireccional entre OmegaNode y nuevos tipos de células para compatibilidad y migración en ABDOmegaEditor.
 * @purpose_en Manages bidirectional conversion between OmegaNode and new cell types for compatibility and migration in ABDOmegaEditor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:11,imports:3,sig:hwp210
 * @lastUpdated 2026-06-15T17:03:45.556Z
 */

/**
 * ADR-046: Cell Philosophy Redesign — Conversion Utilities
 * 
 * Phase 2: Conversion utilities for migrating between OmegaNode and new types.
 * These support bidirectional conversion:
 * - omegaNodeToCellNode: Old OmegaNode → New Cell types
 * - cellNodeToOmegaNode: New Cell types → OmegaNode (for compatibility)
 */

import type { 
  OmegaNode, 
  OmegaStyleNode,
  NodeKind,
  NodeRole,
  LayoutMode,
  Position,
  Dimensions
} from '@/omega-ui-core/types/manifest';

import type {
  PrimitiveNode,
  PrimitiveType,
  CompositeCell,
  Decorator,
  BehaviorPreset,
  StructuralModule,
  LayoutStrategy,
  InternalRoute,
  Binding,
  BindingMode
} from './cell-types';

import { DEFAULT_SLOTS } from './cell-types';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map old NodeKind to PrimitiveType.
 */
function mapKindToPrimitiveType(kind: NodeKind, cellRef?: string): PrimitiveType {
  // Direct mapping based on cellRef if available
  if (cellRef) {
    const ref = cellRef.toLowerCase();
    if (ref.includes('knob')) return 'knob';
    if (ref.includes('slider')) return 'slider';
    if (ref.includes('port')) return 'port';
    if (ref.includes('led')) return 'led';
    if (ref.includes('display')) return 'display';
    if (ref.includes('switch')) return 'switch';
    if (ref.includes('button')) return 'button';
    if (ref.includes('label')) return 'label';
  }

  // Fallback based on kind
  switch (kind) {
    case 'port': return 'port';
    case 'cell':
      // Default to knob for generic cells
      return 'knob';
    default:
      return 'knob';
  }
}

/**
 * Map old role to BindingMode.
 */
function mapRoleToBindingMode(role?: NodeRole): BindingMode {
  switch (role) {
    case 'control':
      return 'continuous';
    case 'telemetry':
      return 'steps';
    default:
      return 'continuous';
  }
}

/**
 * Map binding string to Binding object.
 */
function parseBinding(bind?: string, role?: NodeRole): Binding | undefined {
  if (!bind) return undefined;
  
  return {
    parameter: bind,
    mode: mapRoleToBindingMode(role),
    polarity: 'unipolar', // Default
  };
}

/**
 * Infer BehaviorPreset from style or role.
 */
function inferBehaviorPreset(node: OmegaNode): BehaviorPreset {
  // Check style.mode for hints
  if (node.style?.mode === 'rotate') return 'rotary';
  if (node.style?.mode === 'sequence') return 'filmstrip';
  
  // Check role
  if (node.role === 'control') {
    // Could be rotary or linear depending on cellRef
    if (node.cellRef?.toLowerCase().includes('slider')) return 'linear';
    return 'rotary';
  }
  
  if (node.role === 'telemetry') return 'display';
  
  return 'rotary'; // Default
}

/**
 * Extract position from layout.
 */
function extractPosition(layout?: OmegaNode['layout']): Position {
  return layout?.pos ?? { x: 0, y: 0 };
}

/**
 * Extract size from layout or style.
 */
function extractSize(layout?: OmegaNode['layout'], style?: OmegaStyleNode): Dimensions {
  if (layout?.size) {
    return {
      width: layout.size.w ?? layout.size.width ?? 64,
      height: layout.size.h ?? layout.size.height ?? 64,
    };
  }
  
  // Fallback from style
  return {
    width: style?.width ?? style?.frameWidth ?? 64,
    height: style?.height ?? style?.frameHeight ?? 64,
  };
}

// ============================================================================
// OMEGANODE → NEW TYPES
// ============================================================================

/**
 * Convert an OmegaNode to a PrimitiveNode.
 * Only works for leaf nodes (nodes without children).
 */
export function omegaNodeToPrimitive(node: OmegaNode): PrimitiveNode {
  if (node.children && node.children.length > 0) {
    throw new Error(`Cannot convert node with children to PrimitiveNode: ${node.id}`);
  }

  const binding = parseBinding(node.bind, node.role);
  
  return {
    id: node.id,
    type: mapKindToPrimitiveType(node.kind, node.cellRef),
    variant: node.style?.variant ?? 'A_cyan',
    position: extractPosition(node.layout),
    size: extractSize(node.layout, node.style),
    ...(binding ? { binding } : {}),
  };
}

/**
 * Convert an OmegaNode to a CompositeCell.
 * The node should have kind='cell' or be a single cell with potential decorators.
 */
export function omegaNodeToComposite(node: OmegaNode): CompositeCell {
  const primitive = omegaNodeToPrimitive(node);
  
  // Build slots from node's structure or use defaults
  const primitiveSlots = DEFAULT_SLOTS[primitive.type] ?? [];
  
  // Extract decorators from attachments or style properties
  // In the new model, decorators would come from separate data
  const decorators: Decorator[] = [];
  
  // For now, we create empty decorators array
  // Full migration would extract decorations from OmegaNode.attachments or children
  
  return {
    id: node.id,
    primitive,
    slots: primitiveSlots,
    decorators,
    behavior: {
      preset: inferBehaviorPreset(node),
      config: buildBehaviorConfig(node),
    },
  };
}

/**
 * Convert an OmegaNode (container/rack) to a StructuralModule.
 */
export function omegaNodeToStructural(node: OmegaNode): StructuralModule {
  // Recursively convert children to CompositeCells
  const cells: CompositeCell[] = [];
  
  if (node.children) {
    for (const child of node.children) {
      if (child.kind === 'cell') {
        cells.push(omegaNodeToComposite(child));
      } else if (child.kind === 'container' && child.children) {
        // Nested containers become structural modules
        // For simplicity, flatten here - full impl would recurse
        for (const grandchild of child.children) {
          if (grandchild.kind === 'cell') {
            cells.push(omegaNodeToComposite(grandchild));
          }
        }
      }
    }
  }
  
  // Convert layout.mode to LayoutStrategy
  const layout = node.layout?.mode ?? 'absolute';
  const layoutStrategy: LayoutStrategy = convertLayoutMode(layout, node.layout);
  
  // Build internal routes from ports or links
  const internalRoutes: InternalRoute[] = buildInternalRoutes(node);
  
  // Extract ports for external interface
  const ports = node.ports ?? [];
  
  return {
    id: node.id,
    label: node.meta?.['label'] as string ?? node.id,
    cells,
    layout: layoutStrategy,
    internalRoutes,
    interface: {
      inputs: ports.filter(p => p.direction === 'in'),
      outputs: ports.filter(p => p.direction === 'out'),
    },
  };
}

/**
 * Main conversion function - converts any OmegaNode to appropriate new type.
 */
export function omegaNodeToCellNode(node: OmegaNode): CompositeCell | StructuralModule {
  // If node has children and they contain cells, it's structural
  if (node.children && node.children.some(c => c.kind === 'cell' || c.kind === 'container')) {
    return omegaNodeToStructural(node);
  }
  
  // Otherwise it's a composite (single cell)
  return omegaNodeToComposite(node);
}

// ============================================================================
// NEW TYPES → OMEGANODE
// ============================================================================

/**
 * Convert a PrimitiveNode back to OmegaNode (for compatibility).
 */
export function primitiveToOmegaNode(primitive: PrimitiveNode): OmegaNode {
  return {
    id: primitive.id,
    kind: 'cell',
    role: primitive.binding ? 'control' : 'primitive',
    cellRef: primitive.type,
    bind: primitive.binding?.parameter,
    layout: {
      pos: primitive.position,
      size: primitive.size,
      mode: 'absolute' as LayoutMode,
    },
    style: {
      variant: primitive.variant,
      width: primitive.size.width,
      height: primitive.size.height,
    } as OmegaStyleNode,
    visible: true,
    locked: false,
  };
}

/**
 * Convert a CompositeCell back to OmegaNode.
 */
export function compositeToOmegaNode(cell: CompositeCell): OmegaNode {
  const node = primitiveToOmegaNode(cell.primitive);
  
  // Add behavior info to style
  node.style = {
    ...node.style,
    mode: mapPresetToMode(cell.behavior.preset),
  } as OmegaStyleNode;
  
  // Add decorators as children (for legacy compatibility)
  if (cell.decorators.length > 0) {
    node.children = cell.decorators.map(d => primitiveToOmegaNode(d.primitive));
  }
  
  return node;
}

/**
 * Convert a StructuralModule back to OmegaNode.
 */
export function structuralToOmegaNode(module: StructuralModule): OmegaNode {
  // Convert all cells to OmegaNodes
  const children = module.cells.map(c => compositeToOmegaNode(c));
  
  // Build layout from LayoutStrategy
  const layout = buildLayoutFromStrategy(module.layout);
  
  // Build ports from interface
  const ports = [
    ...module.interface.inputs.map(p => ({ ...p, direction: 'in' as const })),
    ...module.interface.outputs.map(p => ({ ...p, direction: 'out' as const })),
  ];
  
  return {
    id: module.id,
    kind: 'container',
    role: 'structure',
    layout: {
      ...layout,
      mode: mapLayoutStrategyToMode(module.layout),
    },
    children,
    ports,
    meta: { label: module.label },
    visible: true,
    locked: false,
  };
}

/**
 * Main conversion function - converts any new type back to OmegaNode.
 */
export function cellNodeToOmegaNode(node: CompositeCell | StructuralModule): OmegaNode {
  if ('primitive' in node && 'slots' in node && 'behavior' in node) {
    // It's a CompositeCell
    return compositeToOmegaNode(node);
  } else if ('cells' in node && 'layout' in node) {
    // It's a StructuralModule
    return structuralToOmegaNode(node);
  }
  
  throw new Error('Unknown cell node type');
}

// ============================================================================
// HELPERS (PRIVATE)
// ============================================================================

function buildBehaviorConfig(node: OmegaNode): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  
  // Extract relevant style properties
  if (node.style?.polarity) {
    config.polarity = node.style.polarity;
  }
  if (node.style?.frames) {
    config.frames = node.style.frames;
  }
  if (node.style?.precision) {
    config.precision = node.style.precision;
  }
  
  return config;
}

function convertLayoutMode(
  mode: LayoutMode | undefined, 
  layout?: OmegaNode['layout']
): LayoutStrategy {
  switch (mode) {
    case 'stack-v':
      return { type: 'stack', direction: 'v', gap: layout?.gap ?? 8 };
    case 'stack-h':
      return { type: 'stack', direction: 'h', gap: layout?.gap ?? 8 };
    default:
      return { type: 'absolute' };
  }
}

function mapLayoutStrategyToMode(strategy: LayoutStrategy): LayoutMode {
  if (strategy.type === 'stack') {
    return strategy.direction === 'v' ? 'stack-v' : 'stack-h';
  }
  return 'absolute';
}

function buildLayoutFromStrategy(strategy: LayoutStrategy): OmegaNode['layout'] {
  const base: OmegaNode['layout'] = {
    pos: { x: 0, y: 0 },
  };
  
  if (strategy.type === 'stack') {
    base.mode = strategy.direction === 'v' ? 'stack-v' : 'stack-h';
    base.gap = strategy.gap;
    base.align = strategy.align;
  }
  
  return base;
}

function mapPresetToMode(preset: BehaviorPreset): string | undefined {
  switch (preset) {
    case 'rotary': return 'rotate';
    case 'filmstrip': return 'sequence';
    case 'stepped': return 'state';
    default: return undefined;
  }
}

function buildInternalRoutes(_node: OmegaNode): InternalRoute[] {
  // Placeholder - full implementation would parse signalPath/modulationTargets
  // from the OmegaNode to build routing table
  void _node;
  return [];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a CompositeCell conforms to its slots.
 */
export function validateCompositeSlots(cell: CompositeCell): string[] {
  const errors: string[] = [];
  
  for (const slot of cell.slots) {
    const decoratorsInSlot = cell.decorators.filter(d => d.position === slot.position);
    
    if (decoratorsInSlot.length > slot.capacity) {
      errors.push(
        `Slot "${slot.position}" in cell "${cell.id}" exceeds capacity: ` +
        `${decoratorsInSlot.length} > ${slot.capacity}`
      );
    }
    
    // Validate decorator types match slot accepts
    for (const dec of decoratorsInSlot) {
      if (!slot.accepts.includes(dec.primitive.type)) {
        errors.push(
          `Decorator type "${dec.primitive.type}" not allowed in slot ` +
          `"${slot.position}" for cell "${cell.id}"`
        );
      }
    }
  }
  
  return errors;
}

/**
 * Validate a PrimitiveNode has required fields.
 */
export function validatePrimitive(primitive: PrimitiveNode): string[] {
  const errors: string[] = [];
  
  if (!primitive.id) errors.push('Primitive missing id');
  if (!primitive.type) errors.push('Primitive missing type');
  if (!primitive.variant) errors.push('Primitive missing variant');
  if (!primitive.position) errors.push('Primitive missing position');
  if (!primitive.size) errors.push('Primitive missing size');
  
  return errors;
}

/**
 * Validate a StructuralModule has required fields and valid references.
 */
export function validateStructuralModule(module: StructuralModule): string[] {
  const errors: string[] = [];
  
  // Check required fields
  if (!module.id) errors.push('StructuralModule missing id');
  if (!module.label) errors.push('StructuralModule missing label');
  
  // Check cells array
  if (!module.cells || module.cells.length === 0) {
    errors.push(`StructuralModule "${module.id}" has no cells`);
  }
  
  // Check internal routes reference valid cell IDs
  const cellIds = new Set(module.cells?.map(c => c.id) ?? []);
  for (const route of module.internalRoutes ?? []) {
    const fromCell = route.from.split(':')[0];
    const toCell = route.to.split(':')[0];
    
    if (!cellIds.has(fromCell)) {
      errors.push(`InternalRoute references unknown cell: ${fromCell}`);
    }
    if (!cellIds.has(toCell)) {
      errors.push(`InternalRoute references unknown cell: ${toCell}`);
    }
  }
  
  // Validate layout
  if (module.layout.type === 'stack' && !module.layout.gap) {
    errors.push(`Stack layout missing gap value`);
  }
  if (module.layout.type === 'grid' && !module.layout.columns) {
    errors.push(`Grid layout missing columns value`);
  }
  
  return errors;
}