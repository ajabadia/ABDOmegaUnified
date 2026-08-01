/**
 * @purpose Gestiona auditoría en tiempo real y firmado criptográfico para manifestos OMEGA utilizando AuditService y IntegrityService.
 * @purpose_en Manages real-time manifest auditing and cryptographic fingerprinting for OMEGA manifests using AuditService and IntegrityService.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:y36kqo
 * @lastUpdated 2026-06-15T13:11:50.017Z
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import { AuditService } from '@/services/auditService';
import type { OmegaContract } from '@/omega-ui-core/types/contract';

/**
 * useAudit (v7.2.3)
 * Manages real-time manifest auditing and cryptographic fingerprinting.
 */
export const useAudit = (manifest: OMEGA_Manifest, contract: (OmegaContract | OMEGA_Contract) | null) => {
  const [fingerprint, setFingerprint] = useState<string>('');

  const auditResult = useMemo(() => {
    const res = AuditService.performFullAudit(manifest, contract);
    return { 
      ...res, 
      fingerprint, 
      isHashMatched: contract && 'firmwareHash' in contract ? fingerprint === contract.firmwareHash : false
    };
  }, [manifest, fingerprint, contract]);

  const lastHashRef = useRef<string>('');

  useEffect(() => {
    const updateHash = async () => {
      const { IntegrityService } = await import('@/services/integrityService');
      const hash = await IntegrityService.generateManifestHash(manifest);
      if (hash !== lastHashRef.current) {
        lastHashRef.current = hash;
        setFingerprint(hash);
      }
    };
    updateHash();
  }, [manifest]);

  return {
    auditResult,
    fingerprint
  };
};
