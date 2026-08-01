/**
 * @jest-environment jsdom
 *
 * Tests for useExportOperations hook — OMEGA Module Rack export + contract download.
 *
 * Mock strategy: Dependency injection via the hook's optional `deps` parameter.
 * No jest.mock for @/ aliased modules — mocks are passed directly as function args.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useExportOperations, type ExportEditor, type ExportOperationsDeps } from '../useExportOperations';

// ── Mock implementations ───────────────────────────────────────────────

const mockDistillOutput = {
  schemaVersion: '10.0.0-distilled',
  name: 'Test',
  rack: { width: 800, height: 600, children: [] },
  assets: [],
};

interface MockZipInstance {
  file: jest.Mock;
  folder: jest.Mock;
  generateAsync: jest.Mock;
}

function createMockZipInstance(): MockZipInstance {
  return {
    file: jest.fn(),
    folder: jest.fn(),
    generateAsync: jest.fn(async () => new Blob()),
  };
}

// Shared mock objects for assertions
const mockDistillFn = jest.fn(() => mockDistillOutput);
const mockContractService = { downloadContract: jest.fn() };
let mockZipInstance: MockZipInstance;
const mockJSZipConstructor = jest.fn(() => {
  mockZipInstance = createMockZipInstance();
  return mockZipInstance;
});

function createDeps(): ExportOperationsDeps {
  return {
    distillForJUCE: mockDistillFn as unknown as ExportOperationsDeps['distillForJUCE'],
    ContractService: mockContractService as unknown as ExportOperationsDeps['ContractService'],
    JSZip: mockJSZipConstructor as unknown as ExportOperationsDeps['JSZip'],
  } as ExportOperationsDeps;
}

// ── Helpers ────────────────────────────────────────────────────────────

const MINIMAL_MANIFEST = {
  id: 'test-module',
  metadata: { name: 'Test Module', version: '1.0.0', author: 'tester' },
  ui: {
    layout: { width: 800, height: 600 },
    tree: {
      id: 'root',
      kind: 'face' as const,
      role: 'root' as const,
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
    },
    controls: [],
    jacks: [],
    palette: {},
  },
  resources: { assets: [] },
  entities: [],
};

function createEditor(overrides?: Partial<ExportEditor>): ExportEditor {
  return {
    addLog: jest.fn(),
    extraResources: [],
    wasmBuffer: null,
    ...overrides,
  };
}

let createdAnchors: HTMLAnchorElement[] = [];
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  createdAnchors = [];
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const el = originalCreateElement(tagName);
    if (tagName === 'a') {
      createdAnchors.push(el as HTMLAnchorElement);
    }
    return el;
  });
  // URL.createObjectURL/revokeObjectURL may not exist in jsdom
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = jest.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = jest.fn() as unknown as typeof URL.revokeObjectURL;
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── handleExportOmegaRack ──────────────────────────────────────────────

describe('useExportOperations — handleExportOmegaRack', () => {
  it('should call distillForJUCE with the manifest', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });
    // @ts-expect-error — @jest/globals v30 + exactOptionalPropertyTypes: jest.fn() defaults to 0-arg type, breaking toHaveBeenCalledWith
    expect(mockDistillFn).toHaveBeenCalledWith(MINIMAL_MANIFEST);
  });

  it('should add manifest.json to the zip', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(mockZipInstance.file).toHaveBeenCalledWith(
      'manifest.json',
      expect.stringContaining('10.0.0-distilled'),
    );
  });

  it('should include resources in a folder when extraResources exist', async () => {
    const buffer = new ArrayBuffer(8);
    const editor = createEditor({
      extraResources: [
        { name: 'knob.png', data: buffer, type: 'image/png' },
        { name: 'bg.svg', data: buffer, type: 'image/svg+xml' },
      ],
    });
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(mockZipInstance.folder).toHaveBeenCalledWith('resources');
  });

  it('should include WASM binary when wasmBuffer is present', async () => {
    const wasmBuffer = new ArrayBuffer(16);
    const editor = createEditor({ wasmBuffer });
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(mockZipInstance.file).toHaveBeenCalledWith('test-module.wasm', wasmBuffer);
  });

  it('should trigger a download via anchor click', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(createdAnchors.length).toBeGreaterThan(0);
    const anchor = createdAnchors[createdAnchors.length - 1];
    expect(anchor.download).toBe('test-module_rack.zip');
    expect(mockZipInstance.generateAsync).toHaveBeenCalled();
  });

  it('should log success on completion', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(editor.addLog).toHaveBeenCalledWith('[SUCCESS] OMEGA Module Rack exported.');
  });

  it('should log error when JSZip constructor throws', async () => {
    mockJSZipConstructor.mockImplementationOnce(() => {
      throw new Error('ZIP creation failed');
    });
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(editor.addLog).toHaveBeenCalledWith('[ERROR] Failed to export OMEGA Module Rack: ZIP creation failed');
  });

  it('should handle empty extraResources (no resources folder)', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    expect(mockZipInstance.folder).not.toHaveBeenCalled();
  });

  it('should handle missing wasmBuffer (no wasm file added)', async () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    await act(async () => { await result.current.handleExportOmegaRack(); });

    // Only manifest.json was called (no .wasm file because wasmBuffer is null)
    expect(mockZipInstance.file).toHaveBeenCalledTimes(1);
  });
});

// ── handleExportContract ───────────────────────────────────────────────

describe('useExportOperations — handleExportContract', () => {
  it('should call ContractService.downloadContract with TypeScript format', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    act(() => { result.current.handleExportContract('ts'); });
    expect(mockContractService.downloadContract).toHaveBeenCalledWith(MINIMAL_MANIFEST, 'ts');
  });

  it('should call ContractService.downloadContract with C++ format', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    act(() => { result.current.handleExportContract('cpp'); });
    expect(mockContractService.downloadContract).toHaveBeenCalledWith(MINIMAL_MANIFEST, 'cpp');
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useExportOperations — return shape', () => {
  it('should return handleExportOmegaRack and handleExportContract', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useExportOperations(MINIMAL_MANIFEST, editor, createDeps()));
    expect(result.current).toHaveProperty('handleExportOmegaRack');
    expect(typeof result.current.handleExportOmegaRack).toBe('function');
    expect(result.current).toHaveProperty('handleExportContract');
    expect(typeof result.current.handleExportContract).toBe('function');
  });
});
