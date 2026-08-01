'use client';

/**
 * @purpose Renderiza un grupo de botones para seleccionar estrategias de ajuste en el editor de manifesto OMEGA, permitiendo a los usuarios elegir cómo se deben redimensionar y posicionar elementos multimedia dentro de sus contenedores.
 * @purpose_en Renders a group of buttons for selecting fitting strategies in an OMEGA manifest editor, allowing users to choose how multimedia elements should be resized and positioned within their containers.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1qckwc6
 * @lastUpdated 2026-06-20T09:17:19.521Z
 */

import { Maximize2, Minimize2, Move, LayoutGrid, Square } from 'lucide-react';

import type { OmegaStyleNode } from '@/types/manifest';

interface FittingGovernanceProps {
  value?: OmegaStyleNode['fitting'];
  onChange: (value: NonNullable<OmegaStyleNode['fitting']>) => void;
}

export default function FittingGovernance({ value, onChange }: FittingGovernanceProps) {
  const options = [
    { id: 'stretch', label: 'Stretch', icon: Maximize2, desc: 'Fill container' },
    { id: 'cover', label: 'Cover', icon: Square, desc: 'Zoom to fill' },
    { id: 'contain', label: 'Contain', icon: Minimize2, desc: 'Fit inside' },
    { id: 'tile', label: 'Tile', icon: LayoutGrid, desc: 'Repeat pattern' },
    { id: 'center', label: 'Center', icon: Move, desc: 'True center' },
  ];

  return (
    <div className="space-y-2">
      <span className="text-[7px] font-black uppercase text-primary/60 tracking-widest">Fitting Strategy</span>
      <div className="grid grid-cols-5 gap-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.id || (!value && opt.id === 'stretch');
          
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id as NonNullable<OmegaStyleNode['fitting']>)}
              aria-label={`Fitting: ${opt.label}`}
              className={`
                flex flex-col items-center justify-center p-2 rounded-xs border transition-all group
                ${isActive 
                  ? 'bg-primary/20 border-primary/40 text-primary' 
                  : 'bg-black/40 border-outline/10 text-foreground/40 hover:border-primary/20'}
              `}
              title={opt.desc}
            >
              <Icon className={`w-3.5 h-3.5 mb-1 ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />
              <span className="text-[5px] font-black uppercase tracking-tighter">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
