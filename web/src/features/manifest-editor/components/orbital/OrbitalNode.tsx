'use client';

/**
 * @purpose Renderiza un nodo en una disposición orbital para el editor de manifesto OMEGA, gestionando selecciones, auditorías y mostrando líneas de conexión y herramientas de ayuda.
 * @purpose_en Renders a node in an orbital layout for the OMEGA manifest editor, handling selections, audits, and displaying connection lines and help tools.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1u21lec
 * @lastUpdated 2026-06-15T12:59:14.662Z
 */

import { motion } from 'framer-motion';
import { IntegrityOverlay } from '@/omega-ui-core/renderers/components/IntegrityOverlay';
import type { OmegaNode, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';
import type { AuditResult } from '@/omega-ui-core/types/audit';

interface OrbitalNodeProps {
  item: OmegaNode;
  index: number;
  total: number;
  contract: (OmegaContract | OMEGA_Contract) | null;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
  audit: AuditResult;
  isV7: boolean;
}

export function OrbitalNode({ 
  item, 
  index, 
  total, 
  contract, 
  selectedItemId, 
  onSelectItem, 
  multiSelectedIds,
  onSelectMultiple,
  audit,
  isV7
}: OrbitalNodeProps) {
  const angle = (index / total) * (2 * Math.PI);
  const radius = 180;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Mapping Check (Case-Insensitive)
  const bindId = (isV7 ? item.bind : item.id)?.toLowerCase();
  const isJack = isV7 && (item.role === 'port' || item.cellRef === 'port');
  
  const inContract = isJack
    ? contract?.ports?.some((p: { id: string }) => p.id.toLowerCase() === bindId)
    : contract?.parameters?.some((p: { id: string }) => p.id.toLowerCase() === bindId);

  const itemIssues = audit?.issues?.filter((i) => (i.path ?? '').includes(item.id) || i.message.includes(`'${item.id}'`)) || [];
  const hasError = itemIssues.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{ opacity: 1, x, y }}
      exit={{ opacity: 0, scale: 0 }}
      className="absolute z-10 group"
      onClick={(e) => {
        e.stopPropagation();
        if (e.ctrlKey || e.shiftKey) {
          const alreadySelected = multiSelectedIds.includes(item.id);
          if (alreadySelected) {
            onSelectMultiple(multiSelectedIds.filter(id => id !== item.id));
          } else {
            onSelectMultiple([...multiSelectedIds, item.id]);
          }
        } else {
          onSelectItem(item.id);
        }
      }}
    >
      <IntegrityOverlay node={item} audit={audit} isOrbital />
      {/* Connection Line */}
      <svg className="absolute top-1/2 left-1/2 overflow-visible pointer-events-none" style={{ width: 0, height: 0 }}>
         <motion.line 
           initial={{ pathLength: 0 }}
           animate={{ pathLength: 1 }}
           x1={0} y1={0} x2={-x} y2={-y} 
           stroke="currentColor" 
           className={`${!hasError ? (isJack ? 'text-accent/20' : 'text-primary/20') : 'text-red-500/40'} stroke-[1px]`}
           strokeDasharray="4 4"
         />
      </svg>

      <div className={`
        w-10 h-10 rounded-sm border transform -translate-x-1/2 -translate-y-1/2 
        flex items-center justify-center transition-all duration-300 cursor-pointer
        ${(selectedItemId === item.id || multiSelectedIds.includes(item.id)) ? (isJack ? 'scale-110 border-accent ring-2 ring-accent/20 bg-accent/20' : 'scale-110 border-primary ring-2 ring-primary/20 bg-primary/20') : (hasError ? 'bg-red-500/20 border-red-500 hover:bg-red-500/40' : (isJack ? 'wb-surface border-accent/30 hover:border-accent hover:orange-bloom' : 'wb-surface border-primary/30 hover:border-primary hover:cyan-bloom'))}
      `}>
        <span className={`text-[8px] font-bold uppercase tracking-tighter text-center px-1 ${!hasError ? (isJack ? 'text-accent/70' : 'text-primary/70') : 'text-red-200'}`}>
          {((item.meta?.label as string) || item.id).substring(0, 4)}
        </span>

        {/* Tooltip on hover */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface border border-outline p-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl min-w-[120px]">
           <div className="text-[9px] font-bold text-foreground uppercase border-b border-outline/20 pb-1 mb-1">{(item.meta?.label as string) || item.id}</div>
           <div className="text-[7px] text-foreground/40 uppercase">
             {isV7 ? `Bind: ${item.bind || 'UNBOUND'}` : `Type: ${item.cellRef}`}
           </div>
           {isV7 && (
              <div className={`text-[6px] font-bold mt-1 ${inContract ? 'text-green-400' : 'text-red-400'}`}>
                {inContract ? 'MAPPED TO WASM' : 'ORPHAN BINDING'}
              </div>
            )}
           {hasError && (
             <div className="mt-2 flex flex-col gap-1">
               {itemIssues.map((issue, i: number) => (
                 <div key={i} className="text-[7px] text-red-400 font-bold leading-tight flex items-start gap-1">
                   <span>•</span>
                   <span>{issue.message}</span>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
