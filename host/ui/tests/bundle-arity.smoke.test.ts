/**
 * OMEGA Era 7.2.3 - Bundle Arity Smoke Test (REFACTORING_PLAN Fase 6)
 *
 * Carga el bundle.js REAL (artefacto compilado con esbuild, no las fuentes)
 * y verifica end-to-end que el ModuleManager del bundle instancia los módulos
 * con la aridad correcta.
 *
 * Discriminador de aridad: en la ruta 2-arg el ModuleInstantiator hace
 * `new Factory(content, options.manifest)` donde `content` es el div
 * `.module-content`. Por tanto, el panel renderizado (`.module-panel`)
 * debe quedar DENTRO de `.module-content`. Si la aridad estuviera rota
 * (ruta 3-arg `new Factory(el, content, options)`), el render caería en el
 * wrapper `#mod-*` y `.module-content` quedaría vacío o sería destruido.
 *
 * Esto replica lo que ejecuta el host (JUCE WebView) con el bundle regenerado.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { FakeHostBridge } from './FakeHostBridge.js';

// Polyfill requestAnimationFrame (VisualizerEngine.start lo usa; jsdom no lo tiene)
beforeAll(() => {
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    (window as any).cancelAnimationFrame = (id: number) => window.clearTimeout(id);
});

describe('bundle.js arity smoke test (real artifact)', () => {
    let manager: any;
    let moduleEl: HTMLElement | null;
    let moduleContent: HTMLElement | null;

    beforeAll(async () => {
        // 1. Simular el bridge del host (FakeHostBridge responde getState/uiReady,
        //    evitando timers pendientes si el boot DOMContentLoaded llegara a correr)
        const host = new FakeHostBridge();
        (window as any).rpcCommandDispatcher = { dispatch: vi.fn() };

        // 2. Contenedores de rack en el DOM (updateRack hace getElementById)
        const upper = document.createElement('div');
        upper.id = 'upper-rack';
        const lower = document.createElement('div');
        lower.id = 'lower-rack';
        document.body.appendChild(upper);
        document.body.appendChild(lower);

        // 3. Cargar el bundle compilado REAL (index.ts registra ModuleRenderer en el
        //    ModuleRegistry, ancla moduleManager en window y hookea DOMContentLoaded)
        await import('../bundle.js');
        host.setCallback((window as any).handleOmegaMessage);

        manager = (window as any).moduleManager;

        // 4. Seed del schema directamente en el SchemaStore del bundle
        const schemaStore = (window as any).schemaStore;
        const schema = {
            id: 'osc_va_basic',
            name: 'VA Basic Osc',
            version: 7,
            ui_class: 'ModuleRenderer',
            ui: {
                skin: 'industrial',
                dimensions: { width: 60, height: 420 },
                controls: [{ bind: 'freq', type: 'knob', label: 'Freq', pos: { x: 10, y: 20 } }],
                jacks: [],
            },
        };
        // El field privado de TS compila a propiedad normal en el bundle
        if (!schemaStore.schemas) schemaStore.schemas = new Map();
        schemaStore.schemas.set('osc_va_basic', schema);

        // 5. Instanciar UN solo modulo end-to-end (fixture compartido)
        await manager.updateRack({
            patch: {
                modules: [
                    {
                        instanceId: 1,
                        componentId: 'osc_va_basic',
                        label: 'VA OSC',
                        rack: 'lower',
                    },
                ],
            },
        });

        moduleEl = document.getElementById('mod-v7_1');
        moduleContent = moduleEl?.querySelector('.module-content') ?? null;
    });

    afterAll(() => {
        // Limpieza: detener el health monitor (setInterval 2s) que OmegaRPC dejó vivo.
        clearInterval((window as any).omegaRPC?.healthTimer);
    });

    it('ModuleRenderer se registra con constructor de 2 args (content, options)', () => {
        const MR = (window as any).ModuleRenderer;
        expect(MR).toBeDefined();
        expect(MR.length).toBe(2); // (content, options)
    });

    it('updateRack crea el contenedor DOM y la instancia queda activa', () => {
        expect(moduleEl).not.toBeNull();
        const active = (manager as any).activeModules;
        expect(active.get('v7_1')).toBeDefined();
        expect((active.get('v7_1') as any).descriptor?.id).toBe('osc_va_basic');
    });

    it('ARIDAD: el panel renderizado queda dentro de .module-content (ruta 2-arg)', () => {
        // Discriminador de aridad real:
        //  - 2-arg: content = div .module-content -> render() lo puebla con .module-panel
        //  - 3-arg roto: content = wrapper #mod-* -> .module-content vacío o destruido
        expect(moduleContent).not.toBeNull();
        expect(moduleContent!.innerHTML).toContain('module-panel');
    });

    it('el panel renderizado NO reemplazó el wrapper del módulo', () => {
        // En la ruta 2-arg el wrapper conserva header + content (no fue sobrescrito
        // por innerHTML del render). Verificamos que .module-content siga existiendo.
        expect(moduleEl!.querySelector('.module-header')).not.toBeNull();
        expect(moduleContent).not.toBeNull();
    });
});
