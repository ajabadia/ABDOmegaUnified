'use client';

/**
 * @purpose Renderiza un panel que muestra información sobre el elemento seleccionado actualmente en el editor de manifesto OMEGA, incluyendo diagnósticos y estado del motor en vivo.
 * @purpose_en Renders a panel displaying information about the currently selected element in the OMEGA manifest editor, including diagnostics and live engine status.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:c2m2iz
 * @lastUpdated 2026-06-15T11:37:49.334Z
 */

import { Crosshair, Monitor } from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Contract, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import DiagnosticBlock from '../DiagnosticBlock';

interface SelectedInfo {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DockInfoPanelProps {
  selectedItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  selectedItemId: string | null;
  contract: OMEGA_Contract | null;
  isLiveMode: boolean;
  uiTheme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';
}

/**
 * DockInfoPanel — Panel de información del elemento seleccionado.
 * Incluye diagnóstico de sync status y estado del live engine.
 * Extraído de RightDockContainer.tsx para aislar la lógica de selección e info.
 */
export function DockInfoPanel({
  selectedItem,
  selectedItemId,
  contract,
  isLiveMode,
  uiTheme
}: DockInfoPanelProps) {
  const getSelectedInfo = (): SelectedInfo | null => {
    if (!selectedItem) return null;

    if ('metadata' in selectedItem && 'resources' in selectedItem) {
      const m = selectedItem as OMEGA_Manifest;
      return {
        id: m.id || 'Manifest',
        type: 'Manifest',
        label: m.metadata?.name || 'Root Manifest',
        x: 0, y: 0, width: 0, height: 0,
      };
    }

    if ('kind' in selectedItem) {
      const node = selectedItem as OmegaNode;
      return {
        id: node.id,
        type: node.kind || node.role || 'Node',
        label: node.id || 'Node',
        x: node.layout?.pos?.x ?? 0,
        y: node.layout?.pos?.y ?? 0,
        width: node.layout?.size?.width ?? 0,
        height: node.layout?.size?.height ?? 0,
      };
    }

    const entity = selectedItem as ManifestEntity;
    return {
      id: entity.id,
      type: entity.category || entity.type || 'Entity',
      label: entity.label || entity.name || 'None',
      x: entity.pos?.x ?? 0,
      y: entity.pos?.y ?? 0,
      width: entity.size?.width ?? 0,
      height: entity.size?.height ?? 0,
    };
  };

  const selectedInfo = getSelectedInfo();

  return (
    <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-2 wb-surface-subtle text-[10px] font-mono uppercase tracking-wider wb-text-muted select-text">
      {selectedInfo ? (
        <>
          <div className="flex items-center gap-1.5 text-primary font-bold">
            <Crosshair className="w-3 h-3" />
            <span>Entity: {selectedInfo.id}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 border-t wb-outline pt-1.5 col-span-2">
            <div>Type: <span className="text-foreground">{selectedInfo.type || 'Jack'}</span></div>
            <div>Label: <span className="text-foreground">{selectedInfo.label || 'None'}</span></div>
            <div>Pos X: <span className="text-foreground">{selectedInfo.x || 0}px</span></div>
            <div>Pos Y: <span className="text-foreground">{selectedInfo.y || 0}px</span></div>
            <div>Width: <span className="text-foreground">{selectedInfo.width || 0}px</span></div>
            <div>Height: <span className="text-foreground">{selectedInfo.height || 0}px</span></div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1.5 text-foreground/35">
          <Monitor className="w-3 h-3" />
          <span>No item selected</span>
        </div>
      )}
      <div className="my-2 border-t wb-outline pt-2">
        <DiagnosticBlock
          title="OMEGA Sync Status"
          signals={[
            { id: 'rpc', label: 'RPC Latency', value: '1.2ms', status: 'ok', icon: 'activity' },
            { id: 'hpa', label: 'HPA Path', value: selectedItemId || 'root', icon: 'power' },
            { id: 'dirty', label: 'Dirty State', value: 'CLEAN', status: 'ok' },
            {
              id: 'lock', label: 'Write Lock',
              value: contract ? 'LOCKED' : 'AVAILABLE',
              status: contract ? 'warn' : 'ok',
              icon: 'security'
            }
          ]}
        />
      </div>
      <div className="border-t wb-outline pt-2 mt-auto grid grid-cols-2 gap-x-4 shrink-0">
        <div>Live Engine: <span className={isLiveMode ? 'text-accent' : 'text-red-500'}>{isLiveMode ? 'Online' : 'Offline'}</span></div>
        <div>Theme: <span className="text-foreground">{uiTheme}</span></div>
      </div>
    </div>
  );
}


