'use client';

/**
 * @purpose Renderiza una capa para editar un estudio celular dentro del editor de manifesto OMEGA.
 * @purpose_en Renders an overlay for editing a cellular study within the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1cyub6u
 * @lastUpdated 2026-06-15T13:02:25.599Z
 */

import CellStudioContainer from './lab/CellStudioContainer';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';

interface WorkbenchStudioOverlayProps {
  studioCell: ManifestEntity | undefined;
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  onFreeze: (template: unknown) => void;
  onSave: (cell: unknown) => void;
  onClose: () => void;
}

/**
 * WorkbenchStudioOverlay — Overlay del Cell Studio cuando está en modo edición.
 * Extraído de WorkbenchContainer.tsx para reducir el monolito.
 */
export function WorkbenchStudioOverlay({
  studioCell,
  manifest,
  resolveAsset,
  onFreeze,
  onSave,
  onClose
}: WorkbenchStudioOverlayProps) {
  return (
    <div className="flex-1 p-4 bg-black/20 animate-in fade-in zoom-in-95 duration-500">
      <CellStudioContainer
        initialCell={studioCell}
        manifest={manifest}
        resolveAsset={resolveAsset}
        onFreeze={onFreeze}
        onSave={onSave}
        onClose={onClose}
      />
    </div>
  );
}
