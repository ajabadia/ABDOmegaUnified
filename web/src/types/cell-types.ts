/**
 * @purpose Gestiona tipos y interfaces para estructuras celulares en el editor de manifesto OMEGA, incluyendo primitivos, composites y módulos estructurales.
 * @purpose_en Manages types and interfaces for cellular structures in the OMEGA manifest editor, including primitivos, composites, and structural modules.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:24,imports:1,sig:1t32dmd
 * @lastUpdated 2026-06-15T17:03:50.550Z
 */

/**
 * ADR-046: Cell Philosophy Redesign — Atomic, Composite, Structural
 * 
 * New cell architecture with three clear levels of abstraction:
 * - Level 1: Primitive (render-only atomic unit)
 * - Level 2: Composite (Primitive + Slots + Decorators + Behavior)
 * - Level 3: Structural (Module/SupraCell - composition of Composites)
 */

import type { Position, Dimensions, UCA_Port } from '@/omega-ui-core/types/manifest';

// ============================================================================
// LEVEL 1: PRIMITIVE (Atomic)
// ============================================================================

/**
 * Primitive types - the smallest renderable units in OMEGA.
 * These are pure rendering components with no children or state.
 */
export type PrimitiveType = 
  | 'knob' 
  | 'slider' 
  | 'port' 
  | 'led' 
  | 'display' 
  | 'switch' 
  | 'button'
  | 'label';

/**
 * Binding mode determines how the control interacts with DSP.
 */
export type BindingMode = 'continuous' | 'steps' | 'binary';

/**
 * Polarity indicates whether the control is unipolar (0-1) or bipolar (-1 to +1).
 */
export type Polarity = 'unipolar' | 'bipolar';

/**
 * Modulation target - what can modulate this binding.
 */
export interface ModulationTarget {
  /** Cell ID that can modulate this binding */
  id: string;
  /** Which port provides modulation */
  port: string;
  /** Default modulation amount (0-1) */
  amount: number;
}

/**
 * Simplified DSP binding for Primitive nodes.
 * Only contains the essential connection to the DSP layer.
 */
export interface Binding {
  /** DSP parameter path, e.g., "filter.cutoff" */
  parameter: string;
  /** How the control interacts with DSP */
  mode: BindingMode;
  /** Whether the control is unipolar or bipolar */
  polarity?: Polarity;
  /** Optional modulation routing */
  modulation?: {
    /** What can modulate this binding */
    targets: ModulationTarget[];
    /** Max modulation depth */
    depth?: number;
  };
}

/**
 * Level 1: Primitive Node (Atomic)
 * 
 * The smallest renderable unit. Only knows how to render itself.
 * No children, no state (value comes from binding), no layout logic.
 */
export interface PrimitiveNode {
  id: string;
  type: PrimitiveType;
  /** Visual variant (e.g., 'A_cyan', 'B_amber') */
  variant: string;
  /** Position within parent container (absolute) */
  position: Position;
  /** Dimensions */
  size: Dimensions;
  /** Optional DSP binding */
  binding?: Binding;
}

// ============================================================================
// LEVEL 2: COMPOSITE (Cell)
// ============================================================================

/**
 * Valid behavior presets (from industry research).
 * Determines how the control interacts with user input.
 */
export type BehaviorPreset = 
  | 'rotary'      // Continuous rotation (knobs)
  | 'filmstrip'   // Frame sequence (animated knobs)
  | 'stepped'     // Discrete steps (selectors)
  | 'binary'      // On/off (switches, buttons)
  | 'linear'      // Linear mapping (sliders)
  | 'display';    // Value display (screens)

/**
 * Slot position for decorations.
 */
export type SlotPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'overlay';

/**
 * Slot definition - where decorators can attach.
 */
export interface Slot {
  position: SlotPosition;
  /** Maximum number of decorators in this slot */
  capacity: number;
  /** What primitive types can be placed here */
  accepts: PrimitiveType[];
}

/**
 * Decorator instance - a primitive placed in a slot.
 */
export interface Decorator {
  position: SlotPosition;
  primitive: PrimitiveNode;
}

/**
 * Cell behavior configuration.
 * Simplified from the old AssetBehavior - just preset + config.
 */
