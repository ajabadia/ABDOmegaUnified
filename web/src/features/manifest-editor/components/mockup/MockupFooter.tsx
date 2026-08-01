/**
 * @purpose Renderiza un componente de pie de página para el editor de manifesto OMEGA que muestra el estado de gobernanza y la funcionalidad de exportación con indicadores de carga.
 * @purpose_en Renders a footer component for the OMEGA manifest editor that displays governance status and export functionality with loading indicators.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1qt5us4
 * @lastUpdated 2026-06-20T09:42:56.264Z
 */

import { Download, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

interface MockupFooterProps {
  onExport: () => void;
  isExporting: boolean;
  hasCriticalErrors?: boolean;
}

export const MockupFooter = ({ onExport, isExporting, hasCriticalErrors }: MockupFooterProps) => (
  <div className="h-16 border-t wb-outline flex items-center justify-between px-6 wb-surface-subtle">
    <div className="flex items-center gap-4">
      {hasCriticalErrors ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-[7px] font-black uppercase tracking-widest">Governance Violation: Fix Assets</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-3.5 h-3.5 text-[#00ff9d]" />
           <span className="text-[7px] font-black uppercase text-[#00ff9d] tracking-widest">Literal Parity Verified</span>
        </div>
      )}
    </div>

    <button 
      onClick={onExport}
      disabled={isExporting}
      aria-label={isExporting ? 'Processing studio render' : 'Save studio render'}
      className="flex items-center gap-2 px-8 py-2.5 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 shadow-[0_0_20px_var(--wb-bloom)] cursor-pointer"
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>
        {isExporting 
          ? 'Processing 8K Shot...' 
          : 'Save Studio Render'}
      </span>
    </button>
  </div>
);
