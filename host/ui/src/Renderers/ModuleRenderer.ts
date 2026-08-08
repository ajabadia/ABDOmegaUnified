/**
 * OMEGA Era 7.2.3 - Module Renderer (Orchestrator)
 * Composes rendering from focused modules: templates, formatters, telemetry,
 * visualizers, control UI updates and font injection.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import { type ModuleDescriptor } from '../Contracts/ModuleContract.js';
import { ControlBinder } from '../Logic/ControlBinder.js';
import { ManifestRenderer } from './ManifestRenderer.js';
import { getRegistryEntity } from './ValueFormatters.js';
import { normalizeCatalogManifest } from '../Catalog/AcemmCatalog.js';
import { subscribeToTelemetry, updateTelemetryUI } from './TelemetrySync.js';
import { updateControlUI } from './ControlUIUpdater.js';
import { injectResources } from './FontInjector.js';
import { VisualizerEngine } from './Visualizers.js';
import { dismissLoaderOverlay } from '../Util/moduleLoader.js';

export class ModuleRenderer {
    private content: HTMLElement;
    private descriptor: ModuleDescriptor;
    private values: Record<string, number> = {};
    private isInitialized: boolean = false;
    private activeTab: string = 'MAIN';
    private binder: ControlBinder;
    private visualizers: VisualizerEngine;

    constructor(content: HTMLElement, options: any) {
        this.content = content;
        // Defensive: bare schemas coming straight from schemaStore (ModuleManager
        // path) carry no `ui` block. Normalize (idempotent) so buildPanelHTML and
        // ManifestRenderer receive controls/jacks + positions. No-op for
        // already-normalized manifests (ui.tree / ui.controls / ui.jacks / ui.items).
        this.descriptor = normalizeCatalogManifest(options.manifest || options);
        this.binder = new ControlBinder(this, this.values);
        this.visualizers = new VisualizerEngine();

        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        const firstWithTab = allItems.find(i => i.presentation?.tab);
        if (firstWithTab && firstWithTab.presentation?.tab) {
            this.activeTab = firstWithTab.presentation.tab;
        }

        OmegaLog.info('RENDERER', `ModuleRenderer initialized for: ${this.descriptor.id}`);
    }

    async init(): Promise<void> {
        injectResources(this.descriptor);
        this.render();
        this.visualizers.init(this.content);
        this.isInitialized = true;
        subscribeToTelemetry(this.descriptor);
        this.syncAllFromStore();
        this.visualizers.start();
    }

    render(): void {
        this.content.innerHTML = ManifestRenderer.renderModulePanel(this.descriptor);

        try {
            this.bind();
            this.syncAllFromStore();
        } finally {
            this.dismissLoader();
        }
    }

    private dismissLoader(): void {
        dismissLoaderOverlay(this.content);
    }

    public getRegistryEntity(id: string): any {
        return getRegistryEntity(id);
    }

    private bind(): void {
        // 1. Tab Navigation (Internal to Renderer)
        this.content.querySelectorAll('.tab-btn').forEach((btn: Element) => {
            btn.addEventListener('click', (e: Event) => {
                this.activeTab = (e.target as HTMLElement).dataset.tab || 'MAIN';
                this.render();
            });
        });

        // 2. Control Interactions (Delegated to Binder)
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        this.binder.bindContainer(this.content, allItems);
    }

    setParam(id: string, value: number): void {
        this.values[id] = value;
        const paramId = `${this.descriptor.id}.${id}`;
        window.rpcCommandDispatcher.dispatch({
            type: 'setParameter',
            payload: { target: paramId, value: value }
        });
        this.updateControlUI(id, value);
    }

    updateControlUI(id: string, value: number): void {
        updateControlUI(this.content, this.descriptor, id, value);
    }

    private syncAllFromStore(): void {
        if (!this.isInitialized) return;
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        allItems.forEach((item: any) => {
            const id = item.bind || item.id || item.source;
            if (id) {
                const globalId = `${this.descriptor.id}.${id}`;
                const store = (window as any).runtimeStore?.getSnapshot();
                if (!store || !store.parameters) return;

                const val = store.parameters[globalId];
                const tVal = store.telemetry ? store.telemetry[globalId] : undefined;

                if (val !== undefined) {
                    this.values[id] = val;
                    this.updateControlUI(id, val);
                }
                if (tVal !== undefined) {
                    updateTelemetryUI(this.content, id, tVal.v || 0);
                }
            }
        });
    }

    public onStateUpdate(state: any): void {
        this.syncAllFromStore();
    }

    public destroy(): void {
        this.visualizers.destroy();
    }
}

export default ModuleRenderer;
