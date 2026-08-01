'use client';

/**
 * @purpose Renderiza una capa de selección de activos para un capa en el editor de manifesto OMEGA.
 * @purpose_en Renders an overlay for selecting assets for a layer in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:z1xzu5
 * @lastUpdated 2026-06-15T12:46:38.579Z
 */

import ModalCloseButton from '../modals/ModalCloseButton';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import AssetSelector from '../inspector/shared/AssetSelector';

interface CellStudioAssetOverlayProps {
  activeLayerId: string | null;
  activeManifest: OMEGA_Manifest;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  onSelect: (layerId: string, assetId: string) => void;
  onClose: () => void;
}

/**
 * CellStudioAssetOverlay — Overlay del selector de assets para capas de receta.
 * Extraído de CellStudioContainer.tsx.
 */
export function CellStudioAssetOverlay({
  activeLayerId,
  activeManifest,
  resolveAsset,
  onSelect,
  onClose
}: CellStudioAssetOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-[800px] h-[600px] wb-surface border wb-outline rounded-xs overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle shrink-0">
          <h3 className="text-base font-black uppercase tracking-widest text-accent">Select Layer Asset</h3>
          <ModalCloseButton onClick={onClose} title="Close asset selector" />
        </div>
        <div className="flex-1">
          <AssetSelector
            manifest={activeManifest} resolveAsset={resolveAsset ?? ((id: string | undefined) => id)} restrictToSequences={true}
            onSelect={(assetId) => {
              if (activeLayerId && assetId) {
                onSelect(activeLayerId, assetId as string);
              }
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
