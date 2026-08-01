'use client';

/**
 * @purpose Gestiona un menú de búsqueda suave para acciones y nodos en el editor de manifesto OMEGA, proporcionando atajos y categorías para acceso fácil.
 * @purpose_en Manages a fuzzy search command palette for actions and nodes in the OMEGA manifest editor, providing shortcuts and categories for easy access.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:3,imports:3,sig:1hkftoa
 * @lastUpdated 2026-06-20T12:52:21.953Z
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, startTransition } from 'react';
import {
  Command,
  Search,
  ArrowRight,
} from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';

// ── Types ───────────────────────────────────────────────────────────────

export interface CommandPaletteAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  onExecute: () => void;
}

export interface CommandPaletteNode {
  id: string;
  label: string;
  kind: string;
  type?: string;
  path?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
  nodes: CommandPaletteNode[];
  onSelectNode: (nodeId: string) => void;
}

// ── Internal union type for flattened list items ─────────────────────────

type ActionItem = {
  type: 'action';
  index: number;
  label: string;
  category: string;
  shortcut: string | undefined;
  sortKey: string;
  onExecute: () => void;
};

type NodeItem = {
  type: 'node';
  index: number;
  label: string;
  category: string;
  sortKey: string;
  nodeId: string;
  kind: string;
  onExecute: () => void;
};

type PaletteListItem = ActionItem | NodeItem;

// ── Fuzzy search ────────────────────────────────────────────────────────

const fuzzyMatch = (query: string, text: string): boolean => {
  if (!query) return true;
  const lower = query.toLowerCase();
  const target = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < lower.length; ti++) {
    if (target[ti] === lower[qi]) qi++;
  }
  return qi === lower.length;
};

const scoreMatch = (query: string, text: string): number => {
  const lower = query.toLowerCase();
  const target = text.toLowerCase();
  if (target.startsWith(lower)) return 100;
  if (target.includes(lower)) return 50;
  if (fuzzyMatch(query, text)) return 10;
  return 0;
};

// ── Icon for node kinds ─────────────────────────────────────────────────

const NODE_KIND_ICONS: Record<string, string> = {
  container: '▣', cell: '◈', rack: '▤', face: '▭',
  port: '●', group: '◆', layer: '▬', patch: '◎',
  root: '⬡', control: '◉', telemetry: '◍',
};

const NODE_KIND_COLORS: Record<string, string> = {
  container: 'text-cyan-400', cell: 'text-amber-400', rack: 'text-violet-400',
  face: 'text-emerald-400', port: 'text-blue-400', group: 'text-pink-400',
  layer: 'text-white/50', patch: 'text-primary', root: 'text-white/70',
  control: 'text-orange-400', telemetry: 'text-teal-400',
};

// ── Component ───────────────────────────────────────────────────────────

export default function CommandPalette({
  isOpen,
  onClose,
  actions,
  nodes,
  onSelectNode,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // ── Flatten actions + nodes into a single searchable list ──────────
  const allItems: PaletteListItem[] = useMemo(() => {
    const actionItems: ActionItem[] = actions.map((a, i) => ({
      type: 'action',
      index: i,
      label: a.label,
      category: a.category,
      shortcut: a.shortcut,
      sortKey: `0_${a.category}_${a.label}`,
      onExecute: a.onExecute,
    }));

    const nodeItems: NodeItem[] = nodes.map((n, i) => ({
      type: 'node',
      index: i,
      label: n.label || n.id,
      category: `Node — ${n.kind}`,
      sortKey: `1_${n.kind}_${n.label || n.id}`,
      nodeId: n.id,
      kind: n.kind,
      onExecute: () => onSelectNode(n.id),
    }));

    return [...actionItems, ...nodeItems].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [actions, nodes, onSelectNode]);

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered: PaletteListItem[] = useMemo(() => {
    const q = query.trim();
    if (!q) return allItems;

    const scored = allItems
      .map(item => {
        const kindScore = item.type === 'node'
          ? scoreMatch(q, item.kind)
          : 0;
        return {
          item,
          score: Math.max(
            scoreMatch(q, item.label),
            scoreMatch(q, item.category),
            kindScore,
          ),
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.sortKey.localeCompare(b.item.sortKey));
    return scored.map(({ item }) => item);
  }, [allItems, query]);

  // ── Reset on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setQuery('');
        setHighlightedIndex(0);
      });
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // ── Keyboard navigation ────────────────────────────────────────────
  const scrollToIndex = useCallback((idx: number) => {
    const el = listRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = Math.min(prev + 1, filtered.length - 1);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'Enter' && filtered[highlightedIndex]) {
      e.preventDefault();
      filtered[highlightedIndex].onExecute();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) setQuery('');
      else onClose();
    }
  }, [filtered, highlightedIndex, onClose, query, scrollToIndex]);

  // ── Global Escape handler (backup: closes palette when focus is outside the palette) ──
  // Note: The div's onKeyDown handler handles Escape when focus is inside the palette.
  // This global handler only fires for Escape events outside the palette div.
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Only handle Escape if it didn't originate inside the palette
      const paletteEl = document.querySelector('[data-testid="palette-backdrop"]')?.parentElement;
      if (paletteEl && paletteEl.contains(e.target as Node)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (query) setQuery('');
        else onClose();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, onClose, query]);

  if (!isOpen) return null;

  const actionItems = filtered.filter((i): i is ActionItem => i.type === 'action');
  const nodeItems = filtered.filter((i): i is NodeItem => i.type === 'node');

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette — search nodes and actions"
      className="fixed inset-0 z-[400] flex items-start justify-center pt-[15vh] pointer-events-none"
    >
      {/* Backdrop */}
      <div
        data-testid="palette-backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => { if (!query) onClose(); else setQuery(''); }}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-[420px] pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        <PaletteSearchInput
          ref={inputRef}
          query={query}
          onQueryChange={(v) => { setQuery(v); setHighlightedIndex(0); }}
        />

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[320px] overflow-y-auto overscroll-contain border-x border-b border-white/10 bg-[#0c0c0d] rounded-b-xs shadow-2xl"
        >
          {filtered.length === 0 && <PaletteEmptyState query={query} />}
          <PaletteSection
            label="Actions"
            headerColor="text-primary/60"
            items={actionItems}
            offset={0}
            highlightedIndex={highlightedIndex}
            onItemClick={(item) => { item.onExecute(); onClose(); }}
            onItemHover={setHighlightedIndex}
          />
          <PaletteSection
            label="Nodes"
            headerColor="text-amber-400/60"
            items={nodeItems}
            offset={actionItems.length}
            highlightedIndex={highlightedIndex}
            onItemClick={(item) => { item.onExecute(); onClose(); }}
            onItemHover={setHighlightedIndex}
            renderItem={(item, isHighlighted, onClick, onHover) => (
              <PaletteItem
                label={item.label}
                category={item.category}
                iconChar={NODE_KIND_ICONS[item.kind] || '○'}
                iconColor={NODE_KIND_COLORS[item.kind] || 'text-white/40'}
                isHighlighted={isHighlighted}
                onClick={onClick}
                onMouseEnter={onHover}
              />
            )}
          />
        </div>

        <PaletteFooter />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Search input with icon and Ctrl+K badge */
const PaletteSearchInput = React.forwardRef<HTMLInputElement, {
  query: string;
  onQueryChange: (value: string) => void;
}>(({ query, onQueryChange }, ref) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-[#0c0c0d] border border-white/15 rounded-t-xs shadow-2xl">
    <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
    <input
      ref={ref}
      type="text"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      placeholder="Search nodes and actions..."
      className="flex-1 bg-transparent border-none outline-none text-[11px] text-white/80 placeholder-white/25 font-mono"
      spellCheck={false}
      autoComplete="off"
      aria-label="Search nodes and actions"
    />
    <span className="text-[7px] font-mono text-white/20 border border-white/10 rounded-xs px-1 py-0.5">
      Ctrl+K
    </span>
  </div>
));
PaletteSearchInput.displayName = 'PaletteSearchInput';

/** Empty state when no results match the query */
function PaletteEmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-1 select-none">
      <Command className="w-6 h-6 text-white/10" />
      <span className="text-[9px] text-white/20 font-mono">No results for &ldquo;{query}&rdquo;</span>
    </div>
  );
}

