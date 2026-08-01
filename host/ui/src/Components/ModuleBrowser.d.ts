/**
 * OMEGA Module Browser (Integrated Registry)
 * Handles module discovery, categorization, and instantiation.
 */
export declare class ModuleBrowser {
    private el;
    private grid;
    private categories;
    private detail;
    private searchInput;
    private catalog;
    private currentFilter;
    private currentSearch;
    private selectedModule;
    constructor();
    private ensureElements;
    open(): Promise<void>;
    private fetchCatalog;
    private render;
    private renderCategories;
    private renderGrid;
    private renderDetail;
    private getIconForModule;
    private setupListeners;
    private addModule;
}
//# sourceMappingURL=ModuleBrowser.d.ts.map