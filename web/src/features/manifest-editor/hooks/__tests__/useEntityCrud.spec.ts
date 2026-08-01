/**
 * @jest-environment jsdom
 *
 * Tests for useEntityCrud hook — entity add/duplicate/remove with selection.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useEntityCrud, type EntityCrudEditor } from '../useEntityCrud';

function createMockEditor(): jest.MockedObject<EntityCrudEditor> {
  return {
    addEntity: jest.fn<(type: 'control' | 'jack') => string | undefined>(),
    duplicateItem: jest.fn<(id: string) => string | undefined>(),
    removeItem: jest.fn<(id: string) => void>(),
  };
}

// ── handleAddEntity ────────────────────────────────────────────────────

describe('useEntityCrud — handleAddEntity', () => {
  it('should call editor.addEntity with the given type', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleAddEntity('control'); });

    expect(editor.addEntity).toHaveBeenCalledWith('control', undefined);
  });

  it('should select the new entity when addEntity returns an id', () => {
    const editor = createMockEditor();
    editor.addEntity.mockReturnValue('new-entity-1');
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleAddEntity('jack'); });

    expect(onSelect).toHaveBeenCalledWith('new-entity-1');
  });

  it('should NOT select when addEntity returns undefined', () => {
    const editor = createMockEditor();
    editor.addEntity.mockReturnValue(undefined);
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleAddEntity('control'); });

    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ── handleDuplicateItem ────────────────────────────────────────────────

describe('useEntityCrud — handleDuplicateItem', () => {
  it('should call editor.duplicateItem with the given id', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleDuplicateItem('item-1'); });

    expect(editor.duplicateItem).toHaveBeenCalledWith('item-1');
  });

  it('should select the duplicate when duplicateItem returns a new id', () => {
    const editor = createMockEditor();
    editor.duplicateItem.mockReturnValue('dup-1');
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleDuplicateItem('item-1'); });

    expect(onSelect).toHaveBeenCalledWith('dup-1');
  });

  it('should NOT select when duplicateItem returns undefined', () => {
    const editor = createMockEditor();
    editor.duplicateItem.mockReturnValue(undefined);
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleDuplicateItem('item-1'); });

    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ── handleRemoveItem ───────────────────────────────────────────────────

describe('useEntityCrud — handleRemoveItem', () => {
  it('should call editor.removeItem with the given id', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, 'selected-1'));
    act(() => { result.current.handleRemoveItem('some-item'); });

    expect(editor.removeItem).toHaveBeenCalledWith('some-item');
  });

  it('should deselect when the removed item is the currently selected one', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, 'selected-1'));
    act(() => { result.current.handleRemoveItem('selected-1'); });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('should NOT deselect when a different item is removed', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, 'selected-1'));
    act(() => { result.current.handleRemoveItem('other-item'); });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should handle removal when selectedItemId is null', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));
    act(() => { result.current.handleRemoveItem('some-item'); });

    expect(editor.removeItem).toHaveBeenCalledWith('some-item');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useEntityCrud — return shape', () => {
  it('should return handleAddEntity, handleDuplicateItem, and handleRemoveItem', () => {
    const editor = createMockEditor();
    const onSelect = jest.fn<(id: string | null) => void>();

    const { result } = renderHook(() => useEntityCrud(editor, onSelect, null));

    expect(result.current).toHaveProperty('handleAddEntity');
    expect(typeof result.current.handleAddEntity).toBe('function');
    expect(result.current).toHaveProperty('handleDuplicateItem');
    expect(typeof result.current.handleDuplicateItem).toBe('function');
    expect(result.current).toHaveProperty('handleRemoveItem');
    expect(typeof result.current.handleRemoveItem).toBe('function');
  });
});
