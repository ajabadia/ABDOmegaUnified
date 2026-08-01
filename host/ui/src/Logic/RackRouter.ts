/**
 * OMEGA Era 7.2.3 - Rack Router
 * Pure structural pipeline: fingerprinting, rack routing (upper/lower), deduplication.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import type { PatchDocumentV7 } from '../Types/omega_types.js';

export interface RackRoutingResult {
    modules: any[];
    fingerprint: string;
    isRackEmpty: boolean;
    isStable: boolean;
}

/**
 * Computes a fingerprint for a list of patch modules.
 * Used to detect structural changes and skip unnecessary re-renders.
 */
export function computeFingerprint(patchModules: any[]): string {
    return patchModules
        .map((m: any) => `${m.instanceId}:${m.componentId}:${m.theme || ''}`)
        .join('|');
}

/**
 * Determines whether a module should be routed to the upper (aux) or lower (main) rack.
 * Priority: Manifest (slot/height_mode) > Patch Metadata.
 */
export function resolveRackTarget(
    componentId: string,
    mod: any,
    manifest: any,
): { isUpper: boolean; rackType: 'aux' | 'main' } {
    const manifestRack = manifest?.rack?.slot || manifest?.rack || '';
    let rackValue = (manifestRack || mod.rack || 'lower').toString().toLowerCase();
    const isCompact =
        manifest?.height_mode === 'compact' ||
        manifest?.metadata?.rack?.height_mode === 'compact' ||
        manifest?.rack?.height_mode === 'compact';

    const isUpper = rackValue === 'upper' || rackValue === 'top' || isCompact;
    return { isUpper, rackType: isUpper ? 'aux' : 'main' };
}

/**
 * Gets the DOM element for a rack by type.
 */
export function getRackElement(rackType: 'aux' | 'main'): HTMLElement | null {
    return document.getElementById(rackType === 'aux' ? 'upper-rack' : 'lower-rack');
}

/**
 * Pure structural pipeline: parses state, computes fingerprint, detects stability.
 */
export function processRackUpdate(
    state: any,
    lastFingerprint: string,
): RackRoutingResult | null {
    const safeState = state || {};
    const patch = safeState.patch as PatchDocumentV7;

    if (!patch) {
        OmegaLog.info('MANAGER', 'No Era 7 patch found in state. Skipping structural update.');
        return null;
    }

    const patchModules = patch.modules || [];
    const fingerprint = computeFingerprint(patchModules);
    const isRackEmpty = patchModules.length === 0;

    if (fingerprint === lastFingerprint && !isRackEmpty) {
        OmegaLog.info('MANAGER', 'Structure stable (Fingerprint match). Skipping full re-render.');
        return { modules: patchModules, fingerprint, isRackEmpty, isStable: true };
    }

    OmegaLog.info('MANAGER', `Structural change detected. Rebuilding racks... (Empty: ${isRackEmpty})`);

    return { modules: patchModules, fingerprint, isRackEmpty, isStable: false };
}