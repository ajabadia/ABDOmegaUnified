/**
 * OMEGA Era 7.2.3 - Global FX Strip
 * Renders the patch's global FX params (patch.globalFxParams, keyed by
 * ParamId id-string -> value) as a compact strip of sliders.
 *
 * Wire format: OmegaUiBridge::forceRepaint() pushes globalFxParams via
 * serializeParamsToVar (DynamicObject keyed by juce::String((int)p.id)).
 * This component consumes that same shape directly from the RuntimeStore.
 */
import { OmegaLog } from '../RPC/omega_log.js';

/** Known global FX ParamIds (mirrors C++ Core::Model::ParamId, FX/Global range). */
export const GLOBAL_FX_PARAM_META: ReadonlyArray<{ id: string; label: string; max: number }> = [
    { id: '200', label: 'MIX', max: 1 },
    { id: '201', label: 'FEEDBACK', max: 1 },
    { id: '202', label: 'TIME', max: 1 },
    { id: '203', label: 'SPEED', max: 1 },
    { id: '204', label: 'INTENSITY', max: 1 },
];

/**
 * Pure: reads globalFxParams from a patch document (or store snapshot).
 * Tolerates absent/malformed values (the field is optional).
 */
export function readGlobalFxParams(patch: unknown): Record<string, number> {
    if (!patch || typeof patch !== 'object') return {};
    const fx = (patch as { globalFxParams?: unknown }).globalFxParams;
    if (!fx || typeof fx !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [key, val] of Object.entries(fx as Record<string, unknown>)) {
        // Estricto: solo números (no coaccionar booleanos/strings numéricos).
        if (typeof val === 'number' && Number.isFinite(val)) out[key] = val;
    }
    return out;
}

/**
 * Pure: formats a normalized 0..1 value as a percentage label.
 */
export function formatFxValue(value: number): string {
    return `${Math.round((value || 0) * 100)}%`;
}

export class GlobalFxStrip {
    private el: HTMLElement | null = null;
    private unsubscribe: (() => void) | null = null;
    private lastRendered: Record<string, number> = {};

    constructor() {}

    init(): void {
        this.el = document.getElementById('global-fx-strip');
        if (!this.el) {
            OmegaLog.warn('GLOBALFX', '#global-fx-strip container not found; strip disabled.');
            return;
        }

        const store = (window as any).runtimeStore;
        if (store?.subscribe) {
            this.unsubscribe = store.subscribe(() => this.syncFromStore());
        }

        this.render();
        this.syncFromStore();
    }

    destroy(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.el = null;
    }

    render(): void {
        if (!this.el) return;
        const rows = GLOBAL_FX_PARAM_META.map(
            (meta) => `
            <div class="global-fx-param" data-fx-id="${meta.id}">
                <span class="global-fx-label">${meta.label}</span>
                <input type="range" class="global-fx-slider" data-fx-id="${meta.id}"
                       min="0" max="${meta.max}" step="0.01" value="0" />
                <span class="global-fx-value" data-fx-id="${meta.id}">0%</span>
            </div>`,
        ).join('');

        this.el.innerHTML = `
            <div class="global-fx-strip">
                <div class="global-fx-title">GLOBAL FX</div>
                ${rows}
            </div>`;

        // Wire sliders: on input, dispatch setParameter to the bridge.
        this.el.querySelectorAll<HTMLInputElement>('.global-fx-slider').forEach((slider) => {
            slider.addEventListener('input', () => {
                const id = slider.dataset.fxId || '';
                const value = Number(slider.value) || 0;
                const valLabel = this.el?.querySelector(`.global-fx-value[data-fx-id="${id}"]`);
                if (valLabel) valLabel.textContent = formatFxValue(value);

                (window as any).rpcCommandDispatcher?.dispatch({
                    type: 'setParameter',
                    payload: { target: `globalFx.${id}`, value },
                });
            });
        });
    }

    syncFromStore(): void {
        if (!this.el) return;
        const store = (window as any).runtimeStore;
        const snapshot = store?.getSnapshot?.();
        const params = readGlobalFxParams(snapshot?.patch);

        // Skip redundant DOM writes when nothing changed.
        const unchanged = GLOBAL_FX_PARAM_META.every(
            (meta) => (this.lastRendered[meta.id] ?? 0) === (params[meta.id] ?? 0),
        );
        if (unchanged && Object.keys(this.lastRendered).length > 0) return;

        this.lastRendered = { ...params };

        GLOBAL_FX_PARAM_META.forEach((meta) => {
            const value = params[meta.id] ?? 0;
            const slider = this.el?.querySelector<HTMLInputElement>(
                `.global-fx-slider[data-fx-id="${meta.id}"]`,
            );
            const valLabel = this.el?.querySelector(`.global-fx-value[data-fx-id="${meta.id}"]`);
            if (slider) slider.value = String(value);
            if (valLabel) valLabel.textContent = formatFxValue(value);
        });

        OmegaLog.debug('GLOBALFX', `Synced global FX params:`, params);
    }
}

export default GlobalFxStrip;
