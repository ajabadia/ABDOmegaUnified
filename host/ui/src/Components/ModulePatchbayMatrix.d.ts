export declare class ModulePatchbayMatrix {
    private el;
    private root;
    private options;
    private state;
    private sources;
    private targets;
    private viewMode;
    private manualChangeTimer;
    private selectedSlot;
    private maxSlots;
    private structureBuilt;
    constructor(options?: any);
    private ensureElements;
    private syncMaxSlots;
    private loadMetadata;
    private buildMetadataFromInventory;
    toggleWorkspace(open: boolean): void;
    private isWorkspaceOpen;
    onStateUpdate(state: any): void;
    private triggerActivity;
    private renderWorkspace;
    private setupHeaderToggles;
    private renderStructure;
    private getSlotSkeleton;
    private syncSlotsFromState;
    private getAmountColor;
    private addModulation;
    private renderInspector;
    private getNameForId;
    private normalizeList;
    private generateOptions;
    private attachGridListeners;
    private attachInspectorListeners;
    private sendUpdate;
}
//# sourceMappingURL=ModulePatchbayMatrix.d.ts.map