'use client';

/**
 * @purpose Renderiza una barra de filtro para el panel de capas en el editor de manifest OMEGA, permitiendo a los usuarios buscar capas, aplicar filtros por tipo/visibilidad y visualizar el progreso de los filtros aplicados.
 * @purpose_en Renders a filter bar for the LayersPanel in the OMEGA manifest editor, allowing users to search layers, apply filters by type/visibility, and view progress of applied filters.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:128jkqt
 * @lastUpdated 2026-06-19T18:47:25.868Z
 */

import { Search, EyeOff, Lock, ListFilter, Folder } from 'lucide-react';
import { COMPONENT_FILTERS, type ComponentTypeFilter } from '@/features/manifest-editor/hooks/useLayerFilters';

interface LayersPanelFilterBarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  typeFilter: ComponentTypeFilter;
  setTypeFilter: (v: ComponentTypeFilter) => void;
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  showLocked: boolean;
  setShowLocked: (v: boolean) => void;
  showAuditIssues: boolean;
  setShowAuditIssues: (v: boolean) => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  propertySearchTerm: string;
  setPropertySearchTerm: (v: string) => void;
  clearAllFilters: () => void;
  filterVisibleCount: number;
  totalCount: number;
  isFiltered: boolean;
  filterProgress: number;
}

export default function LayersPanelFilterBar({
  searchTerm, setSearchTerm,
  typeFilter, setTypeFilter,
  showHidden, setShowHidden,
  showLocked, setShowLocked,
  showAuditIssues, setShowAuditIssues,
  showTemplates, setShowTemplates,
  propertySearchTerm, setPropertySearchTerm,
  clearAllFilters,
  filterVisibleCount, totalCount,
  isFiltered, filterProgress,
}: LayersPanelFilterBarProps) {
  return (
    <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
      {/* Search input */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search layers by name or ID"
          className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} title="Clear search" className="absolute right-1 p-1 text-white/30 hover:text-white transition-colors">✕</button>
        )}
      </div>

      {/* Component type filter chips */}
      <div className="flex flex-wrap gap-1">
        {COMPONENT_FILTERS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all ${
              typeFilter === type
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.1)]'
                : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text hover:border-white/20'
            } text-[7px] font-black`}
            title={`Filter by ${label} (Ctrl+Shift+Alt+${COMPONENT_FILTERS.findIndex(f => f.type === type)})`}
            aria-label={`Filter by ${label}`}
          >
            <Icon className="w-2.5 h-2.5" /> {label}
          </button>
        ))}
      </div>

      {/* State filter toggles: Hidden, Locked, Audit, Templates */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHidden(!showHidden)} title="Toggle show hidden (Ctrl+Shift+Alt+H)"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
              showHidden ? 'bg-red-400/20 border-red-400/50 text-red-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
          ><EyeOff className="w-2.5 h-2.5" /> Hidden</button>
          <button onClick={() => setShowLocked(!showLocked)} title="Toggle show locked (Ctrl+Shift+Alt+L)"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
              showLocked ? 'bg-amber-400/20 border-amber-400/50 text-amber-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
          ><Lock className="w-2.5 h-2.5" /> Locked</button>
          <button onClick={() => setShowAuditIssues(!showAuditIssues)} title="Toggle show audit issues (Ctrl+Shift+Alt+A)"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
              showAuditIssues ? 'bg-purple-400/20 border-purple-400/50 text-purple-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
          ><ListFilter className="w-2.5 h-2.5" /> Audit</button>
          <button onClick={() => setShowTemplates(!showTemplates)} title="Toggle show templates (Ctrl+Shift+Alt+T)"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-xs uppercase tracking-widest transition-all text-[7px] font-black ${
              showTemplates ? 'bg-sky-400/20 border-sky-400/50 text-sky-400' : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'}`}
          ><Folder className="w-2.5 h-2.5" /> Templates</button>
          {(typeFilter !== 'all' || showHidden || showLocked || showAuditIssues || showTemplates || searchTerm || propertySearchTerm) && (
            <button onClick={clearAllFilters} title="Clear all filters (Ctrl+Shift+Alt+C)" className="text-[6px] font-mono text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">Clear</button>
          )}
        </div>
        <span className="text-[6px] font-mono wb-text-muted opacity-50">{filterVisibleCount}/{totalCount}</span>
      </div>

      {/* Property search input */}
      <div className="relative flex items-center">
        <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-30" />
        <input type="text" placeholder="Property → bind, value, min, max..."
          value={propertySearchTerm} onChange={(e) => setPropertySearchTerm(e.target.value)}
          aria-label="Search by property value"
          className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[8px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/30 focus:outline-none focus:border-purple/50 transition-colors font-mono"
        />
        {propertySearchTerm && (
          <button onClick={() => setPropertySearchTerm('')} title="Clear property search" className="absolute right-1 p-1 text-white/30 hover:text-white transition-colors">✕</button>
        )}
      </div>

      {/* Filter progress bar */}
      {isFiltered && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${filterProgress}%`,
                background: filterProgress > 50 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : filterProgress > 25 ? 'linear-gradient(90deg, #eab308, #f97316)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }}
            />
          </div>
          <span className="text-[6px] font-black tabular-nums opacity-60 w-8 text-right">{filterProgress}%</span>
        </div>
      )}
    </div>
  );
}


