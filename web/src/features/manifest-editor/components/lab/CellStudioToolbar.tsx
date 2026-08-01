'use client';

/**
 * @purpose Renderiza una barra de herramientas para gestionar y navegar a través de diferentes pestañas y pasos en el componente CellStudio del editor de manifesto OMEGA.
 * @purpose_en Renders a toolbar for managing and navigating through different tabs and steps in the CellStudio component of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:dp885u
 * @lastUpdated 2026-06-20T09:18:55.791Z
 */

import React from 'react';
import { Layers, Activity, Settings2 } from 'lucide-react';
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';
import type { ManifestEntity } from '@/omega-ui-core/types/manifest';

interface CellStudioToolbarProps {
  cellData: ManifestEntity;
  activeTab: string;
  currentStep: number;
  isTypeLocked: boolean;
  isCommandCenterOpen: boolean;
  isStepperMode: boolean;
  setCellData: (data: ManifestEntity) => void;
  setActiveTab: (tab: 'fragments' | 'behavior' | 'recipes' | 'properties') => void;
  setCurrentStep: (step: 0 | 1 | 2 | 3) => void;
  setIsCommandCenterOpen: (open: boolean) => void;
  STEPS: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; tab: string }>;
}

/**
 * CellStudioToolbar — Barra superior con nombre, selector de tipo, modo e indicador de paso/tab.
 * Extraído de CellStudioContainer.tsx.
 */
export function CellStudioToolbar({
  cellData,
  activeTab,
  currentStep,
  isTypeLocked,
  isCommandCenterOpen,
  isStepperMode,
  setCellData,
  setActiveTab,
  setCurrentStep,
  setIsCommandCenterOpen,
  STEPS
}: CellStudioToolbarProps) {
  return (
    <div className="p-6 border-b wb-outline wb-surface-subtle flex items-center justify-between gap-8 shrink-0">
      <div className="flex-1 space-y-4">
        <input
          type="text" value={cellData.label || ''}
          aria-label="Cell identity label"
          onChange={(e) => setCellData({ ...cellData, label: e.target.value })}
          className="bg-transparent text-xl font-black uppercase tracking-tighter wb-text outline-none w-full border-b border-transparent focus:border-accent/40 placeholder:opacity-20"
          placeholder="CELL IDENTITY NAME"
        />
        <div className="flex items-center gap-4">
          <div className="w-64">
            <span className="text-[7px] font-black uppercase tracking-widest wb-text-muted block mb-1">Component Type</span>
            <select
              disabled={isTypeLocked} value={cellData.type}
              onChange={(e) => setCellData({ ...cellData, type: e.target.value })}
              className="w-full wb-surface-subtle border wb-outline rounded-xs p-1.5 text-[8px] font-black uppercase text-accent outline-none focus:border-accent/40"
            >
              {['signal', 'io', 'telemetry', 'mechanical', 'infrastructure', 'rack', 'decor'].map(cat => (
                <optgroup key={cat} label={cat.toUpperCase()} className="bg-background text-foreground/45">
                  {OMEGA_ELEMENT_CATALOG.filter(e => e.category === cat).map(el => (
                    <option key={el.id} value={el.id} className="bg-surface wb-text">{el.icon} {el.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`px-3 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest border ${
        isStepperMode
          ? 'bg-accent/10 border-accent/30 text-accent'
          : 'wb-surface-subtle border-outline/40 wb-text-muted'
      }`}>
        {isStepperMode ? 'STEPPER' : 'TABS'} MODE
      </div>

      {isStepperMode ? (
        <div className="flex items-center gap-2" role="navigation" aria-label="Cell creation workflow">
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => {
                  if (i < 0 || i > 3) return;
                  setCurrentStep(i as 0 | 1 | 2 | 3);
                  setActiveTab(step.tab as 'fragments' | 'behavior' | 'recipes' | 'properties');
                }}
                disabled={i > currentStep}
                aria-current={i === currentStep ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${step.label}`}
                title={`Step ${i + 1}: ${step.label}`}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-[7px] font-black uppercase tracking-wider
                  transition-all duration-200
                  ${i === currentStep
                    ? 'bg-accent text-black shadow-none'
                    : i < currentStep
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'wb-text-muted border border-transparent hover:border-outline/40'
                  }
                  ${i > currentStep ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <step.icon className="w-3 h-3" />
                {step.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2 pl-2 border-l wb-outline">
            <button
              onClick={() => {
                const prev = Math.max(0, currentStep - 1) as 0 | 1 | 2 | 3;
                setCurrentStep(prev);
                setActiveTab(STEPS[prev].tab as 'fragments' | 'behavior' | 'recipes' | 'properties');
              }}
              disabled={currentStep === 0}
              title="Previous step"
              className="px-2 py-1.5 rounded-xs text-[7px] font-black uppercase wb-text-muted hover:wb-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                const next = Math.min(3, currentStep + 1) as 0 | 1 | 2 | 3;
                setCurrentStep(next);
                setActiveTab(STEPS[next].tab as 'fragments' | 'behavior' | 'recipes' | 'properties');
              }}
              disabled={currentStep === 3}
              title="Next step"
              className="px-2 py-1.5 rounded-xs text-[7px] font-black uppercase bg-accent text-black hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 wb-surface p-1 rounded-xs border wb-outline">
          {[
            { id: 'fragments', icon: Layers, label: 'Parts' },
            { id: 'behavior', icon: Activity, label: 'Behavior' },
            { id: 'recipes', icon: Layers, label: 'Layers' },
            { id: 'properties', icon: Settings2, label: 'Properties' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as 'fragments' | 'behavior' | 'recipes' | 'properties'); setIsCommandCenterOpen(false); }}
              aria-label={`Tab: ${t.label}`}
              title={`Tab: ${t.label}`}
              className={`px-4 py-1.5 rounded-xs text-[8px] font-black uppercase transition-all ${activeTab === t.id && !isCommandCenterOpen ? 'bg-accent text-black shadow-none' : 'wb-text-muted hover:wb-text hover:bg-accent/5'}`}
            >
              <t.icon className="w-3 h-3 inline-block mr-2" /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
