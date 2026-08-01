'use client';

/**
 * @purpose Gestiona lógica de despliegue para manifestos OMEGA, incluyendo verificaciones de integridad y registro.
 * @purpose_en Manages deployment logic for OMEGA manifests, including integrity checks and logging.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:17jw18y
 * @lastUpdated 2026-06-15T13:12:39.608Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import { toast } from '@/features/manifest-editor/utils/toast';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { ValidationIssue } from '@/types/validation';

interface DeploymentDependencies {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  issues: ValidationIssue[];
  addLog: (msg: string) => void;
  captureStableSnapshot: () => void;
  activeId: string;
  orchestrator: {
    flushPendingHash: (id: string) => Promise<void>;
  };
}

/**
 * OMEGA ERA 7.2.3 - DEPLOYMENT HOOK
 * Handles HIL Bridge injection and integrity synchronization.
 */
export const useDeployment = ({
  manifest,
  contract,
  issues,
  addLog,
  captureStableSnapshot,
  activeId,
  orchestrator
}: DeploymentDependencies) => {
  const handleDeploy = useCallback(async () => {
    if (issues.length > 0) {
      addLog(`[WARNING] Deployment blocked by ${issues.length} audit violations.`);
      toast.warning(`Deployment blocked by ${issues.length} audit violation(s)`);
      return 'AUDIT_FAIL';
    }

    addLog(`[SYSTEM] HIL Bridge: Initiating direct injection...`);
    
    // Ensure orchestrator is synchronized (RISK-002 Fix)
    await orchestrator.flushPendingHash(activeId);

    addLog(`[SYSTEM] Target ID: ${manifest.id}`);
    
    try {
      // Dynamic imports for heavy services
      const { wasmRuntime } = await import('@/services/wasmRuntime');
      const { IntegrityService } = await import('@/services/integrityService');
      
      const hashAtStart = await IntegrityService.generateManifestHash(manifest);

      // 1. Coherence Check (Safety Lock)
      const firmwareHash = contract && 'firmwareHash' in contract ? (contract as OmegaContract).firmwareHash : undefined;
      
      if (firmwareHash && hashAtStart !== firmwareHash) {
        addLog(`[CRITICAL] Coherence Failure: Manifest Hash (${hashAtStart.slice(0, 8)}) mismatch with Binary Hash (${firmwareHash.slice(0, 8)}).`);
        const proceed = confirm("FIRMWARE_MISMATCH: The manifest structure has changed and no longer matches the loaded binary. This will cause simulation errors. Proceed anyway?");
        if (!proceed) {
          addLog(`[ABORT] Deployment cancelled by engineer due to integrity failure.`);
          return;
        }
      }

      const result = await wasmRuntime.deployManifest(manifest);
      
      if (result.success) {
        toast.success('Deployment successful');
        addLog(`[SUCCESS] Hot-Swap injection complete.`);
        addLog(`[SYSTEM] Engine Fingerprint: ${hashAtStart.slice(0, 16)}...`);
        addLog(`[SYSTEM] Simulation synchronized.`);

        // Race Condition Protection (Adjustment 3)
        const hashNow = await IntegrityService.generateManifestHash(manifest);
        if (hashNow === hashAtStart) {
          captureStableSnapshot();
        } else {
          addLog(`[SYSTEM] Local changes detected during deployment. Maintaining Dirty state.`);
        }
      }
    } catch (err) {
      addLog(`[CRITICAL] Deployment failed: ${err}`);
      toast.error(`Deployment failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addLog, manifest, issues, contract, captureStableSnapshot, activeId, orchestrator]);

  return { handleDeploy };
};
