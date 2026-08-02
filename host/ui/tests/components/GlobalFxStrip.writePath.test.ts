/**
 * OMEGA Era 7.2.3 - GlobalFxStrip Write-Path E2E Test (RpcCommandDispatcher real)
 *
 * Verifica el write-path completo de los sliders del GlobalFxStrip usando el
 * RpcCommandDispatcher REAL del bundle (no un stub): mover un slider debe
 * emitir dispatch(setParameter) con el target `globalFx.<id>` correcto
 * (formato wire del C++ RpcParameterController handleSetParameter), y la
 * llamada se captura espiando `omegaRPC.send` — el método que el dispatcher
 * invoca DESPUÉS de su validación interna de `setParameter`.
 *
 * Ruta ejercitada (la MISMA que el host real):
 *   input event en .global-fx-slider  →  GlobalFxStrip (L101)
 *   →  window.rpcCommandDispatcher.dispatch({ type: 'setParameter',
 *       payload: { target: `globalFx.${id}`, value } })   [dispatcher REAL]
 *   →  handleCoreCommand valida el payload (setParameter sin target → throw,
 *      nunca llega a send)
 *   →  omegaRPC.send(type, payload)  [espiado con vi.spyOn; la implementación
 *      real corre]
 *   →  _waitForBackend() resuelve (FakeHostBridge monta __JUCE__.backend)
 *   →  emitEvent('omega_rpc_query', msg)  →  FakeHostBridge.handleNativeCall
 *   →  PARAMACK  →  handleOmegaMessage resuelve el pending request
 *
 * GOTCHAS:
 * 1. El bundle ancla win.rpcCommandDispatcher y win.omegaRPC a nivel de módulo
 *    (index.ts L52-53) y el dispatcher captura `this.rpc = window.omegaRPC` en
 *    su constructor. El spy se instala DESPUÉS del import espiando el método
 *    `send` del singleton omegaRPC (el dispatcher lo invoca vía this.rpc.send).
 * 2. La cadena es async (await _waitForBackend), así que las aserciones van
 *    precedidas de flushAsync() para vaciar la cola de microtasks/macrotask.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FakeHostBridge } from '../FakeHostBridge.js';

let host: FakeHostBridge;
let sendSpy: ReturnType<typeof vi.spyOn>;

// Patch con globalFxParams (shape de buildPatchWireVar, keyed por id-string)
const PATCH_WITH_FX = {
    name: 'WritePath Patch',
    author: 'e2e',
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

    // CRÍTICO: importar el bundle REAL (artefacto esbuild). Su init de
    // singletons corre a nivel de módulo y ancla runtimeStore/GlobalFxStrip/
    // rpcCommandDispatcher/omegaRPC en window.
    await import('../../bundle.js');

    // Guards post-import (misma cadena que el boot test)
    expect((window as any).runtimeStore).toBeDefined();
    expect((window as any).GlobalFxStrip).toBeDefined();
    expect(typeof (window as any).GlobalFxStrip).toBe('function');
    expect((window as any).RuntimeEventHub).toBeDefined();
    expect(typeof (window as any).handleOmegaMessage).toBe('function');
    // El spy del write-path depende de __JUCE__.backend.emitEvent; si el bundle
    // algún día re-anclara __JUCE__, getLastCall() quedaría stale y los asserts
    // fallarían crípticamente — este guard lo hace autodiagnóstico.
    expect((window as any).__JUCE__?.backend?.emitEvent).toBeDefined();
    // El dispatcher REAL y el singleton omegaRPC deben estar anclados (no
    // sustituidos) — son la pieza bajo prueba de este refuerzo.
    expect((window as any).rpcCommandDispatcher).toBeDefined();
    expect(typeof (window as any).rpcCommandDispatcher?.dispatch).toBe('function');
    expect((window as any).omegaRPC).toBeDefined();
    expect(typeof (window as any).omegaRPC?.send).toBe('function');

    // Conecta el puente + hub (DOMContentLoaded no se dispara en jsdom)
    host.setCallback((window as any).handleOmegaMessage);
    (window as any).RuntimeEventHub?.init?.();

    // --- Espiar omegaRPC.send DESPUÉS del import ---
    // El dispatcher real capturó `this.rpc = window.omegaRPC` en su constructor;
    // vi.spyOn sobre el método del singleton mantiene la implementación real
    // (la cadena _waitForBackend → emitEvent → PARAMACK corre de verdad y
    // resuelve el pending request) y además registra las llamadas. Así la
    // validación interna de setParameter del dispatcher queda DENTRO de
    // cobertura: un payload inválido lanza antes de llegar a rpc.send.
    sendSpy = vi.spyOn((window as any).omegaRPC, 'send');
});

afterAll(() => {
    sendSpy?.mockRestore();
    const container = document.getElementById('global-fx-strip');
    if (container) container.remove();
});

/** Fuerza el input de usuario sobre un slider del strip (ruta real del listener). */
function fireSliderInput(fxId: string, value: number): void {
    const slider = document.querySelector<HTMLInputElement>(
        `.global-fx-slider[data-fx-id="${fxId}"]`,
    );
    expect(slider).not.toBeNull();
    slider!.value = String(value);
    slider!.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Flush de la cadena async del write-path: `dispatch` → `handleCoreCommand` →
 * `await _waitForBackend` (microtask) → `emitEvent` → PARAMACK (resuelve el
 * pending request). Un macrotask es suficiente para vaciar la cola de
 * microtasks de toda la cadena.
 */
async function flushAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GlobalFxStrip write-path (slider → RpcCommandDispatcher real → rpc.send)', () => {
    it('mover el slider MIX (200) llega a rpc.send(setParameter) con target globalFx.200', async () => {
        const GlobalFxStripCtor = (window as any).GlobalFxStrip;
        const strip = new GlobalFxStripCtor();
        strip.init();

        // Estado inicial (getState) → sliders renderizados con valores
        host.injectEvent('state', { schemaVersion: '7.0', patch: PATCH_WITH_FX });
        expect(document.querySelectorAll('.global-fx-slider').length).toBe(5);

        sendSpy.mockClear();
        fireSliderInput('200', 0.37);
        await flushAsync();

        // 1) La validación interna del dispatcher pasó y rpc.send recibió el
        //    mensaje EXACTO (target globalFx.<id>)
        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(sendSpy).toHaveBeenCalledWith('setParameter', {
            target: 'globalFx.200',
            value: 0.37,
        });

        // 2) El label se actualiza en el mismo handler (feedback inmediato)
        expect(
            document.querySelector('.global-fx-value[data-fx-id="200"]')?.textContent,
        ).toBe('37%');

        // 3) El "C++" (FakeHostBridge) recibe el mismo target por el wire
        const received = host.getLastCall();
        expect(received.type).toBe('setParameter');
        expect(received.payload).toEqual({ target: 'globalFx.200', value: 0.37 });

        strip.destroy();
    });

    it('cada slider emite su propio target globalFx.<id> (barrido 200..204)', async () => {
        const GlobalFxStripCtor = (window as any).GlobalFxStrip;
        const strip = new GlobalFxStripCtor();
        strip.init();

        host.injectEvent('state', { schemaVersion: '7.0', patch: PATCH_WITH_FX });
        expect(document.querySelectorAll('.global-fx-slider').length).toBe(5);

        sendSpy.mockClear();
        const sweep: Array<{ id: string; value: number }> = [
            { id: '200', value: 0.37 },
            { id: '201', value: 0.11 },
            { id: '202', value: 0.83 },
            { id: '203', value: 0.52 },
            { id: '204', value: 0.04 },
        ];

        for (const { id, value } of sweep) {
            fireSliderInput(id, value);
        }
        await flushAsync();

        // 1) Un send por slider, cada uno con su target globalFx.<id>
        expect(sendSpy).toHaveBeenCalledTimes(sweep.length);
        for (const { id, value } of sweep) {
            expect(sendSpy).toHaveBeenCalledWith('setParameter', {
                target: `globalFx.${id}`,
                value,
            });
        }

        // 2) El último llega al "C++" intacto
        const received = host.getLastCall();
        expect(received.type).toBe('setParameter');
        expect(received.payload).toEqual({ target: 'globalFx.204', value: 0.04 });

        strip.destroy();
    });

    it('el read-path (sync desde el store) NO llega a rpc.send — solo el input del usuario', async () => {
        const GlobalFxStripCtor = (window as any).GlobalFxStrip;
        const strip = new GlobalFxStripCtor();
        strip.init();

        sendSpy.mockClear();

        // Sincronización desde el store (read-path): no debe tocar el dispatcher
        host.injectEvent('state', { schemaVersion: '7.0', patch: PATCH_WITH_FX });
        host.injectEvent('onStateUpdate', { schemaVersion: '7.0', patch: PATCH_WITH_FX });
        await flushAsync();
        expect(sendSpy).not.toHaveBeenCalled();

        // Solo el input del usuario dispara el write-path
        fireSliderInput('200', 0.5);
        await flushAsync();
        expect(sendSpy).toHaveBeenCalledTimes(1);

        strip.destroy();
    });

    it('la validación interna del dispatcher bloquea setParameter sin target (nunca llega a rpc.send)', async () => {
        const dispatcher = (window as any).rpcCommandDispatcher;
        sendSpy.mockClear();

        // handleCoreCommand lanza "setParameter missing target or numeric IDs";
        // dispatch captura el error internamente (OmegaLog.error) y resuelve.
        // La señal de que la validación corrió es que rpc.send NUNCA se invoca.
        await dispatcher.dispatch({ type: 'setParameter', payload: {} });
        await flushAsync();
        expect(sendSpy).not.toHaveBeenCalled();
    });
});
