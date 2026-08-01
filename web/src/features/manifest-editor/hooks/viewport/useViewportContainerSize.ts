'use client';

/**
 * @purpose Gestiona el tamaño del contenedor de viewport utilizando ResizeObserver.
 * @purpose_en Manages the size of a viewport container using ResizeObserver.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:17dvbq
 * @lastUpdated 2026-06-20T11:08:23.640Z
 */

import { useState, useEffect } from 'react';

export interface ViewportContainerSizeResult {
  containerSize: { width: number; height: number };
}

export function useViewportContainerSize(
  sectionRef: React.RefObject<HTMLElement | null>,
): ViewportContainerSizeResult {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const updateSize = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sectionRef]);

  return { containerSize };
}
