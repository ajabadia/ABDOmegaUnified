'use client';

/**
 * @purpose Gestiona el seleccionado y visualizado de activos dentro del editor de manifesto OMEGA, permitiendo a los usuarios navegar, seleccionar y subir activos para sus proyectos.
 * @purpose_en Manages the selection and visualization of assets within the OMEGA manifest editor, allowing users to navigate, select, and upload assets for their projects.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:7,sig:1ou1enh
 * @lastUpdated 2026-06-20T18:37:13.463Z
 */

import React from 'react';
import { Image as ImageIcon, Plus, Trash2, Folder, ChevronLeft, Film } from 'lucide-react';
import Image from 'next/image';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { AssetSelectionMetadata } from '@/features/manifest-editor/hooks/useAssetFileSystem';
import SequenceIngestionLab from './aesthetic/SequenceIngestionLab';
import { useAssetFileSystem } from '@/features/manifest-editor/hooks/useAssetFileSystem';

// Re-export for consumers
export type { AssetSelectionMetadata } from '@/features/manifest-editor/hooks/useAssetFileSystem';

type UploadBridge = (f: File[], cb: (id: string) => void) => void;

interface AssetSelectorProps {
  manifest: OMEGA_Manifest;
  selectedAssetId?: string | undefined;
  onSelect: (assetId: string | undefined, metadata?: AssetSelectionMetadata | undefined) => void;
  label?: string | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  initialPath?: string | undefined;
  restrictToSequences?: boolean | undefined;
}

// ── Sub-components ────────────────────────────────────────────────────

interface HeaderProps {
  label: string;
  restrictToSequences?: boolean | undefined;
  selectedAssetId?: string | undefined;
  onClear: () => void;
}

function AssetSelectorHeader({ label, restrictToSequences, selectedAssetId, onClear }: HeaderProps) {
  return (
    <div className="flex items-center justify-between h-5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-xs">
          {restrictToSequences ? (
            <Film className="w-2.5 h-2.5 text-accent" />
          ) : (
            <ImageIcon className="w-2.5 h-2.5 text-primary" />
          )}
          <span className="text-[8px] text-white font-black uppercase tracking-widest">{label}</span>
        </div>
      </div>
      {selectedAssetId && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-[2px] text-[6px] font-black uppercase text-red-500 hover:bg-red-500/20 transition-all"
          aria-label="Clear selected asset"
        >
          <Trash2 className="w-2 h-2" />
          Clear Asset
        </button>
      )}
    </div>
  );
}

interface GridItemProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string | undefined;
  ariaLabel: string;
  minHeight?: number | undefined;
}

