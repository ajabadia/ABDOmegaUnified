'use client';

/**
 * @purpose Renderiza un panel para seleccionar y gestionar plantillas en el editor de manifesto OMEGA, incluyendo opciones del tienda oficial y biblioteca del usuario.
 * @purpose_en Renders a panel for selecting and managing blueprints in the OMEGA manifest editor, including options from the official store and user library.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:qloytr
 * @lastUpdated 2026-06-17T22:32:40.692Z
 */

import React, { useState } from 'react';
import { Search, Zap, Package, Upload, BookOpen, HardDrive } from 'lucide-react';
import type { V2BlueprintMeta, V2BlueprintData } from '@/omega-ui-core/types';
import type { BlueprintDefinition, OmegaBlueprintNode } from '@/omega-ui-core/types/manifest';
import BlueprintThumbnail from './BlueprintThumbnail';

/**
 * Converts a BlueprintDefinition (rootNode with OmegaBlueprintNode tree)
 * to the flat V2BlueprintData format expected by BlueprintThumbnail.
 */
function blueprintDefToV2Data(bp: BlueprintDefinition): V2BlueprintData | null {
  if (!bp.rootNode) return null;

  const children: V2BlueprintData['children'] = [];

  const walk = (node: OmegaBlueprintNode) => {
    if (!node.layout?.pos) return;

    const entry: V2BlueprintData['children'][number] = {
      id: node.id,
      type: node.cellRef || node.kind || 'cell',
      label: node.id,
      pos: { x: node.layout.pos.x, y: node.layout.pos.y },
    };
    if (node.layout.size) {
      entry.size = { width: node.layout.size.width, height: node.layout.size.height };
    }
    children.push(entry);

    node.children?.forEach(walk);
  };

  if (bp.rootNode.children) {
    bp.rootNode.children.forEach(walk);
  } else {
    walk(bp.rootNode);
  }

  if (children.length === 0) return null;

  return {
    id: bp.blueprintId,
    label: bp.name,
    pos: { x: 0, y: 0 },
    children,
  };
}

interface BlueprintLibraryPanelProps {
  onSelectBlueprint: (blueprint: V2BlueprintData) => void;
  /** Called when user Alt+clicks a blueprint to enter ghost preview mode for positioning */
  onAltClickBlueprint?: ((blueprint: V2BlueprintData) => void) | undefined;
  /** Called when user wants to load a .acepack file from disk */
  onLoadAcepack?: (() => void) | undefined;
  /** Called when user clicks a user-imported blueprint to inject it */
  onSelectUserBlueprint?: ((blueprint: BlueprintDefinition) => void) | undefined;
  /** User's locally loaded blueprints (from .acepack imports) — includes full blueprint for injection */
  userBlueprints?: Array<{ label: string; description: string | undefined; version: string | undefined; blueprint: BlueprintDefinition | undefined }> | undefined;
}

/**
 * OMEGA Blueprint Library Panel (v2)
 * Dual-tab panel: Official Store (loaded from /blueprints/v2/index.json)
 * and User Library (locally imported .acepack files).
 */
