/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona interfaces y tipos para archivos manifesto en OMEGA ERA 7.2.3, incluyendo gestión de activos, definiciones de componentes, configuraciones de señales y estilos de interfaz de usuario.
 * @purpose_en Defines interfaces and types for manifest files in OMEGA ERA 7.2.3, including asset management, component definitions, signal configurations, and UI styles.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:59,imports:0,sig:y5ga6i
 * @lastUpdated 2026-06-15T16:10:30.392Z
 */

/**
 * OMEGA ERA 7.2.3 - CANONICAL MANIFEST INTERFACES
 * Following ERA 4 Hardening Standards
 */

export type RegistryRole = 'control' | 'telemetry' | 'stream' | 'mod_target';
export type ComponentType = 'knob' | 'slider-v' | 'slider-h' | 'select' | 'switch' | 'button' | 'port' | 'led' | 'display' | 'label' | 'illustration' | 'scope' | 'terminal';
export type AttachmentType = 'knob' | 'port' | 'slider-v' | 'slider-h' | 'switch' | 'push' | 'label' | 'display' | 'led' | 'stepper' | 'path';

export interface ExtraResource {
  name: string;
  data: ArrayBuffer;
  type: string;
}

export interface OMEGA_Asset {
  id: string;
  url: string;      // asset://filename.png, data:image/... o path relativo
  type: 'image' | 'filmstrip' | 'svg';
  frames?: number | undefined;  // Obligatorio para filmstrips
  orientation?: 'v' | 'h' | undefined; // Orientación del filmstrip
  path?: string | undefined; // Full physical path for library assets
  defaultFrame?: number | undefined; // Default frame for preview
  category?: string | undefined; // Grouping category
}

export interface OMEGA_Font {
  name: string;
  url?: string | undefined;
  file?: string | undefined;
}

export type TabName = 'MAIN' | 'VOICE' | 'FX' | 'MOD' | 'EDIT' | 'MIDI' | 'ADVANCED' | string;

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
  w?: number | undefined; // LEGACY SHIM
  h?: number | undefined; // LEGACY SHIM
}

export type SignalType = 'audio' | 'cv' | 'gate' | 'midi' | 'clock' | 'system' | string;
export type PortDirection = 'in' | 'out';

/**
 * UCA PHASE 17 - UNIVERSAL SIGNAL PORT
 * Formal behavioral contract for signal routing.
 */
export interface UCA_Port {
  id: string;
  direction: PortDirection;
  signalType: SignalType;
  label?: string | undefined;
  bind?: string | undefined; // DSP Contract ID / Signal mapping
  pos?: Position | undefined; // Optional for visual routing/cables
  metadata?: Record<string, unknown> | undefined;
}

/**
 * PHASE 18 - OMEGA LINK / MODULATION
 * Explicit signal or modulation connection between paths.
 */
export interface OMEGA_Modulation {
  id: string;
  source: string; // Hierarchical path (e.g., osc_1/out)
  target: string; // Hierarchical path (e.g., filter_1/in)
  amount?: number | undefined;
  type?: 'unipolar' | 'bipolar' | 'additive' | 'multiplicative' | string | undefined;
  kind?: 'modulation' | 'audio' | 'cv' | string | undefined;
}

// Alias for structural links
export type OmegaLink = OMEGA_Modulation;

export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string;
  pos: Position;
  bind?: string | undefined;
  role?: string | undefined;
  style?: Partial<OmegaStyleNode> | undefined;
  fontFamily?: string | undefined;
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  isCore?: boolean | undefined;
  // Extended Industrial Metadata
  position?: string | undefined; 
  variant?: string | undefined;
  text?: string | undefined;
  offsetX?: number | undefined;
  offsetY?: number | undefined;
}

export interface LightingGovernance {
  shadowAngle?: number | undefined;
  ambientIntensity?: number | undefined;
  specularIntensity?: number | undefined;
  surfaceGrain?: number | undefined;
  globalBlur?: number | undefined;
  opacity?: number | undefined;
  [key: string]: unknown;
}

export interface HardwareGovernance {
  variant?: string | undefined;
  screwOffset?: number | undefined;
  screwMapping?: string[] | undefined;
  showRails?: boolean | undefined;
  railColor?: string | undefined;
  [key: string]: unknown;
}

