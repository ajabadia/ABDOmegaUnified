'use client';

/**
 * @purpose Gestiona el estado de capa flotante para arrastre y soltar de archivos en el editor de manifesto OMEGA.
 * @purpose_en Manages drag-and-drop overlay state for file drops in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:5uu8l2
 * @lastUpdated 2026-06-15T13:21:45.999Z
 */

import { useState, useCallback, useRef, useMemo } from 'react';

export interface FileDropHandlers {
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export interface UseFileDropResult {
  isDragOver: boolean;
  dragHandlers: FileDropHandlers;
}

/**
 * useFileDrop — manages drag-and-drop overlay state for file drops.
 *
 * Tracks `isDragOver` using a counter to handle nested drag enter/leave events.
 * Calls `onDropFile(file)` with the first valid file when a drop occurs.
 */
export function useFileDrop(onDropFile: (file: File) => Promise<void> | void): UseFileDropResult {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      await onDropFile(file);
    }
  }, [onDropFile]);

  return useMemo(() => ({
    isDragOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }), [isDragOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);
}
