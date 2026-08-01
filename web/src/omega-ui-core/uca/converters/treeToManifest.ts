/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona el convertido de estructura de árbol UCA a arrays legados para uso en el editor de manifesto OMEGA.
 * @purpose_en ** Converts a UCA tree structure into legacy arrays for use in the OMEGA manifest editor.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** Helper Utility
 * @complexity ** Medium
 * @fingerprint exports:1,imports:1,sig:h67dim
 * @lastUpdated 2026-06-15T16:54:00.462Z
 */

import type { OMEGA_Manifest, OmegaNode, LayoutContainer, ManifestEntity } from '../../types/manifest';

/**
 * treeToManifest
 * Flattens a UCA tree back to legacy arrays.
 */
export function treeToManifest(root: OmegaNode): Partial<OMEGA_Manifest['ui']> {
  const containers: LayoutContainer[] = [];
  const controls: ManifestEntity[] = [];
  const jacks: ManifestEntity[] = [];

  function walk(node: OmegaNode, parentFace?: string, parentContainer?: string) {
    if (node.kind === 'container') {
      containers.push({
        id: node.id,
        label: node.id,
        pos: node.layout?.pos || { x: 0, y: 0 },
        size: { 
          width: node.layout?.size?.width || 'full',
          height: node.layout?.size?.height || 100,
          w: typeof node.layout?.size?.width === 'number' ? node.layout.size.width : undefined, 
          h: typeof node.layout?.size?.height === 'number' ? node.layout.size.height : undefined
        },
        variant: 'default',
        zIndex: node.layout?.zIndex,
        color: node.style?.color,
        indicatorColor: node.style?.indicatorColor,
        rounding: node.style?.rounding as number | undefined,
        borderWidth: node.style?.borderWidth as number | undefined,
        tab: parentFace || 'MAIN'
      });
    } else if (node.kind === 'cell' || node.kind === 'port') {
      const isJack = node.kind === 'port' || node.role === 'port' || node.role === 'stream' && node.cellRef === 'port' || node.cellRef === 'port';
      
      const entity: ManifestEntity = {
        id: node.id,
        type: node.cellRef || 'knob',
        role: node.role || (isJack ? 'port' : 'control'),
        bind: node.bind || 'none',
        label: node.id,
        pos: node.layout?.pos || { x: 0, y: 0 },
        size: node.layout?.size || { width: 48, height: 48 },
        presentation: {
          component: node.cellRef || 'knob',
          variant: 'default',
          offsetX: 0,
          offsetY: 0,
          attachments: [],
          container: parentContainer,
          tab: parentFace || 'MAIN',
          style: {
            ...node.style,
            ...(node.layout?.zIndex !== undefined ? { zIndex: node.layout.zIndex } : {})
          },
          size: node.layout?.size ? { width: node.layout.size.width, height: node.layout.size.height } : { width: 48, height: 48 }
        }
      };

      if (isJack) {
        jacks.push(entity);
      } else {
        controls.push(entity);
      }
    }

    if (node.children) {
      node.children.forEach(child => {
        if (node.kind === 'cell' && (child.kind === 'cell' || child.kind === 'layer')) {
          console.warn(`[UCA Bridge] Warning: Nesting detected in cell '${node.id}'. Data may be lost during round-trip.`);
        }

        const currentFace = node.kind === 'face' ? node.id : parentFace;
        const currentContainer = node.kind === 'container' ? node.id : parentContainer;
        
        walk(child, currentFace, currentContainer);
      });
    }
  }

  walk(root);

  return {
    layout: {
      width: 1000,
      height: 500,
      containers,
      planes: ['MAIN']
    },
    controls,
    jacks
  };
}
