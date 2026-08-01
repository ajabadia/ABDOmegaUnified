/**
 * OMEGA Era 7 Industrial - Aseptic UI Contracts
 * Authoritative interfaces for module rendering and management.
 */

export interface Era7Pos {
    x: number;
    y: number;
}

export interface Era7Attachment {
    type: 'label' | 'led' | 'display' | 'stepper';
    position: 'top' | 'bottom' | 'left' | 'right';
    bind?: string;
    text?: string;
    variant?: string;
    offset?: number;      // Legacy fallback
    offsetX?: number;     // Era 7.1 Dual Precision
    offsetY?: number;     // Era 7.1 Dual Precision
    fontSize?: number | undefined;    // Era 7.2.3 Module Override
    fontFamily?: string | undefined;  // Era 7.2.3 Module Override
    format?: {
        decimals?: number;
        prefix?: string;
        suffix?: string;
    };
}

export interface LayoutContainer {
    id: string;
    label: string;
    pos: Era7Pos;
    size: {
        w: string | number; // 'full', '1/2', etc. or px
        h: number;
    };
    variant: 'default' | 'header' | 'section' | 'panel' | 'inset' | 'minimal' | string;
    tab?: string; // Era 7.2 Architectural Plane
    zIndex?: number;
    labelPosition?: 'top' | 'bottom' | 'inside-top' | 'inside-bottom' | string;
    labelFontSize?: number | undefined; // Era 7.2.3 Module Override
    labelFontFamily?: string | undefined; // Era 7.2.3 Module Override
}

export interface Era7Presentation {
    tab?: string;
    container?: string;  // Era 7.2
    group?: string;      // Legacy Era 7.1
    component?: string;
    variant?: string;
    attachments?: Era7Attachment[];
}

export interface LayoutItem {
    id?: string;         // Legacy Era 6
    bind?: string;       // Era 7 Strict
    paramId?: string;
    source?: string;
    portId?: string;
    label?: string;
    pos?: Era7Pos;       // Era 7 Absolute
    presentation?: Era7Presentation;
    variant?: string;    // Legacy
    look?: string;       // Legacy
    row?: number;        // Legacy
    col?: number;        // Legacy
}

export interface Era7UI {
    skin?: string;
    dimensions?: {
        width: number;
        height: number;
    };
    faceplate?: string; // Asset ID for background texture
    lighting?: {
        shadowAngle: number;
        shadowColor: string;
        distance: number;
        blur: number;
    };
    colors?: { [key: string]: string }; // Baked DNA
    typography?: { [key: string]: string }; // Baked DNA
    layout?: {
        containers: LayoutContainer[];
        gridSnap?: number;
    };
    resources?: {
        fonts?: { name: string, file: string }[];
    };
    controls?: LayoutItem[];
    jacks?: LayoutItem[];
}

export interface Era7Metadata {
    name: string;
    family: string;
    description?: string;
    tags?: string[];
    rack?: {
        hp: number;
        slot?: string;
    };
}

export interface RegistryEntity {
    id: string;
    label: string;
    type: string;
    role: 'control' | 'telemetry' | 'stream' | 'mod_target'; // Era 7.1 Mandatory Role
    roles: string[]; // Legacy multi-role support
    range?: {
        min: number;
        max: number;
        default: number;
        step?: number;
    };
    options?: { label: string, value: number }[];
    unit?: string;
    front?: boolean;
    back?: boolean;
}

export interface ValidationIssue {
    severity: 'ok' | 'degraded' | 'invalid';
    code: string;
    scope: string;
    message: string;
    metadata?: any; // Detailed spatial data (x, y, rackW, etc.)
}

export interface ComplianceReport {
    status: 'ok' | 'degraded' | 'invalid';
    issues: ValidationIssue[];
}

export interface ModuleDescriptor {
    id: string;          // Component ID (e.g., 'osc_va')
    metadata?: Era7Metadata;
    ui?: Era7UI;
    compliance?: ComplianceReport; // Era 7.2.3 Detailed Audit
    
    // Compatibility Layer
    name?: string;       
    instanceId?: string; 
    version?: string;
    hp?: number;
    panelClass?: string;
    layout?: any;
    registry?: RegistryEntity[];
    items?: LayoutItem[]; // Legacy
    theme?: string;
}

export interface ModuleOptions {
    label?: string;
    componentId: string;
    instanceId: string | number;
    manifest: ModuleDescriptor;
    layer?: string;
    group?: string;
    
    // Era 7 Native
    typeId?: number;
    params?: Record<number, number>;
}

export interface IModuleInstance {
    init?(): Promise<void>;
    onStateUpdate?(state: any): void;
    destroy?(): void;
}

export type ModuleConstructor = new (el: HTMLElement, content: HTMLElement, options: any) => IModuleInstance;
