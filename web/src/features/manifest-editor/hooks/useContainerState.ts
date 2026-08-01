'use client';

/**
 * @purpose Gestiona el estado de secciones ampliadas y colapsadas dentro de un contenedor en el editor de manifesto OMEGA.
 * @purpose_en Manages the state of expanded and collapsed sections within a container in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:rimeak
 * @lastUpdated 2026-06-15T13:12:34.414Z
 */

import { useState } from 'react';

export const useContainerState = () => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isExpanded = (id: string) => expandedIds[id] ?? true;

  return { toggleExpand, isExpanded };
};
