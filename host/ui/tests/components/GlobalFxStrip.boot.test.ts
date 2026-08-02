/**
 * OMEGA Era 7.2.3 - GlobalFxStrip Boot Smoke Test
 *
 * Verifica el requisito de la serie globalFxParams: el GlobalFxStrip se
 * renderiza DESDE EL getState INICIAL (sin esperar el primer onStateUpdate).
 *
 * Contexto: el C++ (RpcParameterController::handleGetState) ahora emite el
 * patch shape completo vía VarSerialization::buildPatchWireVar — el mismo que
 * onStateUpdate — incluyendo globalFxParams keyed por id-string.
 *
 * Ruta ejercitada (la MISMA que el host real):
 *   injectEvent('state', payload)  →  FakeHostBridge  →  window.handleOmegaMessage
 *   →  OmegaRPC (normaliza y despacha CustomEvent 'omega:state')
 *   →  RuntimeEventHub  →  runtimeStore.reduceEvent → applyState (Era 7)
 *   →  subscribe()  →  GlobalFxStrip.syncFromStore()  →  sliders actualizados
 *
 * El primer 'state' equivale a la respuesta de getState del host; el segundo
 * test usa 'onStateUpdate' (el push posterior).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FakeHostBridge } from '../FakeHostBridge.js';

let host: FakeHostBridge;

// Patch con globalFxParams (shape de buildPatchWireVar, keyed por id-string)
const PATCH_WITH_FX = {
    name: 'Boot Patch',
    author: 'smoke',
    masterGainDb: 0,
    modules: [],
    patchbayMatrix: [],
    globalFxParams: {
        '200': 0.75, // Mix
        '201': 0.25, // Feedback
        '202': 0.5,  // Time
        '203': 0.1,  // Speed
        '204': 0.9,  // Intensity
    },
};

beforeAll(async () => {
    // jsdom polyfills usados por el bundle (VisualizerEngine / rAF)
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    (window as any).cancelAnimationFrame = (id: number) => window.clearTimeout(id);

    // Contenedor del strip (co-locado con index.html L188)
    const container = document.createElement('div');
    container.id = 'global-fx-strip';
    document.body.appendChild(container);

    // Bridge del host (simula el C++: __JUCE__.backend.emitEvent)
    host = new FakeHostBridge();
    (window as any).rpcCommandDispatcher = host as unknown as { dispatch: unknown };

    // CRÍTICO: importar el bundle REAL (artefacto esbuild). Su init de
    // singletons corre a nivel de módulo y ancla runtimeStore/GlobalFxStrip
    // en window — sin este import, window.runtimeStore sería undefined.
    await import('../../bundle.js');

    // Guards post-import: el IIFE del bundle debe haber anclado stores y
    // constructores (si fallan, el diagnóstico es inmediato y claro).
    expect((window as any).runtimeStore).toBeDefined();
    expect((window as any).GlobalFxStrip).toBeDefined();
    expect(typeof (window as any).GlobalFxStrip).toBe('function');
    // El hub es la única pieza que rutearía omega:state → store; si no está
    // anclado, la inyección por el bridge se pierde silenciosamente.
    expect((window as any).RuntimeEventHub).toBeDefined();
    expect(typeof (window as any).handleOmegaMessage).toBe('function');

    // Conecta el puente: cualquier mensaje del "C++" entra por handleOmegaMessage
    host.setCallback((window as any).handleOmegaMessage);

    // Hub de eventos (lo inicializa DOMContentLoaded en el host real; en jsdom
    // no se dispara, así que lo activamos explícitamente para rutear omega:state).
    (window as any).RuntimeEventHub?.init?.();
});

afterAll(() => {
    const container = document.getElementById('global-fx-strip');
    if (container) container.remove();
});

describe('GlobalFxStrip boot desde getState inicial (bundle real)', () => {
    it('renderiza los 5 sliders FX desde el primer state (getState) con sus valores', () => {
        const GlobalFxStripCtor = (window as any).GlobalFxStrip;
        const strip = new GlobalFxStripCtor();
        strip.init();

        // --- Simula la respuesta del getState inicial del host ---
        // (RpcParameterController::handleGetState → buildPatchWireVar → 'state')
        host.injectEvent('state', { schemaVersion: '7.0', patch: PATCH_WITH_FX });

        // El sync es síncrono (store.notify → subscribe → syncFromStore)
        const sliders = document.querySelectorAll<HTMLInputElement>('.global-fx-slider');
        expect(sliders.length).toBe(5);
        expect(document.querySelector('.global-fx-title')?.textContent).toBe('GLOBAL FX');

        // Valores sincronizados DESDE EL PRIMER ESTADO (no desde un push posterior)
        const expected: Record<string, number> = { '200': 0.75, '201': 0.25, '202': 0.5, '203': 0.1, '204': 0.9 };
        sliders.forEach((slider) => {
            const id = slider.dataset.fxId || '';
            expect(slider.value).toBe(String(expected[id]));
        });
        expect(document.querySelector('.global-fx-value[data-fx-id="200"]')?.textContent).toBe('75%');

        strip.destroy();
    });

    it('sobrevive un onStateUpdate posterior sin globalFxParams (no depende del push)', () => {
        const GlobalFxStripCtor = (window as any).GlobalFxStrip;
        const strip = new GlobalFxStripCtor();
        strip.init();

        // Aislamiento: resetear el store (el test 1 lo dejó con FX aplicados)
        host.injectEvent('state', {
            schemaVersion: '7.0',
            patch: { name: 'Reset', author: 'smoke', masterGainDb: 0, modules: [], patchbayMatrix: [], globalFxParams: {} },
        });

        // El primer state no trae globalFxParams (slot vacío) → strip a 0
        host.injectEvent('state', {
            schemaVersion: '7.0',
            patch: { name: 'Empty', author: 'smoke', masterGainDb: 0, modules: [], patchbayMatrix: [], globalFxParams: {} },
        });

        expect(document.querySelectorAll('.global-fx-slider').length).toBe(5);
        const mixSlider = document.querySelector<HTMLInputElement>('.global-fx-slider[data-fx-id="200"]');
        expect(mixSlider?.value).toBe('0');

        // Push posterior con FX → valores actualizados (ruta onStateUpdate)
        host.injectEvent('onStateUpdate', { schemaVersion: '7.0', patch: PATCH_WITH_FX });
        expect(document.querySelector<HTMLInputElement>('.global-fx-slider[data-fx-id="200"]')?.value).toBe('0.75');

        strip.destroy();
    });
});
