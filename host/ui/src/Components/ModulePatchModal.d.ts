/**
 * OMEGA Unified Module Patch Modal
 * Standardized for Era 6 Aseptic Contract Runtime.
 */
export declare class ModulePatchModal {
    private el;
    private tabsContainer;
    private viewport;
    private currentInstanceId;
    private activeTab;
    private currentSchema;
    private patchbayMatrix;
    private maxSlots;
    constructor();
    private init;
    open(instanceId: string, schema: any): Promise<void>;
    private normalizeSchema;
    close(): void;
    private renderTabs;
    private getTabsFromSchema;
    private switchTab;
    private renderRackTab;
    private setModuleTheme;
    private moveModule;
    private renderTabContent;
    private setupListeners;
    private renderParameterRow;
    /**
     * ERA 6 STANDARD: Unified Control Cell Generator
     */
    private buildControlCell;
    /**
     * ERA 6: Real-time UI refresh from Aseptic Store
     */
    private updateRealtimeUI;
    private renderError;
}
//# sourceMappingURL=ModulePatchModal.d.ts.map