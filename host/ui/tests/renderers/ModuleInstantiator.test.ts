/**
 * Tests for ModuleInstantiator.ts — DOM creation, parameter stepping, cleanup
 * Requires jsdom environment (configured in vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createModuleContainer,
  instantiateModule,
  stepParameter,
  cleanupModules,
} from '../../src/Logic/ModuleInstantiator.js';
import { ModuleRegistry } from '../../src/Logic/ModuleRegistry.js';

/** Names of constructors registered for tests, cleaned up after each suite. */
const TEST_CONSTRUCTORS = new Map<string, any>();

function registerTestCtor(name: string, ctor: any) {
  ModuleRegistry.register(name, ctor);
  TEST_CONSTRUCTORS.set(name, ctor);
}

// ---------------------------------------------------------------------------
// createModuleContainer
// ---------------------------------------------------------------------------
describe('createModuleContainer', () => {
  it('creates a div with prefixed id', () => {
    const { el } = createModuleContainer('test-id', 'main', '');
    expect(el.id).toBe('mod-test-id');
    expect(el.tagName).toBe('DIV');
  });

  it('sets className with type and panelClass', () => {
    const { el } = createModuleContainer('osc1', 'aux', 'custom-panel');
    expect(el.className).toContain('module-aux');
    expect(el.className).toContain('custom-panel');
    expect(el.className).toContain('module');
  });

  it('creates a content div with module-content class', () => {
    const { content } = createModuleContainer('test', 'main', '');
    expect(content.className).toBe('module-content');
    expect(content.tagName).toBe('DIV');
  });

  it('appends header and content to the wrapper div', () => {
    const { el, content } = createModuleContainer('test', 'main', '');
    expect(el.children.length).toBe(2);
    expect(el.children[0].className).toContain('module-header');
    expect(el.children[1]).toBe(content);
  });

  it('includes config button in header', () => {
    const { el } = createModuleContainer('test', 'main', '');
    const header = el.children[0];
    const configBtn = header.querySelector('.config-btn');
    expect(configBtn).not.toBeNull();
    expect(configBtn!.innerHTML).toBe('⚙');
  });

  it('includes move buttons in header', () => {
    const { el } = createModuleContainer('test', 'main', '');
    const header = el.children[0];
    const moveBtns = header.querySelectorAll('.move-btn');
    expect(moveBtns.length).toBe(2);
    expect(moveBtns[0].innerHTML).toBe('◀');
    expect(moveBtns[1].innerHTML).toBe('▶');
  });

  it('includes close button in header', () => {
    const { el } = createModuleContainer('test', 'main', '');
    const header = el.children[0];
    const closeBtn = header.querySelector('.module-header-action-close');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.innerHTML).toBe('×');
  });

  it('stores manifest JSON in config button dataset when provided', () => {
    const manifest = { id: 'osc_va', name: 'Oscillator', ui: { skin: 'industrial' } };
    const { el } = createModuleContainer('test', 'main', '', manifest);
    const configBtn = el.querySelector('.config-btn') as HTMLElement;
    expect(configBtn.dataset.manifest).toBe(JSON.stringify(manifest));
  });

  it('does not set dataset.manifest when manifest is undefined', () => {
    const { el } = createModuleContainer('test', 'main', '');
    const configBtn = el.querySelector('.config-btn') as HTMLElement;
    expect(configBtn.dataset.manifest).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// instantiateModule
// ---------------------------------------------------------------------------
describe('instantiateModule', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rack"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null when container is null', async () => {
    const result = await instantiateModule('test', 'ModuleRenderer', null, {} as any, null, new Map());
    expect(result).toBeNull();
  });

  it('returns null when constructor is not registered', async () => {
    const container = document.getElementById('rack')!;
    const result = await instantiateModule('test', 'NonExistentClass', container, {
      componentId: 'test',
      instanceId: '1',
      manifest: { id: 'test', ui: { controls: [], jacks: [] } },
    } as any, null, new Map());
    expect(result).toBeNull();
  });

  it('appends module DOM to the container even on constructor failure', async () => {
    const container = document.getElementById('rack')!;
    await instantiateModule('test', 'NonExistentClass', container, {
      componentId: 'test',
      instanceId: '1',
      manifest: { id: 'test', ui: { controls: [], jacks: [] } },
    } as any, null, new Map());

    // DOM is created before factory lookup, so element exists even on failure
    const modEl = document.getElementById('mod-test');
    expect(modEl).not.toBeNull();
    expect(modEl!.querySelector('.module-header')).not.toBeNull();
    expect(modEl!.querySelector('.module-content')).not.toBeNull();
  });

  it('stores instance in activeModules map on success (2-arg constructor)', async () => {
    const mockInstance = {
      init: vi.fn().mockResolvedValue(undefined),
      onStateUpdate: vi.fn(),
    };
    // A function with 2 formal params → Factory.length === 2
    const MockCtor = vi.fn(function (content: any, opts: any) {
      return mockInstance;
    });
    registerTestCtor('Mock2Arg', MockCtor);

    const container = document.getElementById('rack')!;
    const modules = new Map<string, any>();
    const result = await instantiateModule('mock-test', 'Mock2Arg', container, {
      componentId: 'mock',
      instanceId: '99',
      manifest: { id: 'mock', ui: { controls: [], jacks: [] } },
    } as any, null, modules);

    expect(result).toBe(mockInstance);
    expect(modules.get('mock-test')).toBe(mockInstance);
    expect(mockInstance.init).toHaveBeenCalledOnce();
    // onStateUpdate should NOT be called when lastState is null
    expect(mockInstance.onStateUpdate).not.toHaveBeenCalled();

    // Verify the 2-arg path was taken
    expect(MockCtor).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ id: 'mock' }),
    );
  });

  it('uses 3-arg constructor (el, content, options) for Factory.length > 2', async () => {
    const mockInstance = {
      init: vi.fn().mockResolvedValue(undefined),
    };
    // A function with 3 formal params → Factory.length === 3
    const MockCtor3 = vi.fn(function (el: any, content: any, opts: any) {
      return mockInstance;
    });
    registerTestCtor('Mock3Arg', MockCtor3);

    const container = document.getElementById('rack')!;
    const modules = new Map<string, any>();
    await instantiateModule('legacy-test', 'Mock3Arg', container, {
      componentId: 'legacy',
      instanceId: '98',
      manifest: { id: 'legacy', ui: { controls: [], jacks: [] } },
    } as any, null, modules);

    // Verify the 3-arg path was taken
    expect(MockCtor3).toHaveBeenCalledWith(
      expect.any(HTMLElement),   // el
      expect.any(HTMLElement),   // content
      expect.objectContaining({ componentId: 'legacy' }),  // options
    );
  });

  it('calls onStateUpdate when lastState is provided', async () => {
    const mockInstance = {
      init: vi.fn().mockResolvedValue(undefined),
      onStateUpdate: vi.fn(),
    };
    // length 0 arrow function → 0 <= 2 → 2-arg path
    const MockCtor = vi.fn(() => mockInstance);
    registerTestCtor('MockStateful', MockCtor);

    const container = document.getElementById('rack')!;
    const modules = new Map<string, any>();
    const lastState = { params: { freq: 440 } };

    await instantiateModule('stateful-test', 'MockStateful', container, {
      componentId: 'stateful',
      instanceId: '100',
      manifest: { id: 'stateful', ui: { controls: [], jacks: [] } },
    } as any, lastState, modules);

    expect(mockInstance.onStateUpdate).toHaveBeenCalledWith(lastState);
  });
});

