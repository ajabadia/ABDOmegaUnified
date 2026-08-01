'use client';

/**
 * @purpose Renderiza una estructura de árbol para navegar y seleccionar elementos en un editor de manifesto OMEGA.
 * @purpose_en Renders a tree structure for navigating and selecting elements in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:zxdyfa
 * @lastUpdated 2026-06-23T14:30:00.000Z
 */

import { useState, useMemo, type KeyboardEvent } from 'react';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { ChevronRight, ChevronDown, Layers, LayoutPanelLeft, Container, Settings2, BoxSelect } from 'lucide-react';


interface TreeSectionProps {
  manifest: OMEGA_Manifest;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

export default function TreeSection({ manifest, selectedItemId, onSelectItem }: TreeSectionProps) {
  // Use persistent tree
  const rootNode = useMemo(() => {
    return manifest.ui?.tree || null;
  }, [manifest]);

  if (!rootNode) {
    return (
      <div className="flex flex-col max-h-[300px] bg-black/20 rounded-sm border border-white/5 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
          <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400" />
            Jerarquía UCA
          </span>
        </div>
        <div className="flex-grow flex items-center justify-center text-[8px] text-white/30 py-8">
          No UCA tree available
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[300px] bg-black/20 rounded-sm border border-white/5 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
        <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-purple-400" />
          Jerarquía UCA
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 outline-none" tabIndex={0}>
        <TreeItem 
          node={rootNode} 
          depth={0} 
          selectedItemId={selectedItemId} 
          onSelectItem={onSelectItem} 
        />
      </div>
    </div>
  );
}

interface TreeItemProps {
  node: OmegaNode;
  depth: number;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

function TreeItem({ node, depth, selectedItemId, onSelectItem }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Default expand up to Face level
  const isSelected = selectedItemId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectItem(node.id);
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded) {
          setIsExpanded(true);
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded) {
          setIsExpanded(false);
        }
        break;
    }
  };

  const getIcon = (kind: string) => {
    switch (kind) {
      case 'rack': return <LayoutPanelLeft className="w-3 h-3 text-purple-400" />;
      case 'face': return <BoxSelect className="w-3 h-3 text-blue-400" />;
      case 'container': return <Container className="w-3 h-3 text-emerald-400" />;
      case 'cell': return <Settings2 className="w-3 h-3 text-amber-400" />;
      case 'layer': return <Layers className="w-3 h-3 text-red-400" />;
      default: return <BoxSelect className="w-3 h-3 text-white/50" />;
    }
  };

  return (
    <div className="flex flex-col">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelectItem(node.id);
        }}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-1.5 py-1 px-1 rounded-sm cursor-pointer select-none transition-colors group focus:outline-none focus:ring-1 focus:ring-purple-500/50 ${
          isSelected 
            ? 'bg-purple-500/20 text-purple-200' 
            : 'text-white/60 hover:bg-white/5 hover:text-white/90'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <div 
          className={`w-3 h-3 flex items-center justify-center ${hasChildren ? 'cursor-pointer hover:bg-white/10 rounded-sm' : 'opacity-0'}`}
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />
          )}
        </div>
        
        {getIcon(node.kind)}
        
        <span className="text-[10px] font-medium truncate">
          {node.id}
        </span>
        
        {node.cellRef && (
          <span className="text-[8px] text-white/30 font-mono ml-auto mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.cellRef}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div role="group" className="flex flex-col">
          {node.children!.map((child) => (
            <TreeItem 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              selectedItemId={selectedItemId} 
              onSelectItem={onSelectItem} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
