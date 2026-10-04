'use client';

/**
 * @purpose Renderiza los controles del sistema en el lado derecho del Header: ComplianceBadge, ThemeSelector y SimulationStatusBadge.
 * @purpose_en Renders system controls on the right side of the Header: ComplianceBadge, ThemeSelector, and SimulationStatusBadge.
 * @classification UI Component
 * @complexity Low
 */

import type { AuditResult } from '@/omega-ui-core/types/audit';
import { ComplianceBadge } from '../shared/ComplianceBadge';
import ThemeSelector from '../header/ThemeToggle';
import { SimulationStatusBadge } from '@/features/manifest-editor/components/header/SimulationStatusBadge';
import type { SimulationBridgeState } from '@/features/manifest-editor/hooks/useSimulationBridge';

export interface SystemControlsProps {
  audit: AuditResult;
  onOpenAudit: () => void;
  uiTheme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';
  setUiTheme: (theme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast') => void;
  simulationBridge?: SimulationBridgeState;
}

export default function SystemControls({
  audit,
  onOpenAudit,
  uiTheme,
  setUiTheme,
  simulationBridge,
}: SystemControlsProps) {
  return (
    <>
      <div>
        <ComplianceBadge audit={audit} onClick={onOpenAudit} />
      </div>
      <div className="h-6 w-px wb-outline opacity-20 mx-1" />
      <ThemeSelector uiTheme={uiTheme} setUiTheme={setUiTheme} />

      {simulationBridge && (
        <SimulationStatusBadge 
          status={simulationBridge.status}
          lastSyncAt={simulationBridge.lastSuccessfulSyncAt}
          onForceResync={simulationBridge.forceResync}
        />
      )}
    </>
  );
}
