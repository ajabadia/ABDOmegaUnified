/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza jerarquías UCA utilizando nodos estructurales, nodos de celda y elementos div según tipos de nodos y propiedades de layout.
 * @purpose_en Renders UCA hierarchies using structural nodes, cell nodes, and div elements based on node types and layout properties.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1mdpe0k
 * @lastUpdated 2026-06-15T16:09:39.573Z
 */

import React from 'react';
import { resolveNodeSemantics } from '../uca/ucaSemantics';
import { resolveLayout } from '../uca/layoutResolver';
import { StructuralNode } from './components/StructuralNode';
import { CellNode } from './components/CellNode';
import { UCADebugHUD } from './components/UCADebugHUD';
import { PluginRegistry } from '@/lib/plugins/PluginRegistry';
import type { UniversalRendererProps } from './ucaTypes';

/**
 * UNIVERSAL RENDERER (Phase 1 Experimental - Refactored)
 * Recursive orchestrator for UCA hierarchies.
 */
export function UniversalRenderer({ 
  node: rawNode, 
  manifest, 
  depth = 0,
  catalog = {},
  resolveAsset,
  debugContext,
  parentWorldPos = { x: 0, y: 0 },
  parentNode = null,
  audit
}: UniversalRendererProps) {
  
  // 1. Resolve semantics & Layout (Phase 4.4.1)
  const semanticNode = resolveNodeSemantics(rawNode, { catalog });
  const node = resolveLayout(semanticNode);

  const isLayoutGoverned = !!(parentNode?.layout?.mode && parentNode.layout.mode !== 'absolute');
  const worldX = (parentWorldPos?.x || 0) + (node.layout?.pos?.x || 0);
  const worldY = (parentWorldPos?.y || 0) + (node.layout?.pos?.y || 0);
  const worldPos = { x: worldX, y: worldY };

  if (node.visible === false) return null;
  if (debugContext?.enabled && debugContext.hideDecorative && node.role === 'decor') return null;

  const handleDebugClick = (e: React.MouseEvent) => {
    if (debugContext?.onSelect && !debugContext?.isLiveMode) {
      e.stopPropagation();
      if ((e.ctrlKey || e.shiftKey) && debugContext.onSelectMultiple && debugContext.multiSelectedIds) {
        const alreadySelected = debugContext.multiSelectedIds.includes(node.id);
        if (alreadySelected) {
          debugContext.onSelectMultiple(debugContext.multiSelectedIds.filter(id => id !== node.id));
        } else {
          debugContext.onSelectMultiple([...debugContext.multiSelectedIds, node.id]);
        }
      } else {
        debugContext.onSelect(node.id);
      }
    }
  };

  // 2. Dispatchers
  
  // A. Structural Nodes (Rack, Face, Container, Group)
  if (node.kind === 'rack' || node.kind === 'face' || node.kind === 'container' || node.kind === 'group') {
    return (
      <StructuralNode 
        node={node}
        manifest={manifest}
        depth={depth}
        catalog={catalog}
        resolveAsset={resolveAsset || undefined}
        debugContext={debugContext || undefined}
        worldPos={worldPos}
        isLayoutGoverned={isLayoutGoverned}
        handleDebugClick={handleDebugClick}
        parentNode={parentNode}
      />
    );
  }

  // B. Atomic Cells and Ports
  if (node.kind === 'cell' || node.kind === 'port') {
    return (
      <CellNode 
        node={node}
        manifest={manifest}
        depth={depth}
        catalog={catalog}
        resolveAsset={resolveAsset || undefined}
        debugContext={debugContext || undefined}
        worldPos={worldPos}
        isLayoutGoverned={isLayoutGoverned}
        handleDebugClick={handleDebugClick}
        parentNode={parentNode}
      />
    );
  }

  // C. Plugin renderer (Phase 6.2)
  const PluginRenderer = PluginRegistry.getRenderer(node.kind);
  if (PluginRenderer) {
    return (
      <PluginRenderer
        node={node}
        manifest={manifest}
        depth={depth}
        value={debugContext?.runtimeValues?.[node.id] ?? 0}
        style={{ position: 'absolute', left: `${node.layout?.pos?.x || 0}px`, top: `${node.layout?.pos?.y || 0}px` } as Record<string, unknown>}
        onSelect={(id) => debugContext?.onSelect?.(id)}
        isSelected={debugContext?.selectedId === node.id}
      />
    );
  }

  // D. Layers & Assets (Simple rendering)
  if (node.kind === 'layer' || node.kind === 'asset-layer') {
    const isSelected = debugContext?.selectedId === node.id;
    return (
      <div 
        className={`uca-node uca-${node.kind}`}
        onClick={handleDebugClick}
        style={{
          position: 'absolute',
          left: `${node.layout?.pos?.x || 0}px`,
          top: `${node.layout?.pos?.y || 0}px`,
          color: node.style?.color,
          fontSize: node.style?.fontSize,
          opacity: node.style?.opacity,
          pointerEvents: debugContext?.isLiveMode ? 'none' : 'auto',
          outline: isSelected ? '1px solid white' : 'none'
        }}
      >
        <UCADebugHUD 
          node={node} 
          debugContext={debugContext || { enabled: false, showLabels: false, onSelect: () => {}, selectedId: null, hideDecorative: false }} 
          worldPos={worldPos}
          audit={audit}
        />
        {node.role === 'label' && <span>{node.id}</span>}
      </div>
    );
  }

  return null;
}
