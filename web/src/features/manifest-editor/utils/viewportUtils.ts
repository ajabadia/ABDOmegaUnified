/**
 * @purpose Funciones utilitarias para el viewport: selección marquee y merge de selección.
 * @purpose_en Viewport utility functions: marquee selection computation and selection merging.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:1ho1mio
 * @lastUpdated 2026-06-20T22:29:06.545Z
 */

import type { MarqueeState } from '@/features/manifest-editor/hooks/viewport/useViewportMarquee';

/**
 * Computa qué nodos UCA están dentro del rectángulo de marquee.
 * @returns IDs de los nodos seleccionados (sin incluir RACK_MASTER).
 */
export function computeMarqueeSelection(
  section: HTMLElement,
  marquee: MarqueeState,
): string[] {
  const rect = section.getBoundingClientRect();
  const mLeft = Math.min(marquee.startX, marquee.currentX) - rect.left;
  const mTop = Math.min(marquee.startY, marquee.currentY) - rect.top;
  const mWidth = Math.abs(marquee.currentX - marquee.startX);
  const mHeight = Math.abs(marquee.currentY - marquee.startY);
  const ucaEls = section.querySelectorAll('[id^="uca-"]');
  const selected: string[] = [];

  ucaEls.forEach(el => {
    const nodeRect = el.getBoundingClientRect();
    const nodeRelX = nodeRect.left - rect.left;
    const nodeRelY = nodeRect.top - rect.top;
    if (
      nodeRelX < mLeft + mWidth &&
      nodeRelX + nodeRect.width > mLeft &&
      nodeRelY < mTop + mHeight &&
      nodeRelY + nodeRect.height > mTop
    ) {
      const id = (el.id as string).replace('uca-', '');
      if (id !== 'RACK_MASTER') selected.push(id);
    }
  });

  return selected;
}

/**
 * Fusiona la selección del marquee con la selección existente,
 * preservando la multi-selección cuando Shift/Ctrl está presionado.
 */
export function mergeMarqueeSelection(
  selected: string[],
  existingSelected: string[],
  isShiftKey: boolean,
  onSelectMultiple: (ids: string[]) => void,
): void {
  if (selected.length === 0) return;
  if (isShiftKey) {
    onSelectMultiple([...new Set([...existingSelected, ...selected])]);
  } else {
    onSelectMultiple(selected);
  }
}
