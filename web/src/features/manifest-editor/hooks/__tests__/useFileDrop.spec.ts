/**
 * @jest-environment jsdom
 *
 * Tests for useFileDrop hook
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useFileDrop } from '../useFileDrop';

// Helper to create a mock DragEvent with files
function createMockDragEvent(files: File[]): Partial<React.DragEvent> {
  return {
    preventDefault: jest.fn() as unknown as () => void,
    stopPropagation: jest.fn() as unknown as () => void,
    dataTransfer: {
      types: ['Files'],
      files: {
        length: files.length,
        item: (i: number) => files[i] ?? null,
        ...(files.length > 0 ? { 0: files[0] } : {}),
        [Symbol.iterator]: function* () { yield* files; },
      } as unknown as DataTransfer['files'],
    } as unknown as DataTransfer,
  } as unknown as React.DragEvent;
}

// Helper to create a mock DragEvent WITHOUT Files in types
function createNonFileDragEvent(): Partial<React.DragEvent> {
  return {
    preventDefault: jest.fn() as unknown as () => void,
    stopPropagation: jest.fn() as unknown as () => void,
    dataTransfer: {
      types: ['text/plain'],
      files: { length: 0 } as unknown as DataTransfer['files'],
    } as unknown as DataTransfer,
  } as unknown as React.DragEvent;
}

function noopDrop() { /* noop */ }

// ── Initial state ──────────────────────────────────────────────────────

describe('useFileDrop — initial state', () => {
  it('should start with isDragOver=false', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    expect(result.current.isDragOver).toBe(false);
  });

  it('should return 4 drag handlers', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    expect(result.current.dragHandlers.onDragEnter).toBeInstanceOf(Function);
    expect(result.current.dragHandlers.onDragOver).toBeInstanceOf(Function);
    expect(result.current.dragHandlers.onDragLeave).toBeInstanceOf(Function);
    expect(result.current.dragHandlers.onDrop).toBeInstanceOf(Function);
  });
});

// ── Drag Enter / Leave ────────────────────────────────────────────────

describe('useFileDrop — drag enter/leave', () => {
  it('should set isDragOver=true on dragEnter with Files', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    act(() => {
      result.current.dragHandlers.onDragEnter(createMockDragEvent([]) as React.DragEvent);
    });
    expect(result.current.isDragOver).toBe(true);
  });

  it('should set isDragOver=false after dragLeave when counter reaches 0', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    act(() => {
      result.current.dragHandlers.onDragEnter(createMockDragEvent([]) as React.DragEvent);
    });
    expect(result.current.isDragOver).toBe(true);

    act(() => {
      result.current.dragHandlers.onDragLeave(createMockDragEvent([]) as React.DragEvent);
    });
    expect(result.current.isDragOver).toBe(false);
  });

  it('should NOT set isDragOver=true on dragEnter without Files in types', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    act(() => {
      result.current.dragHandlers.onDragEnter(createNonFileDragEvent() as React.DragEvent);
    });
    // isDragOver stays false because types doesn't include 'Files'
    expect(result.current.isDragOver).toBe(false);
  });

  it('should use counter to handle nested enter/leave (not flicker)', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    act(() => { result.current.dragHandlers.onDragEnter(createMockDragEvent([]) as React.DragEvent); });
    act(() => { result.current.dragHandlers.onDragEnter(createMockDragEvent([]) as React.DragEvent); });
    expect(result.current.isDragOver).toBe(true);

    act(() => { result.current.dragHandlers.onDragLeave(createMockDragEvent([]) as React.DragEvent); });
    expect(result.current.isDragOver).toBe(true);

    act(() => { result.current.dragHandlers.onDragLeave(createMockDragEvent([]) as React.DragEvent); });
    expect(result.current.isDragOver).toBe(false);
  });
});

// ── Drop ───────────────────────────────────────────────────────────────

describe('useFileDrop — drop', () => {
  it('should call onDropFile with the first file', () => {
    const onDrop = jest.fn<(file: File) => void>();
    const { result } = renderHook(() => useFileDrop(onDrop));
    const file = new File(['content'], 'test.omega');

    act(() => {
      result.current.dragHandlers.onDrop(createMockDragEvent([file]) as React.DragEvent);
    });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(file);
  });

  it('should reset isDragOver to false after drop', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    const file = new File([''], 'test.omega');

    act(() => {
      result.current.dragHandlers.onDragEnter(createMockDragEvent([file]) as React.DragEvent);
    });
    expect(result.current.isDragOver).toBe(true);

    act(() => {
      result.current.dragHandlers.onDrop(createMockDragEvent([file]) as React.DragEvent);
    });
    expect(result.current.isDragOver).toBe(false);
  });

  it('should NOT call onDropFile with empty file list', () => {
    const onDrop = jest.fn<(file: File) => void>();
    const { result } = renderHook(() => useFileDrop(onDrop));

    act(() => {
      result.current.dragHandlers.onDrop(createMockDragEvent([]) as React.DragEvent);
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('should call preventDefault and stopPropagation', () => {
    const onDrop: (file: File) => void = () => {};
    const { result } = renderHook(() => useFileDrop(onDrop));
    const file = new File([''], 'test.omega');
    const event = createMockDragEvent([file]);

    act(() => {
      result.current.dragHandlers.onDrop(event as React.DragEvent);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});

// ── Drag Over ─────────────────────────────────────────────────────────

describe('useFileDrop — drag over', () => {
  it('should call preventDefault and stopPropagation', () => {
    const { result } = renderHook(() => useFileDrop(noopDrop));
    const event = createMockDragEvent([]);

    act(() => {
      result.current.dragHandlers.onDragOver(event as React.DragEvent);
    });

    const prevented = (event.preventDefault as jest.Mock);
    const stopped = (event.stopPropagation as jest.Mock);
    expect(prevented).toHaveBeenCalled();
    expect(stopped).toHaveBeenCalled();
  });
});
