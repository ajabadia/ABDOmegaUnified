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

/**
 * Separación del tirador respecto al borde del nodo, en píxeles.
 *
 * Va con `Math.min(this, width / 4)` al aplicarse: en un nodo más estrecho que
 * cuatro insets el tirador se pegaría al lado contrario.
 */
const HANDLE_EDGE_INSET = 8;

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
      const entity = entities.find(e => e.id === id);
      const isInput = entity?.type === 'telemetry' || entity?.type === 'stream';

      // El tirador va en el BORDE lateral del nodo, no en su centro.
      //
      // MEDIDO (2 de octubre de 2026): estaba en el centro exacto, y el
      // overlay de conexiones va por encima del rack (`z-[60]`, con
      // `pointer-events` activos). Pinchar una celda por su mitad —justo lo
      // que hace una persona con un potenciómetro— no seleccionaba nada: el
      // clic lo recibía el tirador y la celda ni se enteraba. Medido en el
      // navegador: el `pointerdown` y el `click` de la celda no llegaban a
      // dispararse, y `selectedNodeId` seguía en `null`.
      //
      // Sin selección, el menú `File → Export → Cell as Blueprint JSON`
      // permanece deshabilitado y exportar la celda a `.acepack` no arranca:
      // el tirador había vuelto imposible una función entera por tapar el
      // centro del nodo.
      //
      // Entradas a la izquierda y salidas a la derecha es la convención de
      // los editores de nodos, y deja el centro del nodo libre para seleccionarlo.
      // El margen se acota a un cuarto del ancho para que en nodos estrechos
      // el tirador no llegue a salirse.
      const inset = Math.min(HANDLE_EDGE_INSET, rect.width / 4);
      const x = isInput
        ? rect.left - containerRect.left + inset
        : rect.left - containerRect.left + rect.width - inset;
      const y = rect.top - containerRect.top + rect.height / 2;

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
