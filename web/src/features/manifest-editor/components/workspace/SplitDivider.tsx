/**
 * @purpose Gestiona las interacciones del usuario para dividir y redimensionar paneles en el espacio de trabajo del editor de manifesto OMEGA.
 * @purpose_en Manages user interactions for dividing and resizing panels in the OMEGA manifest editor workspace.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:xer029
 * @lastUpdated 2026-06-15T13:02:30.822Z
 */

import React, { useCallback } from 'react';

interface SplitDividerProps {
  onDrag: (delta: number) => void;
}

export const SplitDivider = React.memo(({ onDrag }: SplitDividerProps) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const totalWidth = window.innerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      onDrag(delta / totalWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className="w-1 bg-white/5 hover:bg-primary/40 cursor-col-resize transition-colors duration-200 z-10"
    />
  );
});

SplitDivider.displayName = 'SplitDivider';

export const HorizontalSplitDivider = React.memo(({ onDrag }: { onDrag: (delta: number) => void }) => {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const totalHeight = window.innerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      onDrag(delta / totalHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDrag]);

  return (
    <div 
      onMouseDown={handleMouseDown}
      className="h-1.5 bg-black/40 hover:bg-primary/40 border-t border-b border-white/5 cursor-row-resize transition-colors duration-200 z-10"
    />
  );
});

HorizontalSplitDivider.displayName = 'HorizontalSplitDivider';