export type FaceplateGovernance = string | {
  asset?: string | undefined;
  color?: string | undefined;
  texture?: string | undefined;
  [key: string]: unknown;
};

/**
 * OmegaStyleNode: Modular aesthetic governance unit.
 */
export interface OmegaStyleNode {
  variant?: string | undefined;
  color?: string | undefined;
  indicatorColor?: string | undefined;
  glowColor?: string | undefined;
  glassColor?: string | undefined;
  font?: string | undefined;
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  opacity?: number | undefined;
  blur?: number | undefined;
  texture?: string | undefined;
  borderWidth?: number | undefined;
  rounding?: number | undefined;
  labelW?: number | undefined;
  labelH?: number | undefined;
  padding?: number | undefined;
  thickness?: number | undefined;
  alignment?: 'left' | 'center' | 'right' | undefined;
  zIndex?: number | undefined;
  asset?: string | undefined;
  fitting?: 'stretch' | 'cover' | 'contain' | 'tile' | 'center' | undefined;
  material?: string | undefined;
  spacing?: number | undefined;
  labelX?: number | undefined;
  labelY?: number | undefined;
  labelWidth?: number | undefined;
  labelHeight?: number | undefined;
  labelBg?: string | undefined;
  labelRounding?: number | undefined;
  labelPadding?: number | undefined;
  frames?: number | undefined;
  frameWidth?: number | undefined;
  frameHeight?: number | undefined;
  orientation?: 'v' | 'h' | undefined;
  width?: number | undefined;
  height?: number | undefined;
  offsetX?: number | undefined;
  offsetY?: number | undefined;
  graphicMode?: 'static' | 'sequence' | undefined;
  zeroAnchor?: number | undefined;
  mode?: 'rotate' | 'sequence' | 'state' | string | undefined;
  mouseResponse?: 'rotary' | 'linear' | undefined;
  category?: string | undefined;
  polarity?: 'normal' | 'inverted' | undefined;
  precision?: number | undefined;
  active?: boolean | undefined;
  useSpecificRounding?: boolean | undefined;
  roundingTL?: number | undefined;
  roundingTR?: number | undefined;
  roundingBL?: number | undefined;
  roundingBR?: number | undefined;
  tiling?: number | undefined;
  id?: string | undefined;
  name?: string | undefined;
  path?: string | undefined;
  defaultFrame?: number | undefined;
  testValue?: number | undefined;
  variantOverride?: string | undefined;
  backgroundAsset?: string | undefined;
  [key: string]: unknown;
}

export interface StyleVariant {
  id: string;
  label: string;
  aesthetics: Partial<OmegaStyleNode>;
}

export type ContainerSizeUnit = '1U' | '2U' | '3U' | '4U' | '5U' | '6U' | '7U' | '8U' | '100%' | string;
export type ContainerVariant = 'industrial' | 'glass' | 'none' | string;

export interface ContainerSize {
  width: ContainerSizeUnit | number;
  height: number;
  w?: number | undefined; 
  h?: number | undefined; 
}

