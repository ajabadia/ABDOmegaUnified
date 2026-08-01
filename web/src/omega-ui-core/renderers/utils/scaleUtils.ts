/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona y calcula actualizaciones de escala para nodos en un manifesto OMEGA, incluyendo sus hijos.
 * @purpose_en Manages and computes scale updates for nodes in an OMEGA manifest, including their children.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:4,imports:2,sig:13qh3xh
 * @lastUpdated 2026-06-20T12:53:04.481Z
 */

import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';

export function getOriginalNodeSize(node: OmegaNode): { width: number; height: number } {
  const w = node.layout?.size?.width ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100);
  const h = node.layout?.size?.height ?? (node.kind === 'cell' || node.kind === 'port' ? 48 : 100);
  return { width: w, height: h };
}

export function computeScaleUpdates(
  nodeId: string,
  newW: number,
  newH: number,
  newX: number,
  newY: number,
  manifest: OMEGA_Manifest
): Record<string, Partial<OmegaNode>> {
  const root = manifest.ui?.tree;
  if (!root) return {};
  
  const targetNode = findNodeInTree(root, nodeId);
  if (!targetNode) return {};
  
  const updates: Record<string, Partial<OmegaNode>> = {};
  
  const origSize = getOriginalNodeSize(targetNode);
  const scaleX = origSize.width > 0 ? newW / origSize.width : 1;
  const scaleY = origSize.height > 0 ? newH / origSize.height : 1;
  
  updates[nodeId] = {
    layout: {
      pos: { x: newX, y: newY },
      size: { width: newW, height: newH }
    }
  };
  
  // Recursively scale children
  function scaleSubtree(n: OmegaNode, sX: number, sY: number) {
    if (!n.children || n.children.length === 0) return;
    for (const child of n.children) {
      const childOrigW = child.layout?.size?.width ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
      const childOrigH = child.layout?.size?.height ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
      
      const childOrigX = child.layout?.pos?.x ?? 0;
      const childOrigY = child.layout?.pos?.y ?? 0;
      
      const childNewX = Math.round(childOrigX * sX);
      const childNewY = Math.round(childOrigY * sY);
      const childNewW = Math.round(childOrigW * sX);
      const childNewH = Math.round(childOrigH * sY);
      
      const childUpdates: Partial<OmegaNode> = {
        layout: {
          pos: { x: childNewX, y: childNewY },
          size: { width: Math.max(16, childNewW), height: Math.max(16, childNewH) }
        }
      };
      
      // If it's a label or cell with font size style, scale it
      if (child.style?.fontSize) {
        const origFs = parseInt(String(child.style.fontSize)) || 10;
        const avgScale = (sX + sY) / 2;
        const newFs = Math.round(origFs * avgScale);
        childUpdates.style = {
          ...child.style,
          fontSize: Math.max(6, newFs)
        };
      }
      
      updates[child.id] = childUpdates;
      scaleSubtree(child, sX, sY);
    }
  }
  
  scaleSubtree(targetNode, scaleX, scaleY);
  return updates;
}

/**
 * Extract rotation from a node's layout.transform string.
 * Supports `rotate(Xdeg)` and `rotateX(Xdeg)` CSS-like transforms.
 */
export function getNodeRotation(node: OmegaNode): number {
  const transform = node.layout?.transform;
  if (!transform) return 0;
  const match = transform.match(/rotate\(?([-\d.]+)deg\)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Compute updates to apply rotation to a node.
 * Stores rotation as a CSS transform string in layout.transform.
 * Preserves any existing position and size.
 */
export function computeRotationUpdates(
  nodeId: string,
  angle: number,
  manifest: OMEGA_Manifest,
): Record<string, Partial<OmegaNode>> {
  const root = manifest.ui?.tree;
  if (!root) return {};

  const targetNode = findNodeInTree(root, nodeId);
  if (!targetNode) return {};

  const clampedAngle = ((angle % 360) + 360) % 360;
  const transformStr = clampedAngle === 0 ? undefined : `rotate(${clampedAngle}deg)`;

  return {
    [nodeId]: {
      layout: {
        ...targetNode.layout,
        pos: targetNode.layout?.pos ?? { x: 0, y: 0 },
        size: targetNode.layout?.size ?? { width: 48, height: 48 },
        transform: transformStr,
      },
    },
  };
}