export default function BlueprintLibraryPanel({
  onSelectBlueprint,
  onAltClickBlueprint,
  onLoadAcepack,
  onSelectUserBlueprint,
  userBlueprints = []
}: BlueprintLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<'official' | 'library'>('official');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [blueprints, setBlueprints] = useState<Array<V2BlueprintMeta & { data?: V2BlueprintData }>>([]);

  React.useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const res = await fetch('/blueprints/v2/index.json');
        if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
        const catalog: V2BlueprintMeta[] = await res.json();

        const loaded = await Promise.all(
          catalog.map(async (item) => {
            try {
              const bpRes = await fetch(item.path);
              if (!bpRes.ok) throw new Error(`Blueprint fetch failed: ${bpRes.status}`);
              const data: V2BlueprintData = await bpRes.json();
              return { ...item, data };
            } catch (err) {
              console.warn("[BLUEPRINT] Error loading:", item.id, err);
              return { ...item };
            }
          })
        );

        if (active) setBlueprints(loaded);
      } catch (err) {
        console.error("[BLUEPRINT] Failed to load catalog:", err);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  const categories = ['all', 'voice', 'fx', 'mod', 'utility'];

  const getCategory = (bp: V2BlueprintMeta): string => {
    const id = bp.id.toLowerCase();
    const label = bp.label.toLowerCase();
    if (id.includes('vcf') || id.includes('vco') || id.includes('osc') || label.includes('filter') || label.includes('oscillator')) return 'voice';
    if (id.includes('io') || id.includes('jack') || id.includes('grid') || id.includes('macro') || label.includes('grid') || label.includes('i/o')) return 'utility';
    if (id.includes('delay') || id.includes('reverb') || id.includes('fx') || label.includes('fx')) return 'fx';
    if (id.includes('lfo') || id.includes('env') || id.includes('mod') || label.includes('lfo') || label.includes('modulator')) return 'mod';
    return 'voice';
  };

  // ── Tab: Official Store ──────────────────────────────────────────────
  const filteredOfficial = blueprints.filter(bp => {
    const matchesSearch = bp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (bp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === 'all') return matchesSearch;
    return matchesSearch && getCategory(bp) === activeCategory;
  });

  // ── Tab: User Library ────────────────────────────────────────────────
  const filteredUser = userBlueprints.filter(bp => {
    return bp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (bp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden wb-surface text-[9px] font-sans">
      {/* TABS — Tech-Noir Glassmorphism */}
      <div className="flex border-b border-outline bg-black/40 backdrop-blur-md p-1 rounded-[8px] gap-2 mx-2 mt-2 mb-1">
        <button
          onClick={() => setActiveTab('official')}
          aria-label="Official store blueprints"
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-[6px] transition-all duration-300 ${
            activeTab === 'official'
              ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          Official Store
        </button>
        <button
          onClick={() => setActiveTab('library')}
          aria-label="User library blueprints"
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-[6px] transition-all duration-300 ${
            activeTab === 'library'
              ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <HardDrive className="w-3 h-3" />
          User Library
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="p-2 border-b wb-outline flex flex-col gap-1.5 wb-surface-subtle shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-3 h-3 wb-text-muted opacity-40" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'official' ? 'store' : 'local'} blueprints...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 wb-surface-strong border wb-outline text-[9px] uppercase tracking-wider rounded-xs wb-text placeholder-wb-text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
            aria-label="Search blueprints"
          />
        </div>

        {/* CATEGORY FILTERS — only for Official Store */}
        {activeTab === 'official' && (
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-label={`Filter by category: ${cat}`}
                className={`px-2 py-0.5 border rounded-xs uppercase tracking-widest text-[7px] font-black transition-all ${
                  activeCategory === cat
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]'
                    : 'wb-surface-strong wb-outline wb-text-muted hover:wb-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-2 select-none">
        {activeTab === 'official' && (
          <>
            {filteredOfficial.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-primary" />
                  <span>Blueprints ({filteredOfficial.length})</span>
                </div>
                {filteredOfficial.map((bp) => (
                  <div
                    key={bp.id}
                    onClick={(e) => {
                      if (!bp.data) return;
                      if (e.altKey && onAltClickBlueprint) {
                        e.preventDefault();
                        onAltClickBlueprint(bp.data);
                      } else {
                        onSelectBlueprint(bp.data);
                      }
                    }}
                    title={bp.data ? 'Click to inject · Alt+Click for ghost preview' : 'Blueprint data not available'}
                    className={`flex items-center justify-between px-2 py-1.5 border rounded-xs cursor-pointer transition-all wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text ${!bp.data ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      {bp.data ? (
                        <BlueprintThumbnail data={bp.data} width={40} height={28} className="shrink-0" />
                      ) : (
                        <Package className="w-3 h-3 shrink-0 wb-text-muted opacity-60" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                          {bp.label}
                        </span>
                        {bp.description && (
                          <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                            {bp.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bp.family && (
                        <span className="text-[6px] font-mono font-bold bg-primary/10 border border-primary/20 text-primary px-1 rounded-xs uppercase">
                          {bp.family}
                        </span>
                      )}
                      <span className="text-[6px] font-mono wb-text-muted opacity-60">
                        v{bp.version}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
                <BookOpen className="w-5 h-5 wb-text" />
                <span className="text-[7px] font-black uppercase tracking-widest wb-text">No store blueprints found</span>
              </div>
            )}
          </>
        )}

        {activeTab === 'library' && (
          <>
            {/* LOAD BUTTON */}
            <button
              onClick={onLoadAcepack}
              aria-label="Load acepack blueprint"
              className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-primary/30 rounded-xs hover:border-primary/60 hover:bg-primary/5 transition-all wb-surface-subtle text-[8px] font-black uppercase tracking-wider wb-text-muted hover:text-primary"
            >
              <Upload className="w-3.5 h-3.5" />
              Load .acepack Blueprint
            </button>

            {filteredUser.length > 0 ? (
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="px-1.5 py-0.5 text-[7px] font-black wb-text-muted uppercase tracking-widest flex items-center gap-1">
                  <HardDrive className="w-2.5 h-2.5 text-primary" />
                  <span>Local ({filteredUser.length})</span>
                </div>
                {filteredUser.map((bp, idx) => (
                  <div
                    key={`user-${idx}`}
                    onClick={(e) => {
                      if (!bp.blueprint) return;
                      if (e.altKey && onAltClickBlueprint) {
                        e.preventDefault();
                        // Convert BlueprintDefinition to V2BlueprintData for consistent API
                        const thumbData = blueprintDefToV2Data(bp.blueprint);
                        if (thumbData) onAltClickBlueprint(thumbData);
                      } else {
                        onSelectUserBlueprint?.(bp.blueprint);
                      }
                    }}
                    title={bp.blueprint ? 'Click to inject · Alt+Click for ghost preview' : 'Blueprint data not available'}
                    className={`flex items-center justify-between px-2 py-1.5 border rounded-xs cursor-pointer transition-all wb-surface-subtle border-transparent hover:wb-surface-strong hover:wb-outline wb-text ${!bp.blueprint ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      {(() => {
                        // S6: Use pre-generated thumbnail SVG from blueprint metadata when available
                        const thumbSvg = bp.blueprint?.metadata?.thumbnail;
                        if (thumbSvg) {
                          // Safe encoding for SVG (handles non-ASCII characters)
                          const encoded = encodeURIComponent(thumbSvg);
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`data:image/svg+xml;charset=utf-8,${encoded}`}
                              alt={bp.label}
                              className="w-10 h-7 shrink-0 rounded-xs"
                            />
                          );
                        }
                        const thumbData = bp.blueprint ? blueprintDefToV2Data(bp.blueprint) : null;
                        return thumbData ? (
                          <BlueprintThumbnail data={thumbData} width={40} height={28} className="shrink-0" />
                        ) : (
                          <Package className="w-3 h-3 shrink-0 text-primary/60" />
                        );
                      })()}
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-mono text-[8px] uppercase tracking-wider truncate leading-tight">
                          {bp.label}
                        </span>
                        {bp.description && (
                          <span className="text-[7px] opacity-50 uppercase tracking-widest truncate leading-tight">
                            {bp.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {bp.version && (
                      <span className="text-[6px] font-mono wb-text-muted opacity-60 shrink-0">
                        v{bp.version}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 gap-1.5">
                <HardDrive className="w-5 h-5 wb-text" />
                <span className="text-[7px] font-black uppercase tracking-widest wb-text">
                  No local blueprints loaded
                </span>
                <span className="text-[6px] wb-text-muted">Click the button above to import a .acepack file</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
