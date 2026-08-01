'use client';

/**
 * @purpose Gestiona una sección colapsable para mostrar y gestionar entidades en el editor de manifesto OMEGA, incluyendo agregar, duplicar y eliminar elementos con soporte para agrupar por contenedores.
 * @purpose_en Manages a collapsible section for displaying and managing entities in the OMEGA manifest editor, including adding, duplicating, and removing items with support for grouping by containers.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:ry1sll
 * @lastUpdated 2026-06-15T11:38:38.545Z
 */

import { Plus, Settings2, Zap, Layout, Copy, Trash2, Database } from 'lucide-react';
import type { OMEGA_Manifest, LayoutContainer, ManifestEntity } from '@/types/manifest';

interface EntityListSectionProps {
  items: ManifestEntity[];
  title: string;
  type: 'control' | 'jack';
  onSelectItem: (id: string) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  manifest: OMEGA_Manifest;
  onOpenLibrary?: () => void;
}

import InspectorCollapsible from '../shared/InspectorCollapsible';

import IndustrialButton from '../shared/IndustrialButton';
import EmptyState from '../shared/EmptyState';

/**
 * EntityListSection
 * Centralized list manager for Controls and Signal Ports within the Module Inspector.
 */
export default function EntityListSection({
  items,
  title,
  type,
  onSelectItem,
  onAddEntity,
  onDuplicateItem,
  onRemoveItem,
  manifest,
  onOpenLibrary
}: EntityListSectionProps) {
  const Icon = type === 'control' ? Settings2 : Zap;

  // GROUPING LOGIC (Era 7.2 Container Support)
  const groups = items.reduce((acc: Record<string, ManifestEntity[]>, item) => {
    const gid = item.presentation?.container || 'UNBOUND';
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(item);
    return acc;
  }, {});

  const containers = manifest?.ui?.layout?.containers || [];

  const groupIds = Object.keys(groups).sort((a, b) => {
    if (a === 'UNBOUND') return 1;
    if (b === 'UNBOUND') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-black/5 p-4 rounded-xs border wb-outline shadow-inner transition-colors duration-500">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] wb-text">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onOpenLibrary?.()}
            className="px-3 py-1.5 rounded-xs border border-accent/30 bg-accent/5 text-accent text-[8px] font-black uppercase hover:bg-accent/10 hover:border-accent transition-all flex items-center gap-1.5"
            title="Browse Universal Cell Library"
          >
            <Database className="w-3 h-3" /> Library
          </button>
          <IndustrialButton 
            label={`Add ${type}`}
            icon={Plus}
            onClick={() => onAddEntity(type)}
            size="sm"
          />
        </div>
      </div>

      <div className="space-y-4">
        {groupIds.map((gid) => {
          const container = containers.find((c: LayoutContainer) => c.id === gid);
          const label = container ? container.label : gid === 'UNBOUND' ? 'UNBOUND ENTITIES' : gid;
          const isLegacy = !container && gid !== 'UNBOUND';

          return (
            <InspectorCollapsible 
              key={gid} 
              title={label} 
              icon={Layout}
            >
              <div className="space-y-1.5 pt-2">
                {groups[gid].map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className="group relative flex items-center justify-between p-3 rounded-xs border wb-surface-subtle wb-outline hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] transition-all cursor-pointer transition-colors duration-500"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-1 h-5 rounded-full transition-colors ${isLegacy ? 'bg-amber-500/20 group-hover:bg-amber-500' : 'bg-outline/20 group-hover:bg-primary/40'}`} />
                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black truncate tracking-tight wb-text group-hover:text-primary transition-colors">{item.label || item.id}</span>
                          {isLegacy && <span className="text-[5px] bg-amber-500/20 px-1 rounded-full text-amber-500 font-bold uppercase">Legacy</span>}
                        </div>
                        <span className="text-[8px] font-mono wb-text-muted uppercase truncate tracking-wider">{item.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDuplicateItem(item.id); }}
                        className="p-1.5 hover:wb-surface-hover rounded-xs wb-text-muted hover:wb-text transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-xs wb-text-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </InspectorCollapsible>
          );
        })}

        {items.length === 0 && (
          <EmptyState 
            message="Registry Empty"
            subMessage={`No ${title.toLowerCase()} defined`}
            icon={Layout}
          />
        )}
      </div>
    </div>
  );
}
