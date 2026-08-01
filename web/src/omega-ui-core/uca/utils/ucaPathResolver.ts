/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona rutas jerárquicas para OmegaNodes y parámetros DSP en el editor de manifesto OMEGA.
 * @purpose_en Manages hierarchical paths for OmegaNodes and DSP parameters in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:d7yi9o
 * @lastUpdated 2026-06-15T16:55:05.929Z
 */

/**
 * OMEGA UCA PATH RESOLVER (Phase 20.2)
 * Authority for Hierarchical Path Addressing (HPA).
 * Ensures deterministic and stable mapping between OmegaNodes and DSP parameters.
 */

import type { OmegaNode, UCA_Port } from '../../types/manifest';

export interface PathResolutionResult {
  path: string;
  node?: OmegaNode;
  port?: UCA_Port;
  error?: string;
}

/**
 * ucaPathResolver
 * Static utility for canonical HPA resolution.
 */
export class ucaPathResolver {
  /**
   * resolvePath
   * Generates a stable absolute path for a node within a tree.
   * Format: root/parent_id/child_id/...
   */
  static resolvePath(nodeId: string, root: OmegaNode): string {
    const segments: string[] = [];
    
    const findPath = (current: OmegaNode, targetId: string, currentPath: string[]): boolean => {
      if (current.id === targetId) {
        segments.push(...currentPath, current.id);
        return true;
      }
      
      if (current.children) {
        for (const child of current.children) {
          if (findPath(child, targetId, [...currentPath, current.id])) {
            return true;
          }
        }
      }
      
      return false;
    };

    if (!findPath(root, nodeId, [])) {
      throw new Error(`[HPA] Node ${nodeId} not found in the provided tree context.`);
    }

    // Join segments with forward slash
    // Note: We might want to skip the 'root' node ID if it's generic, 
    // but for Era 7.2.3, we use full absolute paths.
    return segments.join('/');
  }

  /**
   * resolvePortPath
   * Generates a stable path for a specific port.
   * Format: node_path/ports/port_id
   */
  static resolvePortPath(nodeId: string, portId: string, root: OmegaNode): string {
    const nodePath = this.resolvePath(nodeId, root);
    return `${nodePath}/ports/${portId}`;
  }

  /**
   * resolveNodeByPath
   * Finds a node in the tree using an HPA path.
   */
  static resolveNodeByPath(path: string, root: OmegaNode): OmegaNode | undefined {
    const segments = path.split('/');
    
    // Validate root segment
    if (segments[0] !== root.id) return undefined;
    
    let current: OmegaNode = root;
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (segment === 'ports') break; // Path entered port territory

      const found = current.children?.find((c: OmegaNode) => c.id === segment);
      if (!found) return undefined;
      current = found;
    }
    
    return current;
  }

  /**
   * validatePathStability
   * Ensures that a path does not contain transient markers like array indices.
   */
  static validatePathStability(path: string): boolean {
    // Check if any segment is purely numeric (index-based)
    const segments = path.split('/');
    for (const segment of segments) {
      if (/^\d+$/.test(segment)) return false;
    }
    return true;
  }
}
