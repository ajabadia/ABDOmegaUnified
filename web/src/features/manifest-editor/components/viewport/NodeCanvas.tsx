'use client';

/**
 * @purpose Renderiza una superficie para visualizar y interactuar con nodos en un manifesto OMEGA utilizando una disposición orbital.
 * @purpose_en Renders a canvas for visualizing and interacting with nodes in an OMEGA manifest using an orbital layout.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:uiecl4
 * @lastUpdated 2026-06-15T20:49:12.628Z
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
 
import type { OMEGA_Manifest, OMEGA_Contract, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { AuditResult } from '@/omega-ui-core/types/audit';
 
import { CenterModuleNode } from '../orbital/CenterModuleNode';
import { OrbitalNode } from '../orbital/OrbitalNode';
  
interface NodeCanvasProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  selectedItemId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  audit: AuditResult;
}
 
/**
 * NodeCanvas (Era 7.2.3 - Orbital Mode)
 * Driven by the Canonical UCA Tree.
 */
export default function NodeCanvas({ manifest, contract, selectedItemId, multiSelectedIds, onSelectItem, onSelectMultiple, audit }: NodeCanvasProps) {
  const isV7 = !!manifest?.schemaVersion?.startsWith('7');
  
  // FLATTEN TREE FOR ORBITAL LAYOUT
  const items = useMemo(() => {
    const tree = manifest.ui?.tree;
    if (!tree) return [];
    
    const entities: OmegaNode[] = [];
    const traverse = (node: OmegaNode) => {
      if (node.kind === 'cell' || node.kind === 'port') {
        entities.push(node);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    traverse(tree);
    return entities;
  }, [manifest.ui?.tree]);
  
  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden" onClick={() => onSelectItem(null)}>
      {/* BACKGROUND GRID */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, var(--color-primary) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />
 
      <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* CENTER NODE (WASM/MODULE) */}
        <CenterModuleNode manifest={manifest} contract={contract} onSelectItem={onSelectItem} />
 
        {/* PARAMETERS NODES (ORBITAL) */}
        <AnimatePresence>
          {items.map((item, index) => (
            <OrbitalNode 
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              contract={contract}
              selectedItemId={selectedItemId}
              multiSelectedIds={multiSelectedIds}
              onSelectItem={onSelectItem}
              onSelectMultiple={onSelectMultiple}
              audit={audit}
              isV7={isV7}
            />
          ))}
        </AnimatePresence>
 
        {/* ORBITAL RINGS */}
        <div className="absolute inset-[-180px] rounded-full border border-outline/5 pointer-events-none" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[-185px] rounded-full border border-primary/5 border-dashed pointer-events-none"
        />
      </div>
 
    </div>
  );
}