// ---------------------------------------------------------------------------
// stepParameter
// ---------------------------------------------------------------------------
describe('stepParameter', () => {
  beforeEach(() => {
    (window as any).runtimeStore = {
      getSnapshot: vi.fn().mockReturnValue({ parameters: { 'test:VOLUME': 0.5 } }),
    };
    (window as any).rpcCommandDispatcher = {
      dispatch: vi.fn(),
    };
  });

  afterEach(() => {
    delete (window as any).runtimeStore;
    delete (window as any).rpcCommandDispatcher;
  });

  it('does nothing when runtimeStore is missing', () => {
    delete (window as any).runtimeStore;
    stepParameter('test:VOLUME', 1);
    expect((window as any).rpcCommandDispatcher?.dispatch).not.toHaveBeenCalled();
  });

  it('does nothing when rpcCommandDispatcher is missing', () => {
    delete (window as any).rpcCommandDispatcher;
    stepParameter('test:VOLUME', 1);
    // No error should be thrown
  });

  it('increments parameter value by step * 0.01', () => {
    stepParameter('test:VOLUME', 1);
    expect((window as any).rpcCommandDispatcher.dispatch).toHaveBeenCalledWith({
      type: 'setParameter',
      payload: { id: 'test:VOLUME', value: 0.51 },
    });
  });

  it('decrements parameter value by negative step', () => {
    stepParameter('test:VOLUME', -1);
    expect((window as any).rpcCommandDispatcher.dispatch).toHaveBeenCalledWith({
      type: 'setParameter',
      payload: { id: 'test:VOLUME', value: 0.49 },
    });
  });

  it('clamps value to minimum 0', () => {
    (window as any).runtimeStore.getSnapshot = vi.fn().mockReturnValue({ parameters: { 'test:VOLUME': 0.005 } });
    stepParameter('test:VOLUME', -1);
    const payload = (window as any).rpcCommandDispatcher.dispatch.mock.calls[0][0].payload;
    expect(payload.value).toBe(0);
  });

  it('clamps value to maximum 1', () => {
    (window as any).runtimeStore.getSnapshot = vi.fn().mockReturnValue({ parameters: { 'test:VOLUME': 0.995 } });
    stepParameter('test:VOLUME', 1);
    const payload = (window as any).rpcCommandDispatcher.dispatch.mock.calls[0][0].payload;
    expect(payload.value).toBe(1);
  });

  it('uses 0 as default when parameter is not in snapshot', () => {
    (window as any).runtimeStore.getSnapshot = vi.fn().mockReturnValue({ parameters: {} });
    stepParameter('test:UNKNOWN', 1);
    const payload = (window as any).rpcCommandDispatcher.dispatch.mock.calls[0][0].payload;
    expect(payload.value).toBe(0.01);
  });
});

