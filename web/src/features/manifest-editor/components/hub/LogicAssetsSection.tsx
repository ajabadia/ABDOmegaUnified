'use client';

/**
 * @purpose Gestiona una sección para gestionar activos lógicos en el editor de manifesto OMEGA, incluyendo botones para subir diferentes tipos de activos y mostrar información de contrato.
 * @purpose_en Manages a section for managing logical assets in the OMEGA manifest editor, including buttons for uploading different types of assets and displaying contract information.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:1fv5ms8
 * @lastUpdated 2026-06-17T22:30:31.901Z
 */

import React from 'react';
import { FolderOpen, ChevronRight, Zap, Database, Palette, CheckCircle, AlertTriangle } from 'lucide-react';

import type { OMEGA_Manifest } from '@/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';

interface LogicAssetsSectionProps {
  manifest: OMEGA_Manifest;
  contract: OmegaContract | null;
  triggerUpload: (id: string) => void;
}

export default function LogicAssetsSection({ manifest, contract, triggerUpload }: LogicAssetsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="text-[9px] font-black wb-text-muted uppercase tracking-widest flex justify-between items-center">
        <span>Logic Assets</span>
        {contract ? (
          <div className="flex items-center gap-1 text-green-400">
             <CheckCircle className="w-2.5 h-2.5" />
             <span className="text-[7px]">SYS_READY</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-500">
             <AlertTriangle className="w-2.5 h-2.5" />
             <span className="text-[7px]">MISSING_CONTRACT</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <button 
          onClick={() => triggerUpload('folder-upload')} 
          aria-label="Ingest module folder"
          className="w-full flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-sm hover:bg-primary/20 transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <FolderOpen className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="block text-[9px] font-black uppercase tracking-widest text-primary">Ingest Module Folder</span>
              <span className="block text-[6px] font-bold text-primary/80 uppercase">Auto-discovery & Sync</span>
            </div>
          </div>
          <ChevronRight className="w-3 h-3 text-primary/60" />
        </button>

        <div className="grid grid-cols-3 gap-2">
          <AssetButton onClick={() => triggerUpload('bulk-upload')} icon={Zap} label="WASM" color="primary" active={!!manifest.resources?.wasm} />
          <AssetButton onClick={() => triggerUpload('bulk-upload')} icon={Database} label="CONTRACT" color="accent" active={!!contract} />
          <AssetButton onClick={() => triggerUpload('bulk-upload')} icon={Palette} label="ACEMM" color="cyan-400" active={!!manifest.schemaVersion} />
        </div>
      </div>
      
      {contract && (
        <div className="p-2.5 bg-black/5 border wb-outline rounded-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[7px] wb-text-muted font-bold uppercase">Target ID</span>
            <span className="text-[8px] text-primary font-mono font-black">{contract.id}</span>
          </div>
          <div className="h-[1px] bg-outline/5 w-full" />
          <div className="flex justify-between items-center">
            <span className="text-[7px] wb-text-muted font-bold uppercase">CONTRACT Ports</span>
            <span className="text-[8px] wb-text font-black">{contract.parameters?.length || 0}P / {contract.ports?.length || 0}S</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface AssetButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  color: string;
  active: boolean;
}

function AssetButton({ onClick, icon: Icon, label, color, active }: AssetButtonProps) {
  const borderClass = color === 'primary' ? 'hover:border-primary/40 hover:bg-primary/5' : color === 'accent' ? 'hover:border-accent/40 hover:bg-accent/5' : 'hover:border-cyan-400/40 hover:bg-cyan-400/5';
  const iconClass = color === 'primary' ? 'text-primary' : color === 'accent' ? 'text-accent' : 'text-cyan-400';
  const indicatorClass = color === 'primary' ? 'bg-primary/20' : color === 'accent' ? 'bg-accent/20' : 'bg-cyan-400/20';

  return (
    <button onClick={onClick} title={`Upload ${label}`} aria-label={`Upload ${label}`} className={`flex flex-col items-center justify-center gap-1.5 p-3 wb-surface border wb-outline rounded-sm transition-all group relative overflow-hidden ${borderClass}`}>
      <Icon className={`w-3 h-3 ${iconClass} group-hover:scale-125 transition-transform`} />
      <span className="text-[7px] font-bold uppercase tracking-tighter wb-text-muted">{label}</span>
      {active && <div className={`absolute top-0 right-0 w-1 h-full ${indicatorClass}`} />}
    </button>
  );
}
