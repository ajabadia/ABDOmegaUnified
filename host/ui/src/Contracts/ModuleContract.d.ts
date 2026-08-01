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
    offset?: number;
    offsetX?: number;
    offsetY?: number;
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
        w: string | number;
        h: number;
    };
    variant: 'default' | 'header' | 'section' | 'panel' | 'inset' | 'minimal' | string;
    tab?: string;
    zIndex?: number;
    labelPosition?: 'top' | 'bottom' | 'inside-top' | 'inside-bottom' | string;
}
export interface Era7Presentation {
    tab?: string;
    container?: string;
    group?: string;
    component?: string;
    variant?: string;
    attachments?: Era7Attachment[];
}
export interface LayoutItem {
    id?: string;
    bind?: string;
    paramId?: string;
    source?: string;
    portId?: string;
    label?: string;
    pos?: Era7Pos;
    presentation?: Era7Presentation;
    variant?: string;
    look?: string;
    row?: number;
    col?: number;
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
    role: 'control' | 'telemetry' | 'stream' | 'mod_target';
    roles: string[];
    range?: {
        min: number;
        max: number;
        default: number;
        step?: number;
    };
    options?: {
        label: string;
        value: number;
    }[];
    unit?: string;
    front?: boolean;
    back?: boolean;
}
export interface ValidationIssue {
    severity: 'ok' | 'degraded' | 'invalid';
    code: string;
    scope: string;
    message: string;
    metadata?: any;
}
export interface ComplianceReport {
    status: 'ok' | 'degraded' | 'invalid';
    issues: ValidationIssue[];
}
export interface ModuleDescriptor {
    id: string;
    metadata?: Era7Metadata;
    ui?: Era7UI;
    compliance?: ComplianceReport;
    name?: string;
    instanceId?: string;
    version?: string;
    hp?: number;
    panelClass?: string;
    layout?: any;
    registry?: RegistryEntity[];
    items?: LayoutItem[];
    theme?: string;
}
export interface ModuleOptions {
    label?: string;
    componentId: string;
    instanceId: string | number;
    manifest: ModuleDescriptor;
    layer?: string;
    group?: string;
    typeId?: number;
    params?: Record<number, number>;
}
export interface IModuleInstance {
    init?(): Promise<void>;
    onStateUpdate?(state: any): void;
    destroy?(): void;
}
export type ModuleConstructor = new (el: HTMLElement, content: HTMLElement, options: any) => IModuleInstance;
//# sourceMappingURL=ModuleContract.d.ts.map