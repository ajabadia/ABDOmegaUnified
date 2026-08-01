'use client';

/**
 * @purpose Renderiza una capa con iconos que indican problemas de integridad para un nodo según los resultados del auditoria.
 * @purpose_en Renders an overlay with icons indicating integrity issues for a node based on audit results.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:117uwt8
 * @lastUpdated 2026-06-15T13:01:04.649Z
 */

import { motion } from 'framer-motion';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import { AlertCircle, Link, RefreshCcw } from 'lucide-react';

interface IntegrityOverlayProps {
  node: OmegaNode;
  audit?: AuditResult | undefined;
  isOrbital?: boolean | undefined;
}

export function IntegrityOverlay({ node, audit, isOrbital }: IntegrityOverlayProps) {
  if (!audit) return null;

  const nodeIssues = audit.issues?.filter(i => 
    (i.path ?? '').includes(node.id) || 
    i.message.toLowerCase().includes(`'${node.id.toLowerCase()}'`)
  ) || [];

  if (nodeIssues.length === 0) return null;

  const hasError = nodeIssues.some(i => i.severity === 'error');
  const isDangling = nodeIssues.some(i => i.message.toLowerCase().includes('dangling') || i.message.toLowerCase().includes('unlinked'));
  const isCircular = nodeIssues.some(i => i.message.toLowerCase().includes('circular') || i.message.toLowerCase().includes('loop'));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute z-50 pointer-events-none flex gap-1 ${isOrbital ? 'top-[-10px] right-[-10px]' : 'top-1 right-1'}`}
    >
      {isDangling && (
        <div className="bg-amber-500 text-black p-0.5 rounded-full shadow-lg border border-amber-300/50 animate-pulse">
          <Link size={8} />
        </div>
      )}
      
      {isCircular && (
        <div className="bg-purple-500 text-white p-0.5 rounded-full shadow-lg border border-purple-300/50">
          <RefreshCcw size={8} className="animate-spin-slow" />
        </div>
      )}

      {hasError && (
        <div className="bg-red-600 text-white p-0.5 rounded-full shadow-lg border border-red-400/50 shadow-red-500/40">
          <AlertCircle size={8} />
        </div>
      )}
    </motion.div>
  );
}
