/**
 * OMEGA Era 7.2.3 - Module Manager (Orchestrator)
 * Coordinates subscription, structural pipeline, module instantiation and lifecycle.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import {
    processRackUpdate,
    resolveRackTarget,
} from './RackRouter.js';
import { instantiateModule, stepParameter, cleanupModules } from './ModuleInstantiator.js';

export class ModuleManager {
    private activeModules: Map<string, any> = new Map();
    private lastState: any = null;

    private isRendering: boolean = false;
    private lastFingerprint: string = '';
    private pendingState: any = null;
    private renderGeneration: number = 0;

    constructor() {
        this.activeModules = new Map();

        console.log('%c[!!!] MODULE_MANAGER_V7_ACTIVE [Build 2026.05.03]', 'background: #00f2ff; color: #000; font-weight: bold; padding: 2px 5px;');
        OmegaLog.info('MANAGER', 'ModuleManager Constructor Initialized.');

        // Era 7: Reactive Subscription
        const store = (window as any).runtimeStore;
        if (store) {
            OmegaLog.info('MANAGER', 'Subscribing to RuntimeStore...');
            store.subscribe((type: any) => {
                OmegaLog.debug('MANAGER', `Store Event Received. Type: ${type}`);
                if (type & 1 /* Structure */) {
                    OmegaLog.info('MANAGER', 'Structural Change Detected -> updateRack()');
                    this.updateRack(store.getSnapshot());
                } else if (type & 2 /* Parameters */) {
                    this.activeModules.forEach((mod) => {
                        if (mod.onStateUpdate) mod.onStateUpdate(store.getSnapshot());
                    });
                }
            });
        } else {
            OmegaLog.error('MANAGER', 'CRITICAL: RuntimeStore not found in window during initialization!');
        }
    }

    async updateRack(state: any): Promise<void> {
        OmegaLog.info('MANAGER', 'updateRack entry point');
        if (this.isRendering) {
            OmegaLog.info('MANAGER', 'Render in progress. Queuing next update...');
            this.pendingState = state;
            return;
        }

        this.isRendering = true;
        const currentGeneration = ++this.renderGeneration;
        this.pendingState = null;

        try {
            this.lastState = state || {};

            // --- [Era 7] Pure Structural Pipeline ---
            const result = processRackUpdate(state, this.lastFingerprint);

            if (!result) {
                this.isRendering = false;
                return;
            }

            const { modules, fingerprint, isRackEmpty, isStable } = result;
            this.lastFingerprint = fingerprint;

            if (isStable) {
                // Fingerprint matched: propagate state update only
                this.activeModules.forEach((mod) => {
                    if (mod.onStateUpdate) mod.onStateUpdate(state);
                });
                this.isRendering = false;
                return;
            }

            // --- Structural change: rebuild rack (preserve decor power-bus-container) ---
            const upper = document.getElementById('upper-rack');
            const lower = document.getElementById('lower-rack');

            if (upper) upper.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());
            if (lower) lower.querySelectorAll('.module, .aseptic-module-panel').forEach(el => el.remove());

            this.activeModules.clear();

            if (isRackEmpty) {
                OmegaLog.info('MANAGER', 'Rack is now officially empty.');
                this.isRendering = false;
                return;
            }

            // [Era 7] Pure Rendering Path
            const newActiveIds = new Set<string>();
            OmegaLog.info('MANAGER', `Executing Era 7 Rendering Pipeline (${modules.length} modules)`);

            for (const mod of modules) {
                const componentId = mod.componentId || 'unknown';
                const instId = `v7_${mod.instanceId}`;
                newActiveIds.add(instId);

                if (!this.activeModules.has(instId)) {
                    const manifest = (window as any).schemaStore?.getSchema(componentId);

                    // Era 7 Industrial Routing
                    const { isUpper, rackType } = resolveRackTarget(componentId, mod, manifest);
                    const targetRack = isUpper
                        ? document.getElementById('upper-rack')
                        : document.getElementById('lower-rack');

                    console.log(
                        `%c[!!!] ROUTING DEBUG: mod=${instId} (${componentId}) | isUpper=${isUpper} | targetFound=${!!targetRack}`,
                        'color: #00f2ff; font-weight: bold;',
                    );

                    if (isUpper && !document.getElementById('upper-rack')) {
                        console.error('%c[!!!] CRITICAL: upper-rack element not found in DOM!', 'color: #ff0000; font-weight: bold;');
                    }

                    const className = manifest?.ui_class || 'ModuleRenderer';

                    if (currentGeneration !== this.renderGeneration) return;

                    await instantiateModule(instId, className, targetRack, {
                        label: mod.label || componentId.toUpperCase(),
                        componentId,
                        instanceId: mod.instanceId,
                        typeId: mod.typeId,
                        params: mod.parameters || mod.params || {},
                        manifest: manifest || {
                            id: componentId,
                            name: componentId,
                            ui: { dimensions: { width: 60, height: 420 }, controls: [], jacks: [], skin: 'industrial' },
                            registry: [],
                        },
                        layer: rackType,
                    }, this.lastState, this.activeModules);
                } else {
                    // Update existing module parameters
                    const module = this.activeModules.get(instId);
                    if (module && module.onStateUpdate) {
                        module.onStateUpdate((window as any).runtimeStore?.getSnapshot());
                    }
                }
            }

            // Cleanup removed modules
            cleanupModules(newActiveIds, this.activeModules);
            this.isRendering = false;
        } catch (e: any) {
            OmegaLog.error('MANAGER', 'Error during rack update:', e);
            if (e && e.stack) OmegaLog.error('MANAGER', 'Stack trace:', e.stack);
        } finally {
            this.isRendering = false;
            if (this.pendingState) {
                const next = this.pendingState;
                this.pendingState = null;
                this.updateRack(next);
            }
        }
    }

    /**
     * Increments or decrements a parameter value by a single step.
     * Delegated to ModuleInstantiator.
     */
    public stepParameter(id: string, step: number): void {
        stepParameter(id, step);
    }
}

export default ModuleManager;