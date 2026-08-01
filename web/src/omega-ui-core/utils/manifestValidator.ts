/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Valida la estructura del objeto Manifest OMEGA_Manifest para asegurarse de que cumple con el esquema esperado antes de aplicarlo en el ABDOmegaEditor.
 * @purpose_en Validates the structure of an OMEGA_Manifest object to ensure it meets the expected schema before applying it in the ABDOmegaEditor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:5d08x9
 * @lastUpdated 2026-06-15T16:55:54.355Z
 */

/**
 * OMEGA manifestValidator.ts — Validación de esquema para OMEGA_Manifest
 *
 * Cuando un usuario carga un .json no-destilado como manifiesto, este módulo
 * verifica que el objeto tenga la estructura mínima esperada por el editor
 * antes de aplicarlo, evitando crashes silenciosos.
 *
 * Uso:
 *   const result = validateManifestSchema(parsed);
 *   if (!result.valid) {
 *     editor.addLog(`[ERROR] Invalid manifest: ${result.errors.join('; ')}`);
 *     return;
 *   }
 *   editor.updateDocument(docId, { manifest: result.manifest });
 */

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export interface ValidationResult {
  valid: true;
  manifest: OMEGA_Manifest;
}

export interface ValidationError {
  valid: false;
  errors: string[];
}

/**
 * Verifica que un objeto desconocido tenga la estructura mínima de un
 * OMEGA_Manifest. Retorna el manifiesto tipeado si es válido, o una
 * lista de errores descriptivos si no.
 *
 * Campos requeridos:
 *   - metadata (objeto)
 *   - metadata.name (string no vacío)
 *   - metadata.version (string)
 *   - resources (objeto)
 *   - ui (objeto)
 *   - entities (array, puede estar vacío)
 */
export function validateManifestSchema(obj: unknown): ValidationResult | ValidationError {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Root value must be a JSON object.'] };
  }

  const m = obj as Record<string, unknown>;

  // ── metadata ──────────────────────────────────────────────
  if (!m.metadata || typeof m.metadata !== 'object') {
    errors.push('Missing "metadata": must be an object { name, version, ... }.');
  } else {
    const meta = m.metadata as Record<string, unknown>;
    if (!meta.name || typeof meta.name !== 'string') {
      errors.push('Missing "metadata.name": must be a non-empty string.');
    }
    if (!meta.version || typeof meta.version !== 'string') {
      errors.push('Missing "metadata.version": must be a string (e.g. "1.0.0").');
    }
  }

  // ── resources ─────────────────────────────────────────────
  if (!m.resources || typeof m.resources !== 'object') {
    errors.push('Missing "resources": must be an object { assets?, extra?, ... }.');
  } else {
    const res = m.resources as Record<string, unknown>;
    if (res.assets !== undefined && !Array.isArray(res.assets)) {
      errors.push('"resources.assets" must be an array of OMEGA_Asset objects.');
    }
    if (res.extra !== undefined && !Array.isArray(res.extra)) {
      errors.push('"resources.extra" must be an array of ExtraResource objects.');
    }
  }

  // ── ui ────────────────────────────────────────────────────
  if (!m.ui || typeof m.ui !== 'object') {
    errors.push('Missing "ui": must be an object { layout?, tree?, palette?, ... }.');
  } else {
    const ui = m.ui as Record<string, unknown>;
    if (ui.layout !== undefined) {
      if (typeof ui.layout !== 'object') {
        errors.push('"ui.layout" must be an object { width, height, grid?, ... }.');
      } else {
        const layout = ui.layout as Record<string, unknown>;
        if (typeof layout.width !== 'number') {
          errors.push('"ui.layout.width" must be a number (pixels).');
        }
        if (typeof layout.height !== 'number') {
          errors.push('"ui.layout.height" must be a number (pixels).');
        }
      }
    }
    if (ui.tree !== undefined && (typeof ui.tree !== 'object' || ui.tree === null)) {
      errors.push('"ui.tree" must be an OmegaNode object if present.');
    }
    if (ui.palette !== undefined && (typeof ui.palette !== 'object' || ui.palette === null)) {
      errors.push('"ui.palette" must be an object { token: color, ... }.');
    }
  }

  // ── entities ──────────────────────────────────────────────
  if (!m.entities || !Array.isArray(m.entities)) {
    errors.push('Missing "entities": must be an array of ManifestEntity (can be empty).');
  }

  // ── nodes (optional but type-check if present) ────────────
  if (m.nodes !== undefined && !Array.isArray(m.nodes)) {
    errors.push('"nodes" must be an array of OmegaNode if present.');
  }

  // ── links / modulations ───────────────────────────────────
  if (m.links !== undefined && !Array.isArray(m.links)) {
    errors.push('"links" must be an array of OMEGA_Modulation if present.');
  }
  if (m.modulations !== undefined && !Array.isArray(m.modulations)) {
    errors.push('"modulations" must be an array of OMEGA_Modulation if present.');
  }

  // ── schemaVersion (opcional pero advertir si no existe) ───
  if (m.schemaVersion !== undefined && typeof m.schemaVersion !== 'string') {
    errors.push('"schemaVersion" must be a string if present (e.g. "10.0.0-omega").');
  }

  // ── Result ────────────────────────────────────────────────
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, manifest: obj as OMEGA_Manifest };
}
