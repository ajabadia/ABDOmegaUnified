/**
 * @purpose Gestiona estado mock para el hook assetFileSystem en el editor de manifesto OMEGA.
 * @purpose_en Manages mock state for the useAssetFileSystem hook in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:0o81x4
 * @lastUpdated 2026-06-20T18:37:26.783Z
 */

/**
 * Manual mock for useAssetFileSystem hook.
 * Each test sets expectedState via __setMockState before rendering.
 */

export let expectedState: Record<string, unknown> = {};

export function __setMockState(overrides?: Record<string, unknown>): void {
  expectedState = {
    folders: new Map(),
    currentPath: null,
    isAtRoot: true,
    navigateTo: jest.fn(),
    navigateBack: jest.fn(),
    handleLibrarySelect: jest.fn(),
    fileInputRef: { current: null },
    pendingSequenceFiles: null,
    setPendingSequenceFiles: jest.fn(),
    library: [],
    ...overrides,
  };
}

// Initialize default
__setMockState();

export const AssetSelectionMetadata = {};

export function useAssetFileSystem(): Record<string, unknown> {
  return expectedState;
}
