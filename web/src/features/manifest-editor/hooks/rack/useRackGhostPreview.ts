/**
 * @purpose Hook que encapsula la lógica de teclado y ratón para el ghost preview de blueprints en el VirtualRack.
 * @purpose_en Hook that encapsulates keyboard and mouse logic for blueprint ghost preview in VirtualRack.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:200ex7
 * @lastUpdated 2026-06-20T22:29:06.537Z
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseRackGhostPreviewOptions {
  isGhostVisible: boolean;
  ghostPosition: { x: number; y: number } | null | undefined;
  onGhostCancel?: (() => void) | undefined;
  onGhostClick?: ((x: number, y: number) => void) | undefined;
  onGhostMouseMove?: ((rackX: number, rackY: number) => void) | undefined;
  zoom: number;
}

interface UseRackGhostPreviewReturn {
  rackRef: React.RefObject<HTMLDivElement | null>;
  handleRackMouseMove: (e: React.MouseEvent) => void;
  handleRackGhostClick: (x: number, y: number) => void;
}

/**
 * Maneja los eventos de teclado (Enter/Escape) y ratón (move/click)
 * para la superposición de ghost preview durante la colocación de blueprints.
 */
export function useRackGhostPreview({
  isGhostVisible,
  ghostPosition,
  onGhostCancel,
  onGhostClick,
  onGhostMouseMove,
  zoom,
}: UseRackGhostPreviewOptions): UseRackGhostPreviewReturn {
  const rackRef = useRef<HTMLDivElement>(null);

  // ── Ghost Preview: keyboard confirm (Enter) & cancel (Escape) ───────
  useEffect(() => {
    if (!isGhostVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onGhostCancel) {
        onGhostCancel();
      } else if (e.key === 'Enter' && onGhostClick && ghostPosition) {
        e.preventDefault();
        onGhostClick(ghostPosition.x, ghostPosition.y);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGhostVisible, onGhostCancel, onGhostClick, ghostPosition]);

  // ── Ghost Preview: mouse move tracking ─────────────────────────────
  const handleRackMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isGhostVisible || !onGhostMouseMove || !rackRef.current) return;
    const rect = rackRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const rackX = dx / zoom;
    const rackY = dy / zoom;
    onGhostMouseMove(rackX, rackY);
  }, [isGhostVisible, onGhostMouseMove, zoom]);

  // ── Ghost Preview: click to confirm injection ──────────────────────
  const handleRackGhostClick = useCallback((x: number, y: number) => {
    if (!isGhostVisible || !onGhostClick) return;
    onGhostClick(x, y);
  }, [isGhostVisible, onGhostClick]);

  return { rackRef, handleRackMouseMove, handleRackGhostClick };
}