function GridItem({ children, onClick, className = '', ariaLabel, minHeight = 80 }: GridItemProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-xs border wb-outline bg-black/40 flex flex-col gap-2 items-center justify-center transition-all group ${className}`}
      aria-label={ariaLabel}
      style={{ minHeight: `${minHeight}px` }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <GridItem onClick={onClick} ariaLabel="Go back to parent folder" className="hover:border-primary/40">
      <ChevronLeft className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
      <span className="text-[6px] font-black uppercase tracking-widest text-foreground/40">Back</span>
    </GridItem>
  );
}

function FolderButton({ name, onClick, ariaLabel, minHeight }: { name: string; onClick: () => void; ariaLabel: string; minHeight?: number | undefined }) {
  return (
    <GridItem onClick={onClick} ariaLabel={ariaLabel} className="hover:border-accent/40" minHeight={minHeight}>
      <Folder className="w-5 h-5 text-accent/40 group-hover:text-accent transition-colors" />
      <span className="text-[6px] font-black uppercase tracking-[0.2em] text-foreground/60">
        {name.toUpperCase()}
      </span>
    </GridItem>
  );
}

interface LibraryAssetCellProps {
  item: AssetSelectionMetadata;
  onSelect: (item: AssetSelectionMetadata) => void;
  currentPath: string;
}

function LibraryAssetCell({ item, onSelect, currentPath }: LibraryAssetCellProps) {
  const isSequence = (item.frames as number) > 1 || currentPath.includes('sequences');
  const thumbStyle = isSequence
    ? {
        backgroundImage: `url('${item.path}')`,
        backgroundSize: item.orientation === 'h' ? 'auto 100%' : '100% auto',
        backgroundPosition: (() => {
          const frames = (item.frames as number) || 1;
          const df = (item.defaultFrame as number) || 0;
          const percent = frames > 1 ? (df / (frames - 1)) * 100 : 0;
          return item.orientation === 'h' ? `${percent}% 0%` : `0% ${percent}%`;
        })(),
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100%',
      }
    : {};

  return (
    <GridItem
      onClick={() => onSelect(item)}
      ariaLabel={`Select ${item.name}`}
      className="hover:border-primary/40"
    >
      <div className="w-full flex-1 bg-black/60 rounded-xs flex items-center justify-center overflow-hidden border border-white/5 relative aspect-square">
        {isSequence ? (
          <div style={thumbStyle} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Library thumbnails can be arbitrary imported/static registry assets.
          <img
            src={item.path as string}
            className="w-full h-full p-1 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
            alt={item.name as string}
          />
        )}
        <div className="absolute top-1 right-1 px-1 bg-primary/20 border border-primary/40 rounded-[2px]">
          <span className="text-[4px] font-black text-primary uppercase">LIB</span>
        </div>
      </div>
      <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center mt-1">
        {item.name}
      </span>
    </GridItem>
  );
}

interface ManifestAssetCellProps {
  asset: AssetSelectionMetadata;
  isSelected: boolean;
  onSelect: (assetId: string | undefined) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

function ManifestAssetCell({ asset, isSelected, onSelect, resolveAsset }: ManifestAssetCellProps) {
  return (
    <button
      onClick={() => onSelect(asset.id)}
      className={`p-2 rounded-xs border flex flex-col gap-1 items-center transition-all group overflow-hidden min-h-[80px] ${
        isSelected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline text-foreground/40 hover:border-primary/50'
      }`}
      aria-label={`Select ${asset.id?.split('/').pop() || 'Untitled'}`}
    >
      <div className="w-full flex-1 bg-black/40 rounded-xs flex items-center justify-center overflow-hidden border border-white/5 relative aspect-square">
        <Image
          src={resolveAsset(asset.id) || ''}
          fill
          unoptimized
          className="p-1 object-contain opacity-40 group-hover:opacity-100 transition-opacity"
          alt={asset.id || 'Asset'}
        />
      </div>
      <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center mt-1">
        {asset.id?.split('/').pop() || 'Untitled'}
      </span>
    </button>
  );
}

function EmptyStateGrid() {
  return (
    <div className="col-span-full h-full flex flex-col items-center justify-center py-10 opacity-20">
      <Plus className="w-10 h-10 mb-4" />
      <p className="text-[8px] font-black uppercase tracking-[0.3em]">Drop Assets Here</p>
    </div>
  );
}

function SequenceMetadataPanel() {
  return (
    <div className="p-4 border wb-outline wb-surface-subtle rounded-xs space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 border-b wb-outline pb-2">
        <Film className="w-3 h-3 text-accent" />
        <span className="text-[9px] font-black uppercase text-accent tracking-widest">
          Sequence Metadata Inspector
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">
            Asset Anatomy
          </label>
          <div className="flex wb-surface-inset border wb-outline rounded-xs overflow-hidden h-6 items-center justify-center text-[6px] font-black uppercase tracking-widest text-foreground/20 italic">
            Vertical Strip
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">
            Zero Anchor (Frame)
          </label>
          <div className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text-muted flex justify-between items-center italic">
            <span>0</span>
            <span className="text-[4px] font-black opacity-20">DEFAULT</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[5px] font-bold uppercase wb-text-muted tracking-widest ml-1">
            Value Range / Scale
          </label>
          <div className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text-muted flex justify-between items-center italic">
            <span>0..1</span>
            <span className="text-[4px] font-black opacity-20">NORMALIZED</span>
          </div>
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-[5px] font-mono leading-relaxed text-foreground/30">
          {"// SLAVE_MODE_V2: Logic mapping relative to parent component value."}
          {"// Mapping: frame = zeroAnchor + (value * range)"}
        </p>
      </div>
    </div>
  );
}

// ── Asset Grid ────────────────────────────────────────────────────────

interface AssetGridProps {
  currentPath: string | null;
  isAtRoot: boolean;
  folders: Map<string, AssetSelectionMetadata[]>;
  selectedAssetId?: string | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  onSelect: (assetId: string | undefined, metadata?: AssetSelectionMetadata | undefined) => void;
  onNavigate: (path: string | null) => void;
  onNavigateBack: () => void;
  onLibrarySelect: (item: AssetSelectionMetadata) => Promise<void>;
}

function AssetGrid({
  currentPath,
  isAtRoot,
  folders,
  selectedAssetId,
  resolveAsset,
  onSelect,
  onNavigate,
  onNavigateBack,
  onLibrarySelect,
}: AssetGridProps) {
  const folderKeys = Array.from(folders.keys()).filter(k => k !== 'root' && !k.startsWith('lib:'));
  const currentItems = currentPath ? folders.get(currentPath) : undefined;

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Back button */}
      {!isAtRoot && <BackButton onClick={onNavigateBack} />}

      {/* Root: System Library + folder buttons */}
      {!currentPath && (
        <FolderButton
          name="System Library"
          onClick={() => onNavigate('lib:sequences')}
          ariaLabel="Open system library"
          minHeight={100}
        />
      )}
      {!currentPath &&
        folderKeys.map(folderName => (
          <FolderButton
            key={folderName}
            name={folderName}
            onClick={() => onNavigate(folderName)}
            ariaLabel={`Open folder ${folderName.toUpperCase()}`}
            minHeight={100}
          />
        ))}

      {/* Library items */}
      {currentPath?.startsWith('lib:') &&
        (currentItems || []).map(item => {
          if (item.isFolder) {
            return (
              <FolderButton
                key={item.id}
                name={item.name || ''}
                onClick={() => onNavigate(item.path || null)}
                ariaLabel={`Open folder ${item.name}`}
              />
            );
          }
          return (
            <LibraryAssetCell
              key={item.id}
              item={item}
              onSelect={onLibrarySelect}
              currentPath={currentPath}
            />
          );
        })}

      {/* Local manifest assets */}
      {currentPath && !currentPath.startsWith('lib:') &&
        (currentItems || []).map(asset => (
          <ManifestAssetCell
            key={asset.id}
            asset={asset}
            isSelected={selectedAssetId === asset.id}
            onSelect={onSelect}
            resolveAsset={resolveAsset}
          />
        ))}

      {/* Empty state */}
      {!currentPath && folderKeys.length === 0 && <EmptyStateGrid />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function AssetSelector({
  manifest,
  selectedAssetId,
  onSelect,
  label = 'Branding Asset',
  resolveAsset,
  initialPath,
  restrictToSequences,
}: AssetSelectorProps) {
  const {
    folders,
    currentPath,
    isAtRoot,
    navigateTo,
    navigateBack,
    handleLibrarySelect,
    fileInputRef,
    pendingSequenceFiles,
    setPendingSequenceFiles,
  } = useAssetFileSystem({
    manifest,
    resolveAsset,
    restrictToSequences,
    initialPath,
    onSelect,
  });

  return (
    <div className="space-y-3">
      <AssetSelectorHeader
        label={label}
        restrictToSequences={restrictToSequences}
        selectedAssetId={selectedAssetId}
        onClear={() => onSelect(undefined)}
      />

      <div className="wb-surface-strong border wb-outline rounded-xs p-3 min-h-[240px] max-h-[320px] overflow-y-auto industrial-scrollbar">
        <AssetGrid
          currentPath={currentPath}
          isAtRoot={isAtRoot}
          folders={folders}
          selectedAssetId={selectedAssetId}
          resolveAsset={resolveAsset}
          onSelect={onSelect}
          onNavigate={navigateTo}
          onNavigateBack={navigateBack}
          onLibrarySelect={handleLibrarySelect}
        />
      </div>

      {currentPath?.includes('lib:sequences') && <SequenceMetadataPanel />}

      {pendingSequenceFiles && (
        <SequenceIngestionLab
          files={pendingSequenceFiles}
          onCancel={() => setPendingSequenceFiles(null)}
          onComplete={(blob, metadata) => {
            setPendingSequenceFiles(null);
            const finalFile = new File([blob], `sequence_${Date.now()}.png`, { type: 'image/png' });
            const uploadBridge = (window as unknown as Record<string, UploadBridge>).triggerAssetUpload;
            if (uploadBridge) {
              uploadBridge([finalFile], (assetId: string) => onSelect(assetId, metadata));
            }
          }}
        />
      )}

      {/* Hidden upload bridge for library ingestion */}
      <input
        type="file"
        ref={fileInputRef}
        aria-label="Upload asset file"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setPendingSequenceFiles(Array.from(e.target.files));
          }
        }}
      />
    </div>
  );
}

