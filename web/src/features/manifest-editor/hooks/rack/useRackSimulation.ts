'use client';

/**
 * @purpose Gestiona el ciclo de simulación en tiempo real y la lógica de actividad del contenedor (mapa de calor) para el editor de manifesto OMEGA.
 * @purpose_en Manages the real-time simulation loop and container activity (heatmap) logic for the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:161zkce
 * @lastUpdated 2026-06-15T13:11:24.811Z
 */

import { useState, useEffect, useCallback } from 'react';
import type { ManifestEntity } from '@/omega-ui-core/types/manifest';
import { dryRunLfoRegistry, dryRunActiveSimulations } from '@/features/manifest-editor/hooks/useDryRunSimulation';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

/**
 * useRackSimulation (v7.2.3)
 * Handles the real-time simulation loop and container activity (heatmap) logic.
 */
export const useRackSimulation = (
  allElements: ManifestEntity[], 
  isLiveMode: boolean,
  pushParameterUpdate?: (id: string, value: number) => void
) => {
  const wasmRuntime = getService(SERVICE_TOKENS.WASM_RUNTIME);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, number>>({});
  const [activeContainers, setActiveContainers] = useState<Record<string, number>>({});
  const [activeInjectorPort, setActiveInjectorPort] = useState<string | null>(null);

  // 1. ACTIVITY DECAY (Heatmap)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveContainers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] = Math.max(0, next[id] - 0.1);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 2. REAL-TIME SIMULATION LOOP
  useEffect(() => {
    let rafId: number;
    const updateLoop = () => {
      // Calculate and update LFO values for active dry-run simulations
      const now = Date.now();
      Object.keys(dryRunActiveSimulations).forEach(id => {
        if (dryRunActiveSimulations[id]) {
          const val = 0.5 + 0.5 * Math.sin((now / 1000) * 2 * Math.PI);
          dryRunLfoRegistry[id] = val;
        }
      });

      setRuntimeValues(prev => {
        const next = { ...prev };
        let changed = false;

        // Apply dry run LFO values
        Object.keys(dryRunLfoRegistry).forEach(id => {
          if (next[id] !== dryRunLfoRegistry[id]) {
            next[id] = dryRunLfoRegistry[id];
            changed = true;
          }
        });

        if (isLiveMode) {
          allElements.forEach(entity => {
            if (entity.role === 'telemetry' || entity.role === 'stream') {
              const val = wasmRuntime.getTelemetry(entity.id);
              if (next[entity.id] !== val) {
                next[entity.id] = val;
                changed = true;
              }
              
              const containerId = entity.presentation?.container;
              if (containerId && val > 0.1) {
                setActiveContainers(prevContainers => ({
                  ...prevContainers,
                  [containerId]: Math.max(prevContainers[containerId] || 0, val)
                }));
              }
            }
          });
        }
        return changed ? next : prev;
      });

      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isLiveMode, allElements, wasmRuntime]);

  // 3. PARAMETER UPDATES
  const updateValue = useCallback((id: string, val: number) => {
    const clampedVal = Math.max(0, Math.min(1, parseFloat(val.toFixed(4))));
    setRuntimeValues(prev => ({ ...prev, [id]: clampedVal }));
    
    if (pushParameterUpdate) {
      pushParameterUpdate(id, clampedVal);
    } else {
      wasmRuntime.setParameter(id, clampedVal);
    }

    const element = allElements.find(e => e.id === id);
    const containerId = element?.presentation?.container;
    if (containerId) {
      setActiveContainers(prev => ({ ...prev, [containerId]: 1.0 }));
    }
  }, [allElements, pushParameterUpdate, wasmRuntime]);

  return {
    runtimeValues,
    activeContainers,
    updateValue,
    activeInjectorPort,
    setActiveInjectorPort
  };
};
