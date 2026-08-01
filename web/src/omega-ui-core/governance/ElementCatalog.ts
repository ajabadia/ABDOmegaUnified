/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Gestiona y proporciona catálogos y capacidades para elementos de interfaz en el editor de manifesto OMEGA.
 * @purpose_en Manages and provides catalogues and capabilities for UI elements in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:6,imports:0,sig:18dqawj
 * @lastUpdated 2026-06-15T15:18:00.229Z
 */

/**
 * ═══════════════════════════════════════════════
 * OMEGA ELEMENT CATALOG (Era 7.2.3)
 * ═══════════════════════════════════════════════
 * Central Governance Registry for OMEGA UI Elements.
 * Defines the taxonomy and capabilities of all aesthetic primitives.
 *
 * IMPORTANT ARCHITECTURAL NOTE:
 * This catalog acts as an INVENTORY and UX HINT engine.
 * - 'capabilities' and 'allowedFragments' are soft suggestions for UI filtering.
 * - RUNTIME AUTHORITY belongs to the UCA Tree and Blueprints.
 * - The renderer MUST NOT block configurations not present in this catalog.
 */

export type ElementCategory = 'infrastructure' | 'signal' | 'io' | 'telemetry' | 'mechanical' | 'decor' | 'rack';

export type AestheticCapability = 
  | 'variant'      // Visual preset selection (e.g., A_cyan, glass)
  | 'color'        // Primary color override (e.g., faceplate, body)
  | 'indicatorColor' // Indicator/Marker color (for knobs/sliders)
  | 'glassColor'   // Glass/Overlay color (for displays/valves)
  | 'glowColor'    // Emission/Filament color (for valves/LEDs)
  | 'asset'        // Image/Asset selection (e.g., filmstrip, logo)
  | 'font'         // Typography family/pointer override
  | 'fontSize'     // Numerical font size override
  | 'fontColor'    // Typography color override
  | 'precision'    // Numerical display precision or meter resolution
  | 'tiling'       // Background tiling/repetition (for large surfaces)
  | 'spacing'      // Internal layout spacing (e.g., screw distance)
  | 'material'     // Mechanical material (e.g., plastic, metal)
  | 'shadow'       // Outer shadow / Drop shadow
  | 'shadowInner'  // Inner shadow / Inset shadow
  | 'position'     // X/Y Coordinates (Era 7 Spatial Architecture)
  | 'size'         // W/H Dimensions (HP/PX)
  | 'height'       // Physical prominence (protrusion/recess)
  | 'opacity'      // Alpha transparency
  | 'rounding'     // Corner radius control
  | 'borderWidth'  // Stroke/Border thickness for frames
  | 'padding'      // Internal container spacing
  | 'intensity'    // Light emission strength (for LEDs/Glow)
  | 'alignment'    // Text/Content alignment (Left/Center/Right)
  | 'texture'      // Procedural surface grain/noise
  | 'labelPosition' // Anchor point for labels
  | 'tab'          // Architectural plane assignment (GLOBAL, MAIN, etc.)
  | 'collapsed'    // Folded/Unfolded state in rack
  | 'active'       // Enable/Disable logic
  | 'thickness'    // Line/Cable thickness
  | 'blur'         // Backdrop blur / Glass effect
  | 'labelX'       // X Offset for internal labels
  | 'labelY'       // Y Offset for internal labels
  | 'labelW'       // Alias for labelWidth
  | 'labelH'       // Alias for labelHeight
  | 'labelWidth'       // Explicit width for internal labels
  | 'labelHeight'      // Explicit height for internal labels
  | 'labelBg'      // Background color for internal labels
  | 'labelRounding' // Corner radius for internal labels
  | 'labelPadding' // Internal spacing for internal labels
  | 'frames'        // Total frames for filmstrip assets
  | 'fitting'       // Asset scaling mode (stretch, contain, cover, tile)
  | 'orientation'   // Filmstrip layout (v, h)
  | 'frameWidth'    // Width of a single animation frame
  | 'frameHeight'   // Height of a single animation frame
  | 'mouseResponse' // Interaction behavior (rotary/linear)
  | 'mode'          // Animation mode (rotate/sequence/state)
  | 'zIndex';       // Layer stack order

