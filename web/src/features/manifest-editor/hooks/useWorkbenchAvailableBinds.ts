'use client';

/**
 * @purpose Calcula los binds disponibles desde el contrato OMEGA.
 * @purpose_en Computes available binds from the OMEGA contract.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useMemo } from 'react';
import type { OMEGA_Contract } from '@/omega-ui-core/types/manifest';

export function useWorkbenchAvailableBinds(contract: OMEGA_Contract | null): string[] {
  return useMemo(() => {
    if (!contract) return [];
    return [
      ...(contract.parameters?.map((p: { id: string }) => p.id) || []),
      ...(contract.ports?.map((p: { id: string }) => p.id) || []),
    ];
  }, [contract]);
}