export interface BehaviorConfig {
  preset: BehaviorPreset;
  /** Preset-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Level 2: Composite Cell
 * 
 * A Primitive plus slots for decoration and behavior configuration.
 * This is the main "Cell" concept in the new architecture.
 */
export interface CompositeCell {
  id: string;
  /** The host primitive (main control) */
  primitive: PrimitiveNode;
  /** Available decoration slots */
  slots: Slot[];
  /** Decoration instances placed in slots */
  decorators: Decorator[];
  /** Behavior configuration */
  behavior: BehaviorConfig;
}

// ============================================================================
// LEVEL 3: STRUCTURAL (Module/SupraCell)
// ============================================================================

/**
 * Signal type for internal routing.
 */
export type SignalType = 'audio' | 'cv' | 'gate' | 'modulation';

/**
 * Internal route between cells in a module.
 */
export interface InternalRoute {
  from: string;   // Cell ID + port (format: "cellId:portId")
  to: string;     // Cell ID + port
  type: SignalType;
}

/**
 * Layout strategy for a StructuralModule.
 */
export type LayoutStrategy = 
  | { type: 'stack'; direction: 'v' | 'h'; gap: number; align?: 'start' | 'center' | 'end' }
  | { type: 'grid'; columns: number; gap: number }
  | { type: 'absolute' };  // Cells have explicit positions

/**
 * External interface for a StructuralModule.
 */
export interface ModuleInterface {
  inputs: UCA_Port[];
  outputs: UCA_Port[];
}

/**
 * Level 3: Structural Module (SupraCell)
 * 
 * A composition of Cells plus layout strategy and internal routing.
 * This is the unit of screen arrangement.
 */
export interface StructuralModule {
  id: string;
  label: string;
  /** Cells in this module */
  cells: CompositeCell[];
  /** How to arrange cells */
  layout: LayoutStrategy;
  /** Internal signal routing between cells */
  internalRoutes: InternalRoute[];
  /** External interface (ports that connect outside) */
  interface: ModuleInterface;
}

// ============================================================================
// UNION TYPE & MIGRATION
// ============================================================================

/**
 * Union of all cell node types.
 * Use this for functions that accept any cell level.
 */
export type CellNode = PrimitiveNode | CompositeCell | StructuralModule;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a node is a Primitive (has no children and simple structure).
 */
export function isPrimitiveNode(node: { kind?: string; children?: unknown[] }): boolean {
  return node.kind === 'port' || !node.children || node.children.length === 0;
}

/**
 * Check if a node is a Composite (kind='cell').
 */
export function isCompositeCell(node: { kind?: string }): boolean {
  return node.kind === 'cell';
}

/**
 * Check if a node is a Structural (kind='container' or 'rack').
 */
export function isStructuralModule(node: { kind?: string }): boolean {
  return node.kind === 'container' || node.kind === 'rack';
}

/**
 * @deprecated Use standalone functions instead: isPrimitiveNode, isCompositeCell, isStructuralModule
 */
export const cellMigration = {
  isPrimitive: isPrimitiveNode,
  isComposite: isCompositeCell,
  isStructural: isStructuralModule,
};

// ============================================================================
// DEFAULT SLOT CONFIGURATIONS
// ============================================================================

/**
 * Default slots for common primitive types.
 * These define where decorators can typically attach.
 */
export const DEFAULT_SLOTS: Record<PrimitiveType, Slot[]> = {
  knob: [
    { position: 'top', capacity: 1, accepts: ['label', 'led'] },
    { position: 'bottom', capacity: 1, accepts: ['label'] },
  ],
  slider: [
    { position: 'left', capacity: 1, accepts: ['label'] },
    { position: 'right', capacity: 1, accepts: ['label', 'led'] },
  ],
  switch: [
    { position: 'top', capacity: 1, accepts: ['label'] },
  ],
  button: [
    { position: 'top', capacity: 1, accepts: ['label', 'led'] },
  ],
  port: [
    { position: 'center', capacity: 1, accepts: ['label'] },
  ],
  led: [
    { position: 'overlay', capacity: 1, accepts: ['label'] },
  ],
  display: [
    { position: 'center', capacity: 1, accepts: ['label'] },
  ],
  label: [],  // Labels don't have slots for other decorators
};

/**
 * Default behavior configs by primitive type.
 */
export const DEFAULT_BEHAVIOR: Record<PrimitiveType, BehaviorConfig> = {
  knob: { preset: 'rotary', config: { polarity: 'unipolar' } },
  slider: { preset: 'linear', config: { polarity: 'unipolar' } },
  switch: { preset: 'binary', config: {} },
  button: { preset: 'binary', config: {} },
  port: { preset: 'display', config: {} },
  led: { preset: 'binary', config: {} },
  display: { preset: 'display', config: {} },
  label: { preset: 'display', config: {} },
};