export interface ElementDefinition {
  id: string;
  label: string;
  category: ElementCategory;
  description: string;
  icon: string;
  capabilities: AestheticCapability[];
  attachmentRole: 'host' | 'fragment' | 'both' | 'none';
  /**
   * ARCHITECTURAL NOTE: 
   * `allowedFragments` is advisory only. Use it for editor UX suggestions (e.g. "+ Add" menus),
   * not for runtime enforcement. Blueprints and UCA own structural authority.
   */
  allowedFragments?: string[]; // IDs of elements that can be attached to this host
  cssSelector?: string; // Reference to the primary CSS class
  defaultAssetPath?: string;
  supportedAssetModes?: ('static' | 'sequence')[];
}

export const OMEGA_ELEMENT_CATALOG: ElementDefinition[] = [
  // RACK & INFRASTRUCTURE
  {
    id: 'rack',
    label: 'Module Chassis (Rack)',
    category: 'rack',
    capabilities: ['asset', 'color', 'tiling', 'shadowInner', 'texture', 'rounding', 'borderWidth', 'blur'],
    description: 'The main surface and structural frame of the OMEGA Rack.',
    icon: '🏗️',
    attachmentRole: 'host',
    allowedFragments: ['rack-screw', 'label', 'illustration'],
    supportedAssetModes: ['static']
  },
  {
    id: 'rack-screw',
    label: 'Mounting Screw',
    category: 'rack',
    capabilities: ['variant', 'color', 'asset', 'size', 'shadow', 'intensity', 'opacity', 'material', 'spacing'],
    description: 'Industrial rack hardware for module mounting.',
    icon: '🔩',
    attachmentRole: 'fragment',
    allowedFragments: ['label', 'illustration', 'led']
  },
  {
    id: 'face',
    label: 'Module Faceplate',
    category: 'rack',
    capabilities: ['asset', 'color', 'position', 'size', 'rounding', 'borderWidth', 'blur', 'zIndex'],
    description: 'The primary surface for component mounting.',
    icon: '🎭',
    attachmentRole: 'host',
    allowedFragments: ['label', 'illustration', 'container', 'group', 'cell']
  },

  // COMPONENT PRIMITIVES (CONTROLS -> SIGNAL)
  {
    id: 'knob',
    label: 'Control Knob',
    category: 'signal',
    description: 'Universal rotary potentiometer for parameter control.',
    icon: '🔘',
    capabilities: ['variant', 'color', 'asset', 'indicatorColor', 'size', 'shadow'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led', 'port', 'switch', 'stepper', 'graphic-fragment'],
    supportedAssetModes: ['static', 'sequence']
  },
  {
    id: 'slider-v',
    label: 'Vertical Slider',
    category: 'signal',
    description: 'Linear fader for precision level control.',
    icon: '🎚️',
    capabilities: ['variant', 'color', 'asset', 'opacity', 'size', 'shadow'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led', 'port', 'graphic-fragment'],
    supportedAssetModes: ['static', 'sequence']
  },
  {
    id: 'slider-h',
    label: 'Horizontal Slider',
    category: 'signal',
    description: 'Horizontal linear control for panning or crossfading.',
    icon: '↔️',
    capabilities: ['variant', 'color', 'asset', 'opacity', 'size', 'shadow'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led', 'port', 'graphic-fragment'],
    supportedAssetModes: ['static', 'sequence']
  },
  {
    id: 'switch',
    label: 'Toggle Switch',
    category: 'signal',
    description: 'Mechanical toggle or rocker for binary states.',
    icon: '⏻',
    capabilities: ['variant', 'color', 'asset', 'size', 'shadow'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led'],
    supportedAssetModes: ['static', 'sequence']
  },
  {
    id: 'stepper',
    label: 'Step Selector',
    category: 'signal',
    description: 'Incremental step selection buttons.',
    icon: '🔢',
    capabilities: ['variant', 'color', 'asset', 'size', 'intensity', 'glowColor'],
    attachmentRole: 'both',
    allowedFragments: ['label'],
    supportedAssetModes: ['sequence']
  },
  {
    id: 'select',
    label: 'Dropdown Selector',
    category: 'signal',
    description: 'Menu-driven option selection.',
    icon: '📑',
    capabilities: ['variant', 'color', 'font', 'fontSize', 'fontColor', 'size'],
    attachmentRole: 'host',
    allowedFragments: ['label']
  },
  {
    id: 'input-numeric',
    label: 'Numeric Field',
    category: 'signal',
    description: 'Direct numerical value entry.',
    icon: '🔢',
    capabilities: ['variant', 'color', 'font', 'fontSize', 'fontColor', 'precision', 'size'],
    attachmentRole: 'host',
    allowedFragments: ['label']
  },
  {
    id: 'input-text',
    label: 'Text Input',
    category: 'signal',
    description: 'Alphanumeric string entry.',
    icon: '⌨️',
    capabilities: ['variant', 'color', 'font', 'fontSize', 'fontColor', 'size'],
    attachmentRole: 'host',
    allowedFragments: ['label']
  },

  // IO & SIGNALS
  {
    id: 'port',
    label: 'Signal Jack (Port)',
    category: 'io',
    description: 'Physical audio or CV connection point.',
    icon: '🔌',
    capabilities: ['variant', 'color', 'shadow'],
    attachmentRole: 'both',
    allowedFragments: ['label', 'led']
  },
  {
    id: 'patch-cable',
    label: 'Patch Cable',
    category: 'io',
    description: 'Visual representation of signal flow.',
    icon: '🧶',
    capabilities: ['color', 'opacity', 'thickness'],
    attachmentRole: 'none'
  },

  // FEEDBACK & VISUALIZATION (TELEMETRY)
  {
    id: 'display',
    label: 'Digital Display',
    category: 'telemetry',
    description: 'High-resolution telemetry screen.',
    icon: '📟',
    capabilities: ['variant', 'color', 'glassColor', 'glowColor', 'font', 'fontSize', 'fontColor', 'precision', 'rounding', 'intensity'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'stepper']
  },
  {
    id: 'vumeter',
    label: 'VU Meter',
    category: 'telemetry',
    description: 'Signal level monitoring bar.',
    icon: '🚥',
    capabilities: ['variant', 'color', 'shadow'],
    attachmentRole: 'host',
    allowedFragments: ['label']
  },
  {
    id: 'led',
    label: 'Status LED',
    category: 'telemetry',
    description: 'Light emitting diode for state feedback.',
    icon: '🚨',
    capabilities: ['variant', 'glowColor', 'opacity', 'intensity'],
    attachmentRole: 'fragment',
    allowedFragments: ['label', 'illustration', 'led']
  },
  {
    id: 'scope',
    label: 'Waveform Scope',
    category: 'telemetry',
    description: 'Real-time signal visualization.',
    icon: '📉',
    capabilities: ['variant', 'color', 'glassColor', 'thickness', 'opacity', 'rounding'],
    attachmentRole: 'none'
  },
  {
    id: 'terminal',
    label: 'Text Terminal',
    category: 'telemetry',
    description: 'Command line or debug output stream.',
    icon: '🖥️',
    capabilities: ['variant', 'color', 'font', 'fontSize', 'fontColor', 'size', 'rounding'],
    attachmentRole: 'host',
    allowedFragments: ['label']
  },

  // MECHANICAL & VINTAGE COMPONENTS
  {
    id: 'vacuum-tube',
    label: 'Vacuum Tube',
    category: 'mechanical',
    description: 'Analog valve for saturation and warmth.',
    icon: '💡',
    capabilities: ['variant', 'glassColor', 'glowColor', 'opacity', 'size', 'intensity'],
    attachmentRole: 'none'
  },
  {
    id: 'tape-reel',
    label: 'Tape Reel',
    category: 'mechanical',
    description: 'Magnetic tape mechanical assembly.',
    icon: '🎞️',
    capabilities: ['variant', 'color', 'size', 'shadow'],
    attachmentRole: 'none'
  },
  {
    id: 'reverb-spring',
    label: 'Reverb Spring',
    category: 'mechanical',
    description: 'Electromechanical spring reverb tank.',
    icon: '🌀',
    capabilities: ['variant', 'color', 'size', 'shadow'],
    attachmentRole: 'none'
  },

  // BRANDING & ANNOTATION (DECOR)
  {
    id: 'label',
    label: 'Text Label',
    category: 'decor',
    description: 'Static or dynamic text indicator.',
    icon: '🏷️',
    capabilities: ['variant', 'color', 'font', 'fontSize', 'fontColor', 'opacity', 'size', 'alignment', 'spacing', 'shadow'],
    attachmentRole: 'fragment',
    allowedFragments: []
  },
  {
    id: 'graphic-fragment',
    label: 'Graphic Fragment',
    category: 'decor',
    description: 'Universal visual slave for branding or custom filmstrip sequences.',
    icon: '🖼️',
    capabilities: ['asset', 'size', 'position', 'fitting', 'frames', 'orientation', 'mode', 'opacity', 'blur', 'shadow', 'zIndex'],
    attachmentRole: 'fragment'
  },
  
  {
    id: 'sequence-layer',
    label: 'Sequence Layer',
    category: 'mechanical',
    description: 'Industrial filmstrip host for complex animations (knobs, sliders, leds).',
    icon: '🎞️',
    defaultAssetPath: 'lib:sequences',
    capabilities: ['asset', 'frames', 'frameWidth', 'frameHeight', 'orientation', 'mouseResponse', 'mode', 'opacity', 'size', 'position', 'zIndex'],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led', 'graphic-fragment'],
    supportedAssetModes: ['sequence']
  },
  
  // SPECIAL
  {
    id: 'hidden',
    label: 'Logical Node',
    category: 'infrastructure',
    description: 'Non-rendered technical entity.',
    icon: '👻',
    capabilities: [],
    attachmentRole: 'none'
  },

  // ARCHITECTURAL ELEMENTS (INFRASTRUCTURE)
  {
    id: 'container',
    label: 'Module Section',
    category: 'infrastructure',
    description: 'Structural container for grouping components.',
    icon: '📦',
    capabilities: [
      'variant', 'color', 'indicatorColor', 'font', 'fontSize', 'fontColor', 
      'rounding', 'borderWidth', 'opacity', 'alignment', 'thickness', 'shadow', 'spacing', 'zIndex', 'blur',
      'labelX', 'labelY', 'labelWidth', 'labelHeight', 'labelBg', 'labelRounding', 'labelPadding',
      'position', 'size'
    ],
    attachmentRole: 'host',
    allowedFragments: ['label', 'led', 'illustration', 'rack-screw', 'graphic-fragment'],
    supportedAssetModes: ['static']
  },
   {
    id: 'group',
    label: 'Logical Group',
    category: 'infrastructure',
    description: 'Visual boundary for related controls.',
    icon: '🖇️',
    capabilities: [
      'variant', 'color', 'asset', 'font', 'fontSize', 'fontColor', 
      'rounding', 'borderWidth', 'opacity', 'shadow', 'spacing', 'zIndex', 'blur',
      'position', 'size'
    ],
    attachmentRole: 'host',
    allowedFragments: ['label', 'illustration']
  },
];

/**
 * Helper to get a definition by component type
 */
export const getElementDefinition = (type: string): ElementDefinition | undefined => {
  return OMEGA_ELEMENT_CATALOG.find(e => e.id === type);
};

/**
 * Helper to check if a component supports a specific capability
 */
export const hasCapability = (type: string, cap: AestheticCapability): boolean => {
  const def = getElementDefinition(type);
  return def?.capabilities.includes(cap) || false;
};
