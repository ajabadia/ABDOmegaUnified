/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona resolución de IDs jerárquicos y parseo de rutas para componentes en el editor de manifesto OMEGA.
 * @purpose_en Manages hierarchical ID resolution and path parsing for components in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:tbdqhe
 * @lastUpdated 2026-06-15T16:55:01.504Z
 */

/**
 * OMEGA UCA Path Resolver Utility - Phase 17.3
 * Sovereign logic for hierarchical ID resolution and path parsing.
 */

/**
 * resolvePath
 * Resolves a local ID against a parent path.
 * Rule: Absolute paths (containing '/') are returned as-is (Genetic Authority).
 */
export function resolvePath(localId: string, parentPath?: string): string {
  if (!localId) return 'anonymous_node';
  
  // Absolute path detection
  if (localId.includes('/')) {
    return localId;
  }

  return parentPath ? `${parentPath}/${localId}` : localId;
}

/**
 * parsePath
 * Decomposes a full path into its owning node path and the specific target (port/parameter).
 * Rule: The last segment is always considered the target in the context of modulation/signals.
 */
export function parsePath(fullPath: string): { nodePath: string; target?: string | undefined } {
  const segments = fullPath.split('/');
  
  if (segments.length > 1) {
    return {
      nodePath: segments.slice(0, -1).join('/'),
      target: segments[segments.length - 1]
    };
  }

  return { nodePath: fullPath, target: undefined };
}

/**
 * normalizeModulationTarget
 * Ensures a modulation target is correctly prefixed within its node context.
 */
export function normalizeModulationTarget(target: string, nodePath: string): string {
    // If it's already a path containing the nodePath as a prefix, return as is
    if (target.startsWith(nodePath + '/')) {
        return target;
    }
    // Otherwise, it's relative to the node
    return `${nodePath}/${target}`;
}
