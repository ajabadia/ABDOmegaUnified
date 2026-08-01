/**
 * OMEGA Era 7.2.3 - Module Instantiator
 * Handles DOM creation, factory instantiation, parameter stepping, and cleanup.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import { ModuleRegistry } from './ModuleRegistry.js';
import { buildModuleHeader } from './ModuleHeaderBuilder.js';
import type { ModuleOptions } from '../Contracts/ModuleContract.js';

/**
 * Creates the DOM structure for a module (wrapper div + header + content).
 */
export function createModuleContainer(
    id: string,
    type: string,
    panelClass: string,
    manifest?: any,
): { el: HTMLElement; content: HTMLElement } {
    const el = document.createElement('div');
    el.id = `mod-${id}`;
    el.className = `module module-${type} ${panelClass}`;

    const header = buildModuleHeader(id, manifest);
    el.appendChild(header);

    const content = document.createElement('div');
    content.className = 'module-content';
    el.appendChild(content);

    return { el, content };
}

/**
 * Instantiates a module from the registry and appends it to a container.
 * Updates the activeModules map and calls init() + onStateUpdate().
 * Returns the instance, or null on failure.
 */
export async function instantiateModule(
    id: string,
    className: string,
    container: HTMLElement | null,
    options: ModuleOptions,
    lastState: any,
    activeModules: Map<string, any>,
): Promise<any | null> {
    if (!container) return null;

    const panelClass = options.manifest.panelClass || '';
    const { el, content } = createModuleContainer(id, options.layer || 'main', panelClass, options.manifest);
    container.appendChild(el);

    const Factory = ModuleRegistry.getConstructor(className);
    if (!Factory) {
        console.error(`[ModuleManager] Module class not found in registry: ${className}`);
        return null;
    }

    // Era 7: ModuleRenderer expects (content, options), others expect (el, content, options)
    const instance = Factory.length <= 2
        ? new Factory(content, options.manifest)
        : new Factory(el, content, options);

    activeModules.set(id, instance);

    if (instance.init) await instance.init();
    if (instance.onStateUpdate && lastState) instance.onStateUpdate(lastState);

    return instance;
}

/**
 * Increments or decrements a parameter value by a single step.
 * Used by shared stateless components like the Display primitive.
 */
export function stepParameter(id: string, step: number): void {
    const win = window as any;
    if (!win.runtimeStore || !win.rpcCommandDispatcher) return;

    const snapshot = win.runtimeStore.getSnapshot();
    const currentValue = snapshot.parameters?.[id] || 0;
    const delta = step * 0.01;
    const nextValue = Math.max(0, Math.min(1, currentValue + delta));

    OmegaLog.debug('MANAGER', `Stepping parameter ${id}: ${currentValue} -> ${nextValue}`);

    win.rpcCommandDispatcher.dispatch({
        type: 'setParameter',
        payload: { id, value: nextValue },
    });
}

/**
 * Removes DOM elements and disposes instances for modules not in the active set.
 */
export function cleanupModules(
    activeIds: Set<string>,
    activeModules: Map<string, any>,
): void {
    activeModules.forEach((mod, id) => {
        if (!activeIds.has(id)) {
            const el = document.getElementById(`mod-${id}`);
            if (el) el.remove();
            if (mod.dispose) mod.dispose();
            activeModules.delete(id);
        }
    });
}