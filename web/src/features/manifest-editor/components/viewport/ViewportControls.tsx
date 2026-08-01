'use client';

/**
 * @purpose Renderiza una barra de herramientas flotante para la navegación del viewport en el editor de manifesto OMEGA, incluyendo controles de zoom, botones de panning, ajuste a pantalla y bastidores.
 * @purpose_en Renders a floating toolbar for viewport navigation in the OMEGA manifest editor, including zoom controls, pan buttons, fit to screen, and rack view rulers.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:ksoqc2
 * @lastUpdated 2026-06-15T13:01:49.420Z
 */

import { Plus, Minus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, Target, Ruler } from 'lucide-react';

interface ViewportControlsProps {
  zoom: number;
  onZoom: (delta: number) => void;
  onPan: (dx: number, dy: number) => void;
  onReset: () => void;
  onFit: () => void;

  onToggleRulers?: (() => void) | undefined;
  rulersVisible?: boolean | undefined;
  viewMode?: string | undefined;
  isLiveMode?: boolean;
}

/**
 * ViewportControls
 * Industrial floating toolbar for viewport navigation.
 */
export default function ViewportControls({ zoom, onZoom, onPan, onReset, onFit, onToggleRulers, rulersVisible, viewMode, isLiveMode }: ViewportControlsProps) {
  const isRackView = viewMode === 'rack';
  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
      {/* ZOOM GROUP */}
      <div className="flex items-center wb-surface backdrop-blur-md border wb-outline rounded-xs p-1 shadow-2xl transition-colors duration-500">
        <button 
          onClick={() => onZoom(-0.1)} 
          className="p-1.5 hover:bg-primary/10 text-primary/60 hover:text-primary transition-all rounded-xs"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="px-4 min-w-[60px] text-center border-x wb-outline">
          <span className="text-[10px] font-mono font-black text-primary">{Math.round(zoom * 100)}%</span>
        </div>
        <button 
          onClick={() => onZoom(0.1)} 
          className="p-1.5 hover:bg-primary/10 text-primary/60 hover:text-primary transition-all rounded-xs"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* PAN & CENTER GROUP */}
      <div className="flex items-center wb-surface backdrop-blur-md border wb-outline rounded-xs p-1 shadow-2xl transition-colors duration-500">
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <div />
          <button onClick={() => onPan(0, 50)} className="p-1.5 hover:bg-primary/10 wb-text-muted hover:text-primary transition-all rounded-xs" title="Pan Up">
            <ChevronUp className="w-4 h-4" />
          </button>
          <div />
          
          <button onClick={() => onPan(50, 0)} className="p-1.5 hover:bg-primary/10 wb-text-muted hover:text-primary transition-all rounded-xs" title="Pan Left">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={onReset} className="p-1.5 hover:bg-primary/10 text-primary transition-all rounded-xs shadow-[0_0_10px_rgba(0,240,255,0.2)]" title="Center View">
            <Target className="w-4 h-4" />
          </button>
          <button onClick={() => onPan(-50, 0)} className="p-1.5 hover:bg-primary/10 wb-text-muted hover:text-primary transition-all rounded-xs" title="Pan Right">
            <ChevronRight className="w-4 h-4" />
          </button>

          <div />
          <button onClick={() => onPan(0, -50)} className="p-1.5 hover:bg-primary/10 wb-text-muted hover:text-primary transition-all rounded-xs" title="Pan Down">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={onFit} className="p-1.5 hover:bg-accent/10 text-accent transition-all rounded-xs" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RULERS GROUP — only in rack view, hidden in live mode */}
      {isRackView && !isLiveMode && onToggleRulers && (
        <div className="flex items-center wb-surface backdrop-blur-md border wb-outline rounded-xs p-1 shadow-2xl transition-colors duration-500">
          <button
            onClick={onToggleRulers}
            className={`p-1.5 transition-all rounded-xs ${rulersVisible ? 'bg-primary/20 text-primary shadow-[0_0_8px_rgba(255,210,0,0.3)]' : 'hover:bg-primary/10 wb-text-muted hover:text-primary'}`}
            title="Toggle Rulers & Guides"
          >
            <Ruler className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
