'use client';

/**
 * @purpose Gestiona y calcula manijas de puertos y enlaces de conexión según las posiciones del DOM y los datos de manifestación.
 * @purpose_en Manages and calculates port handles and connection links based on DOM positions and manifest data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:rgs8w7
 * @lastUpdated 2026-06-19T18:48:40.394Z
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';
import type { ConnectionLink, PortHandle } from './connectionOverlayUtils';


interface UseConnectionPositionsResult {
  handles: PortHandle[];
  links: ConnectionLink[];
  dimensions: { w: number; h: number };
  linksVersion: number;
  refreshPositions: () => void;
  entityLabelMap: Map<string, string>;
}

export function useConnectionPositions(
  manifest: OMEGA_Manifest,
  containerRef: React.RefObject<HTMLDivElement | null>,
): UseConnectionPositionsResult {
  const [handles, setHandles] = useState<PortHandle[]>([]);
  const [links, setLinks] = useState<ConnectionLink[]>([]);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [linksVersion, setLinksVersion] = useState(0);

  const refreshPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newHandles: PortHandle[] = [];
    const newLinks: ConnectionLink[] = [];

    const entities: ManifestEntity[] = [
      ...(manifest.ui?.controls || []),
      ...(manifest.ui?.jacks || []),
    ];
    const entityIds = new Set(entities.map(e => e.id));

    const ucaElements = container.querySelectorAll<HTMLElement>('[id^="uca-"]');
    ucaElements.forEach(el => {
      const id = el.id.replace('uca-', '');
      if (!entityIds.has(id)) return;

      const rect = el.getBoundingClientRect();
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;
      const entity = entities.find(e => e.id === id);
      const isInput = entity?.type === 'telemetry' || entity?.type === 'stream';

      newHandles.push({
        id,
        label: entity?.label || id,
        x,
        y,
        isInput,
      });
    });

    const modulations = manifest.modulations || [];
    modulations.forEach(mod => {
      const sourceHandle = newHandles.find(h => h.id === mod.source);
      const targetHandle = newHandles.find(h => h.id === mod.target);
      if (sourceHandle && targetHandle) {
        newLinks.push({
          id: mod.id,
          sourceId: mod.source,
          targetId: mod.target,
          sx: sourceHandle.x,
          sy: sourceHandle.y,
          tx: targetHandle.x,
          ty: targetHandle.y,
          amount: mod.amount ?? 0.75,
          type: mod.type || 'unipolar',
        });
      }
    });

    setHandles(newHandles);
    setLinks(prev => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(newLinks);
      if (prevJson !== nextJson) {
        setLinksVersion(v => v + 1);
      }
      return newLinks;
    });
    setDimensions({ w: containerRect.width, h: containerRect.height });
  }, [manifest, containerRef]);

  // Refresh on mount + resize + periodic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    refreshPositions();

    const resizeObserver = new ResizeObserver(() => refreshPositions());
    resizeObserver.observe(container);

    const intervalId = setInterval(refreshPositions, 1000);

    return () => {
      resizeObserver.disconnect();
      clearInterval(intervalId);
    };
  }, [refreshPositions, containerRef]);

  // Memoized entity label map for tooltip
  const entityLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const entities = [...(manifest.ui?.controls || []), ...(manifest.ui?.jacks || [])];
    entities.forEach(e => map.set(e.id, e.label || e.id));
    return map;
  }, [manifest]);

  return {
    handles,
    links,
    dimensions,
    linksVersion,
    refreshPositions,
    entityLabelMap,
  };
}