export interface LayoutContainer {
  id: string;
  label: string;
  pos: Position;
  size: ContainerSize;
  variant: ContainerVariant;
  zIndex?: number | undefined;
  labelPosition?: 'top' | 'bottom' | 'inside-top' | 'inside-bottom' | undefined;
  tab?: TabName | string | undefined;
  collapsed?: boolean | undefined;
  asset?: string | undefined;         
  color?: string | undefined;         
  indicatorColor?: string | undefined; 
  font?: string | undefined;          
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  rounding?: number | undefined;
  borderWidth?: number | undefined;
  thickness?: number | undefined;     
  opacity?: number | undefined;
  labelX?: number | undefined;        
  labelY?: number | undefined;
  labelWidth?: number | undefined;
  labelHeight?: number | undefined;
  labelBg?: string | undefined;
  labelRounding?: number | undefined;
  labelPadding?: number | undefined;
  style?: OmegaStyleNode | undefined;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface Presentation {
  tab: TabName | string;
  component: ComponentType | string;
  variant: string;
  offsetX: number;
  offsetY: number;
  container?: string | undefined;
  colSpan?: number | undefined;
  rowSpan?: number | undefined;
  asset?: string | undefined;
  filmstrip_frame?: number | undefined;
  attachments: Attachment[];
  style?: OmegaStyleNode | undefined;
  scale?: 'S' | 'M' | 'L' | 'XL' | number | undefined;
  size?: Dimensions | undefined;
  precision?: number | undefined;
  step?: number | undefined;
  color?: string | undefined;
  indicatorColor?: string | undefined;
  glowColor?: string | undefined;
  glassColor?: string | undefined;
  options?: SelectOption[] | undefined;
  ui_precision?: number | undefined;
  ui?: {
    disabled?: boolean | undefined;
    readOnly?: boolean | undefined;
    hidden?: boolean | undefined;
    [key: string]: boolean | undefined;
  } | undefined;
  unit?: string | undefined;
  opacity?: number | undefined;
  font?: string | undefined;
  fontSize?: number | undefined;
  fontColor?: string | undefined;
  lookup?: string | undefined;
  height?: number | undefined;
  thickness?: number | undefined;
  intensity?: number | undefined;
  rounding?: number | undefined;
  alignment?: 'left' | 'center' | 'right' | undefined;
  padding?: number | undefined;
  texture?: string | undefined;
  frames?: number | undefined;  
  frameWidth?: number | undefined;
  frameHeight?: number | undefined;
  orientation?: 'v' | 'h' | undefined;
  fitting?: 'stretch' | 'cover' | 'contain' | 'tile' | 'center' | undefined;
  labelBg?: string | undefined;
  labelX?: number | undefined;
  labelY?: number | undefined;
  labelWidth?: number | undefined;
  labelHeight?: number | undefined;
  labelRounding?: number | undefined;
  labelPadding?: number | undefined;
}

export interface ManifestEntity {
  id: string;
  type: RegistryRole | string;
  label: string;
  pos: Position;
  size: Dimensions;
  presentation?: Presentation | undefined;
  meta?: Record<string, unknown> | undefined;
  role?: string | undefined;
  bind?: string | undefined;
  unit?: string | undefined;
  // Industrial Extensions
  name?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  isLocal?: boolean | undefined;
  path?: string | undefined;
  assetBehavior?: import('./assetBehavior').AssetBehavior | undefined;
  recipe?: import('./assetBehavior').LayerRecipe | undefined;
}
 
export interface OMEGA_Metric {
  id?: string | undefined;
  label: string;
  value: number | string;
  color?: string | undefined;
  unit?: string | undefined;
  status?: 'nominal' | 'warning' | 'critical' | undefined;
}

export type NodeKind = 'container' | 'cell' | 'rack' | 'face' | 'port' | 'asset-layer' | 'layer' | 'group' | 'patch' | 'root';
export type NodeRole = 
  | 'structure' 
  | 'control' 
  | 'telemetry' 
  | 'io' 
  | 'container' 
  | 'composite'
  | 'primitive'
  | string;

export interface OmegaConstraints {
  clampToParent?: boolean | undefined;
  margin?: number | undefined;
}

export type LayoutMode = 'absolute' | 'stack-v' | 'stack-h';

export interface OmegaNode {
  id: string;
  kind: NodeKind;
  role?: NodeRole | undefined;
  cellRef?: string | undefined;
  bind?: string | undefined;
  layout: {
    pos: Position;
    size?: Dimensions | undefined;
    transform?: string | undefined;
    zIndex?: number | undefined;
    mode?: LayoutMode | undefined;
    gap?: number | undefined;
    padding?: number | undefined;
    align?: 'start' | 'center' | 'end' | 'stretch' | undefined;
    justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | undefined;
  };
  style?: OmegaStyleNode | undefined;
  visible?: boolean | undefined;
  locked?: boolean | undefined;
  children?: OmegaNode[] | undefined;
  ports?: UCA_Port[] | undefined;
  modulationTargets?: string[] | undefined;
  signalPath?: string | undefined;
  overrides?: Record<string, unknown> | undefined;
  constraints?: OmegaConstraints | undefined;
  slotMappings?: Record<string, string> | undefined;
  templateRef?: string | undefined;
  snapshot?: OmegaNode | undefined;
  meta?: Record<string, unknown> | undefined;
}

/**
 * PHASE 21 - HYBRID UPDATE CONTRACT
 * Allows atomic updates to both legacy and modern entities.
 */
export type HybridEntityUpdate = Partial<OmegaNode> | Partial<ManifestEntity>;

export interface ModuleTemplate {
  id: string;
  label: string;
  category: 'primitive' | 'composite' | 'structure' | 'infrastructure' | 'signal' | 'io' | 'telemetry' | 'mechanical' | 'decor' | 'control';
  baseNode: OmegaNode;
  policy?: OverridePolicy[] | undefined;
  slots?: { id: string; label: string; [key: string]: unknown }[] | undefined;
  metadata?: Record<string, unknown> | undefined;
  compatibility?: Record<string, string> | undefined;
  assetBehavior?: import('./assetBehavior').AssetBehavior | undefined;
  recipe?: import('./assetBehavior').LayerRecipe | undefined;
  family?: string | undefined;
  description?: string | undefined;
  version?: string | undefined;
}

export type CellTemplate = ModuleTemplate;

export interface OverridePolicy {
  path: string;
  mode: 'locked' | 'editable' | 'hidden';
}

export type OverrideMode = 'locked' | 'editable' | 'hidden';

export interface BlueprintPlaceholder {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'selection' | 'color' | 'enumValue';
  defaultValue: string | number | boolean;
  options?: ({ label: string; value: string | number | boolean } | string | number | boolean)[] | undefined;
  // Extended fields for Phase 20
  required?: boolean | undefined;
  hint?: string | undefined;
  description?: string | undefined;
  valueType?: 'string' | 'number' | 'boolean' | 'selection' | 'color' | 'enumValue' | undefined; // Alias
  allowedValues?: ({ label: string; value: string | number | boolean } | string | number | boolean)[] | undefined; // Alias
}

export type BlueprintPlaceholderDefinition = BlueprintPlaceholder;

export interface BlueprintAutoWirePolicy {
  mode: 'none' | 'smart' | 'aggressive' | 'strict';
  targetSignals?: string[] | undefined;
}

export type BlueprintInsertionMode = 'commit' | 'preview' | 'dryRun';
export type IdCollisionStrategy = 'remap' | 'error' | 'overwrite';
export type CompatibilityStatus = 'compliant' | 'warning' | 'incompatible';
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface BlueprintAutoWireDecision {
  nodeId: string;
  targetId: string;
  strategy: string;
  status: 'created' | 'skipped' | 'failed' | 'bound';
  reason?: string | undefined;
  wireId?: string | undefined; // Optional for links
}

export type BlueprintPlaceholderValues = Record<string, string | number | boolean>;

export interface BlueprintCompatibility {
  allowedParentKinds?: NodeKind[] | undefined;
  deniedParentKinds?: NodeKind[] | undefined;
  suggestedRoles?: NodeRole[] | undefined;
}

export interface BlueprintDefinition {
  blueprintId: string;
  version: string;
  name: string;
  origin: 'user' | 'system' | 'library';
  rootNode: OmegaBlueprintNode;
  metadata?: {
    thumbnail?: string;
  } | undefined;
  placeholders?: BlueprintPlaceholder[] | undefined;
  compatibility?: BlueprintCompatibility | undefined;
  description?: string | undefined;
  templateId?: string | undefined;
  autoWirePolicy?: BlueprintAutoWirePolicy | undefined;
  materializeSnapshot?: boolean | undefined;
  defaultOverridePolicy?: string | undefined;
  ui?: {
    styles?: Record<string, StyleVariant[]> | undefined;
  } | undefined;
}

export interface OmegaBlueprintNode {
  id: string;
  kind: NodeKind;
  role?: NodeRole | undefined;
  layout?: {
    pos: Position;
    size?: Dimensions | undefined;
    mode?: LayoutMode | undefined;
  } | undefined;
  style?: OmegaStyleNode | undefined;
  children?: OmegaBlueprintNode[] | undefined;
  ports?: UCA_Port[] | undefined;
  cellRef?: string | undefined;
  bind?: string | undefined;
  modulationTargets?: string[] | undefined;
}

export type { GridGuide } from './rack';

export interface GridConfig {
  enabled: boolean;
  spacingX: number;
  spacingY: number;
  snapMode: 'center' | 'corner' | 'edge';
  visible?: boolean | undefined;
  showGuides?: boolean | undefined;
  guides?: import('./rack').GridGuide[] | undefined;
}

export interface FontDefinition {
  id: string;
  label: string;
  family: string;
  weight?: string | number | undefined;
}

export interface TypographyConfig {
  defaultFont?: string | undefined;
  definitions?: FontDefinition[] | undefined;
  [key: string]: unknown;
}

export interface OMEGA_Contract {
  id: string;
  label: string;
  role: string;
  ports: UCA_Port[];
  omega_version?: string | undefined;
  parameters?: Array<{
    id: string;
    name: string;
    min: number;
    max: number;
    default: number;
    unit?: string | undefined;
  }> | undefined;
}

export interface UcaDebugConfig {
  enabled: boolean;
  showLabels: boolean;
  hideDecorative: boolean;
  showCADOverlay: boolean;
  selectedId?: string | null | undefined;
}

export interface OMEGA_Manifest {
  id?: string | undefined;
  schemaVersion?: string | undefined;
  nodes?: OmegaNode[] | undefined; // Canonical UCA Tree Root
  metadata: ManifestMetadata;
  resources: {
    assets?: OMEGA_Asset[] | undefined;
    extra?: ExtraResource[] | undefined;
    fonts?: OMEGA_Font[] | undefined;
    wasm?: unknown | undefined; // Legacy/Technical
    contract?: OMEGA_Contract | undefined;
  };
  ui: {
    skin?: string | undefined;
    skinMode?: 'standard' | 'custom' | undefined;
    dimensions?: { width: number; height: number } | undefined; // LEGACY
    controls?: ManifestEntity[] | undefined; // LEGACY
    jacks?: ManifestEntity[] | undefined; // LEGACY
    layout?: {
      width: number;
      height: number;
      zoom?: number | undefined;
      grid?: GridConfig | undefined;
      containers?: LayoutContainer[] | undefined; 
      activeTab?: string | undefined; 
      planes?: string[] | undefined;
      tabStyles?: Record<string, unknown> | undefined;
    } | undefined;
    tree?: OmegaNode | undefined;
    useUCA?: boolean | undefined;
    ucaDebug?: UcaDebugConfig | undefined;
    lighting?: LightingGovernance | undefined;
    faceplate?: FaceplateGovernance | undefined;
    hardware?: HardwareGovernance | undefined;
    palette?: Record<string, string> | undefined;
    sizes?: Record<string, number> | undefined;
    colors?: Record<string, string> | undefined;
    typography?: TypographyConfig | undefined;
    styles?: Record<string, StyleVariant[]> | undefined;
    attachments?: Attachment[] | undefined; // Added for VirtualRack compatibility
  };
  entities: ManifestEntity[];
  links?: OMEGA_Modulation[] | undefined;
  modulations?: OMEGA_Modulation[] | undefined;
  moduleTemplates?: Record<string, ModuleTemplate> | undefined;
  // Extra keys found in Partial usage
  controls?: ManifestEntity[] | undefined;
  jacks?: ManifestEntity[] | undefined;
  layout?: OMEGA_Manifest['ui']['layout'];
}

export interface ManifestMetadata {
  name: string;
  version: string;
  author?: string | undefined;
  description?: string | undefined;
  tags?: string[] | undefined;
  created?: string | undefined;
  modified?: string | undefined;
  rack?: { 
    width: number; 
    height: number; 
    hp?: number | undefined; 
    depth?: number | undefined;
    units?: '3U' | '1U' | string | undefined;
    power?: { 
      plus12?: number | undefined; 
      minus12?: number | undefined; 
      five?: number | undefined;
    } | undefined;
    height_mode?: 'compact' | 'expanded' | string | undefined;
  } | undefined;
  icon?: string | undefined;
  family?: string | undefined;
  status?: 'alpha' | 'beta' | 'stable' | 'industrial' | undefined;
}

export type LibraryAsset = OMEGA_Asset;
