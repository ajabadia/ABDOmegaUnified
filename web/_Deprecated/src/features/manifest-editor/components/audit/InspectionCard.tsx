'use client';

/**
 * @purpose Gestiona un componente UI reutilizable para mostrar problemas diagnósticos en un editor de manifesto OMEGA con recomendaciones técnicas y opciones de navegación.
 * @purpose_en Manages a reusable UI component for displaying diagnostic issues in an OMEGA manifest editor with technical recommendations and navigation options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:s6w47q
 * @lastUpdated 2026-06-17T22:29:54.969Z
 */


import { motion } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, ShieldX, 
  Info, ArrowRight, Zap, Target, Layout
} from 'lucide-react';
import type { Diagnostic } from '@/omega-ui-core/types/audit';

interface InspectionCardProps {
  issue: Diagnostic;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export default function InspectionCard({ issue, onNavigate, onClose }: InspectionCardProps) {
  const isCritical = issue.severity === 'error';
  const isAudit = issue.severity === 'audit';
  
  const getRecommendation = (keyword: string) => {
    const recommendations: Record<string, string> = {
      era7_style: "Adjust the HP to an even number to ensure standard Eurorack alignment and industrial symmetry.",
      era7_identity: "Each entity must have a unique ID. Check for duplicate controls or jacks in the manifest logic.",
      era7_alignment: "Standardize positions to multiples of 5px. Use the grid snapping tool or manual coordinate entry.",
      era7_port_norm: "Follow the OMEGA color standard: Cyan for Audio/CV, Amber for Mod, White for Gate, Orange for MIDI.",
      era7_ux: "Provide physical units (Hz, dB, ms, semi, %) to ensure clarity for the end user in telemetry displays.",
      era7_integrity: "The component is outside the front panel. Check X/Y coordinates against the total HP width.",
      era7_binding: "The 'bind' key refers to a non-existent parameter in the WASM contract. Verify the contract.json exports.",
      era7_collision: "Increase the distance between these components to prevent overlap and ensure ergonomic clearance.",
      era7_ux_context: "The unit used does not match the parameter's semantic context. Use Hz for frequencies or semi for pitch."
    };
    return recommendations[keyword] || "Review the technical specification v7.2.3 for compliance details.";
  };

  const getCategory = (keyword: string) => {
    if (keyword === 'era7_identity' || keyword === 'era7_binding') return { label: 'Technical', icon: Zap, color: 'text-blue-400' };
    if (keyword === 'era7_integrity' || keyword === 'era7_collision' || keyword === 'era7_alignment') return { label: 'Spatial', icon: Layout, color: 'text-purple-400' };
    if (keyword === 'era7_style' || keyword === 'era7_port_norm' || keyword === 'era7_ux' || keyword === 'era7_ux_context') return { label: 'Governance', icon: ShieldCheck, color: 'text-[#00ff9d]' };
    return { label: 'Compliance', icon: Info, color: 'text-amber-400' };
  };

  const category = getCategory(issue.keyword || '');
  const recommendation = getRecommendation(issue.keyword || '');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 border rounded-sm transition-all group relative overflow-hidden ${
        isCritical ? 'border-red-500/20 bg-red-500/2' : 
        isAudit ? 'border-amber-500/20 bg-amber-500/2' : 'border-white/5 bg-black/40'
      }`}
    >
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
         <category.icon className="w-16 h-16" />
      </div>

      <div className="flex gap-4 relative z-10">
        <div className={`mt-1 shrink-0 ${isCritical ? 'text-red-500' : isAudit ? 'text-amber-500' : 'text-blue-400'}`}>
           {isCritical ? <ShieldX className="w-5 h-5" /> : isAudit ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black uppercase tracking-widest ${category.color}`}>
                <category.icon className="w-3 h-3" />
                {category.label}
              </div>
              <span className="text-[8px] font-mono wb-text-muted bg-white/5 px-2 py-0.5 rounded-full">{issue.path || 'structural'}</span>
            </div>
            <h4 className="text-xs font-bold text-white/90 leading-relaxed">{issue.message}</h4>
          </div>

          <div className="p-3 bg-black/40 border border-white/5 rounded-xs space-y-2">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary/60">
              <Target className="w-3 h-3" />
              Technical Recommendation
            </div>
            <p className="text-[10px] text-white/40 font-medium italic leading-relaxed">
              &quot;{recommendation}&quot;
            </p>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={() => {
                onNavigate(issue.path || '');
                onClose();
              }}
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors group/btn"
              aria-label={`Locate in workbench: ${issue.message}`}
            >
              Locate in Workbench
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