/** Footer with keyboard hints */
function PaletteFooter() {
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-black/40 border border-white/5 rounded-b-xs">
      <span className="text-[6px] font-mono text-white/15">
        <ArrowRight className="w-2 h-2 inline mr-0.5" /> Navigate &bull; Enter to select
      </span>
      <span className="text-[6px] font-mono text-white/15">Esc to close</span>
    </div>
  );
}

/** A section of the palette with a sticky header and filtered items */
function PaletteSection<T extends PaletteListItem>({
  label,
  headerColor,
  items,
  offset,
  highlightedIndex,
  onItemClick,
  onItemHover,
  renderItem,
}: {
  label: string;
  headerColor: string;
  items: T[];
  offset: number;
  highlightedIndex: number;
  onItemClick: (item: T) => void;
  onItemHover: (index: number) => void;
  renderItem?: (item: T, isHighlighted: boolean, onClick: () => void, onHover: () => void) => React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="sticky top-0 bg-[#0c0c0d] px-3 py-1 border-b border-white/5 z-10">
        <span className={`text-[6px] font-mono uppercase tracking-widest ${headerColor}`}>{label}</span>
      </div>
      {items.map((item, idx) => {
        const globalIdx = offset + idx;
        const isHighlighted = globalIdx === highlightedIndex;

        if (renderItem) {
          return (
            <React.Fragment key={`${label}-${idx}`}>
              {renderItem(item, isHighlighted, () => onItemClick(item), () => onItemHover(globalIdx))}
            </React.Fragment>
          );
        }

        // Default render: ActionItem (has shortcut)
        return (
          <PaletteItem
            key={`${label}-${idx}`}
            label={item.label}
            category={item.category}
            shortcut={'shortcut' in item ? (item as ActionItem).shortcut : undefined}
            isHighlighted={isHighlighted}
            onClick={() => onItemClick(item)}
            onMouseEnter={() => onItemHover(globalIdx)}
          />
        );
      })}
    </div>
  );
}

// ── Single item row ─────────────────────────────────────────────────────

function PaletteItem({
  label,
  category,
  shortcut,
  iconChar,
  iconColor = 'text-white/40',
  isHighlighted,
  onClick,
  onMouseEnter,
}: {
  label: string;
  category: string;
  shortcut?: string | undefined;
  iconChar?: string | undefined;
  iconColor?: string | undefined;
  isHighlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-label={label}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-all ${
        isHighlighted
          ? 'bg-primary/15 text-primary border-l-2 border-primary'
          : 'hover:bg-white/5 border-l-2 border-transparent'
      }`}
    >
      {iconChar ? (
        <span className={`w-4 text-center text-[10px] font-bold ${iconColor} shrink-0`}>
          {iconChar}
        </span>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className={`text-[9px] font-medium truncate leading-tight ${isHighlighted ? 'text-primary font-bold' : 'text-white/80'}`}>
          {label}
        </div>
        <div className="text-[6px] font-mono text-white/25 truncate leading-tight mt-0.5">
          {category}
        </div>
      </div>

      {shortcut && (
        <span className="shrink-0 text-[7px] font-mono text-white/20 tracking-normal">
          {shortcut}
        </span>
      )}
    </button>
  );
}
