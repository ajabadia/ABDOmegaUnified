/**
 * PresetBrowser.ts - OMEGA Advanced Preset Management
 * Handles the 3-column browser (Category > Library > Patch)
 * Era 6 - Managed Dispatch Edition
 */
export interface Patch {
    name: string;
    author?: string;
    category?: string;
    tags?: string;
    notes?: string;
    favorite?: boolean;
    date?: string;
    originGroup?: number;
    originBank?: number;
    originPatch?: number;
}
export interface Library {
    name: string;
    category: string;
    patches: Patch[];
}
export interface BrowserData {
    libraries: Library[];
    categories?: string[];
}
export declare class OMEGA_PresetBrowser {
    private data;
    private selectedLibIdx;
    private selectedPresetIdx;
    private currentCategory;
    private searchQuery;
    constructor();
    init(): Promise<void>;
    private setupListeners;
    refresh(): Promise<void>;
    render(): void;
    private renderCategories;
    private selectCategory;
    private renderLibraries;
    private selectLib;
    private renderPresets;
    private selectPreset;
    private updateInfoPane;
    private showSaveAsModal;
}
export declare const PresetBrowser: OMEGA_PresetBrowser;
//# sourceMappingURL=PresetBrowser.d.ts.map