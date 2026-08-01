'use client';

/**
 * @purpose Renderiza un resumen detallado de los resultados del auditoría de una manifestación OMEGA, incluyendo puntuación de calidad, estado de cumplimiento y métricas relevantes.
 * @purpose_en Renders a detailed summary of an OMEGA manifest's audit results, including quality score, compliance status, and relevant metrics.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:5,sig:144wxsa
 * @lastUpdated 2026-06-15T10:53:13.970Z
 */


import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Activity, Layers, Terminal, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

interface AuditStatusConfig {
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  label: string;
}

interface AuditSummaryProps {
  audit: AuditResult;
  manifest: OMEGA_Manifest;
  statusConfig: AuditStatusConfig;
}

export default function AuditSummary({ audit, manifest, statusConfig }: AuditSummaryProps) {
  return (
    <div className="w-80 shrink-0 space-y-8">
      {/* SCORE GAUGE */}
      <div className="p-8 bg-black/40 border border-white/5 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 text-[8px] font-black text-white/10 uppercase tracking-widest">Quality Score</div>
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <span className={`text-6xl font-black font-mono ${statusConfig.color}`}>{audit.score}</span>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${audit.score}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${statusConfig.color.replace('text-', 'bg-')}`} 
            />
          </div>
        </div>
        <p className="text-[7px] text-center font-bold wb-text-muted uppercase tracking-[0.2em] leading-relaxed">
          Calculated based on 47 weighted engineering parameters including spatial density and governance roles.
        </p>
      </div>

      {/* COMPLIANCE MATRIX */}
      <div className="space-y-3">
        <h3 className="text-[9px] font-black uppercase tracking-widest wb-text-muted px-1">Compliance Matrix</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Governance', val: audit.checks.governance, icon: ShieldCheck },
            { label: 'Integrity', val: audit.checks.integrity, icon: Layers },
            { label: 'Technical', val: audit.checks.technical, icon: Terminal },
            { label: 'Aesthetic', val: audit.checks.aesthetic, icon: Activity }
          ].map(c => (
            <div key={c.label} className={`p-4 border rounded-xs flex flex-col gap-3 transition-all ${c.val ? 'border-[#00ff9d]/20 bg-[#00ff9d]/5 text-[#00ff9d]' : 'border-red-500/20 bg-red-500/5 text-red-500'}`}>
               <div className="flex justify-between items-start">
                 <c.icon className="w-4 h-4 opacity-60" />
                 {c.val ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* METRICS */}
      <div className="p-5 bg-black/60 border border-white/5 rounded-sm space-y-6 relative overflow-hidden group">
         <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
            <ShieldCheck className="w-24 h-24 text-[#00ff9d]" />
         </div>

         <div className="space-y-4 relative z-10">
           <div className="space-y-1">
              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Metadata Density</span>
              <div className="flex justify-between text-[10px] font-mono font-black wb-text">
                <span>{manifest.metadata?.name || 'NOT_SET'}</span>
                <span className="text-primary">{manifest.metadata?.rack?.width || 12}HP</span>
              </div>
           </div>
           
           <div className="h-px bg-white/5" />

           <div className="space-y-1">
              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">WASM Runtime Sync</span>
              <div className="flex justify-between text-[10px] font-mono font-black wb-text">
                <span>{audit.isHashMatched ? 'COHERENT' : 'DEGRADED'}</span>
                <span className={audit.isHashMatched ? 'text-[#00ff9d]' : 'text-red-500'}>
                  {audit.fingerprint?.slice(0, 8) || 'NONE'}
                </span>
              </div>
           </div>
         </div>

         {/* CERTIFICATION SEAL */}
         <div className="pt-4 border-t border-white/5">
            <div className={`p-3 rounded-xs border flex items-center justify-center gap-3 transition-all ${audit.isCompliant ? 'border-[#00ff9d]/30 bg-[#00ff9d]/5' : 'border-red-500/30 bg-red-500/5'}`}>
               <ShieldCheck className={`w-4 h-4 ${audit.isCompliant ? 'text-[#00ff9d]' : 'text-red-500'}`} />
               <div className="flex flex-col">
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${audit.isCompliant ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {audit.isCompliant ? 'OMEGA_CERTIFIED' : 'CERTIFICATION_DENIED'}
                  </span>
                  <span className="text-[6px] font-mono text-white/30 uppercase tracking-widest">Aseptic Standard V7.2.3</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