// ---------------------------------------------------------------------------
// cleanupModules
// ---------------------------------------------------------------------------
describe('cleanupModules', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('removes DOM elements for modules not in activeIds', () => {
    const el1 = document.createElement('div');
    el1.id = 'mod-keep';
    document.body.appendChild(el1);
    const el2 = document.createElement('div');
    el2.id = 'mod-remove';
    document.body.appendChild(el2);

    const activeModules = new Map<string, any>([
      ['keep', { dispose: vi.fn() }],
      ['remove', { dispose: vi.fn() }],
    ]);

    cleanupModules(new Set(['keep']), activeModules);

    expect(document.getElementById('mod-keep')).not.toBeNull();
    expect(document.getElementById('mod-remove')).toBeNull();
  });

  it('calls dispose() on removed modules', () => {
    const disposeFn = vi.fn();
    const activeModules = new Map<string, any>([
      ['keep', { dispose: vi.fn() }],
      ['remove', { dispose: disposeFn }],
    ]);

    cleanupModules(new Set(['keep']), activeModules);

    expect(disposeFn).toHaveBeenCalledOnce();
  });

  it('does not call dispose() on kept modules', () => {
    const disposeFn = vi.fn();
    const activeModules = new Map<string, any>([
      ['keep', { dispose: disposeFn }],
    ]);

    cleanupModules(new Set(['keep']), activeModules);

    expect(disposeFn).not.toHaveBeenCalled();
  });

  it('deletes removed modules from the map', () => {
    const activeModules = new Map<string, any>([
      ['keep', { dispose: vi.fn() }],
      ['remove', { dispose: vi.fn() }],
    ]);

    cleanupModules(new Set(['keep']), activeModules);

    expect(activeModules.has('keep')).toBe(true);
    expect(activeModules.has('remove')).toBe(false);
  });

  it('handles modules without dispose method gracefully', () => {
    const activeModules = new Map<string, any>([
      ['no-dispose', {}],
    ]);

    cleanupModules(new Set(), activeModules);
    expect(activeModules.size).toBe(0);
  });

  it('handles empty modules map', () => {
    const activeModules = new Map<string, any>();
    cleanupModules(new Set(), activeModules);
  });

  it('handles non-existent DOM element gracefully', () => {
    const activeModules = new Map<string, any>([
      ['no-dom', { dispose: vi.fn() }],
    ]);

    cleanupModules(new Set(), activeModules);
    expect(activeModules.size).toBe(0);
  });
});