'use client';

/**
 * @purpose Renderiza el mapa de botones del toolbar flotante OMEGA, incluyendo la lógica de grid/columnas y divisores por categoría.
 * @purpose_en Renders the floating OMEGA toolbar button map, including grid/column layout and category dividers.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1tbm0k
 * @lastUpdated 2026-06-21T00:00:00.000Z
 */

import type { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import ToolbarIconButton from './ToolbarIconButton';
import ToolbarAddFlyout from './ToolbarAddFlyout';
import {
  MousePointer2, Plus, Cpu, Sparkles,
  Settings, Zap,
  Maximize2, Minimize2,
  Group, Ungroup,
  Scale, Ruler, Rotate3D, Settings2,
} from 'lucide-react';
import type { ToolType } from '@/features/manifest-editor/hooks/layout/useToolbarLogic';

// ── Custom marquee icon ──────────────────────────────────────────────
function marqueeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" strokeDasharray="3 3" />
    </svg>
  );
}

// ── Context: all state/handlers needed to render buttons ─────────────
export interface ToolbarButtonContext {
  activeTool: ToolType;
  handleSelectTool: (tool: Exclude<ToolType, null>) => void;
  setActiveTool: (tool: ToolType) => void;
  showAddMenu: boolean;
  setShowAddMenu: React.Dispatch<React.SetStateAction<boolean>>;
  onAddEntity: (type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void;
  selectedNodeId: string | null;
  isGroupEnabled: boolean;
  isUngroupEnabled: boolean;
  targetGroupId: string | undefined;
  onGroupSelected?: ((ids: string[]) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
  multiSelectedIds: string[];
  onOpenGallery: () => void;
  onOpenConfig: () => void;
  isLiveMode: boolean;
  onToggleLive: () => void;
  isZenMode: boolean;
  onToggleZen: () => void;
  showNumericResize: boolean;
  showNumericRotate: boolean;
  handleOpenNumericResize: () => void;
  handleOpenNumericRotate: () => void;
}

// ── Layout data from the hook ────────────────────────────────────────
export interface ToolbarLayout {
  renderedButtons: { id: string }[];
  items: ({ type: 'button'; id: string } | { type: 'divider' })[];
  cols: number;
}

interface ToolbarButtonsProps {
  ctx: ToolbarButtonContext;
  layout: ToolbarLayout;
  onToggleCustomize: () => void;
}

// ── Build button map from context ────────────────────────────────────
function buildButtonMap(ctx: ToolbarButtonContext): Record<string, ReactNode> {
  return {
    select: (
      <ToolbarIconButton key="select" icon={<MousePointer2 className="w-3.5 h-3.5 fill-current" />} active={ctx.activeTool === 'select'} onClick={() => ctx.handleSelectTool('select')} title="Select & Move Tool (V)" size="md" className={ctx.activeTool === 'select' ? 'tool-active-glow' : ''} />
    ),
    marquee: (
      <ToolbarIconButton key="marquee" icon={marqueeIcon()} active={ctx.activeTool === 'marquee'} onClick={() => ctx.handleSelectTool('marquee')} title="Marquee Selection Tool (M)" size="md" className={ctx.activeTool === 'marquee' ? 'tool-active-glow' : ''} />
    ),
    transform: (
      <ToolbarIconButton key="transform" icon={<Scale className="w-3.5 h-3.5" />} active={ctx.activeTool === 'transform'} onClick={() => ctx.handleSelectTool('transform')} title="Transform/Scale Tool (T)" size="md" className={ctx.activeTool === 'transform' ? 'tool-active-glow' : ''} />
    ),
    add: (
      <div key="add" className="relative">
        <ToolbarIconButton icon={<Plus className="w-4 h-4" />} active={ctx.activeTool === 'add'} onClick={() => ctx.handleSelectTool('add')} title="Add Primitives & Ports (A)" size="md" className={ctx.activeTool === 'add' ? 'tool-active-glow' : ''} />
        <AnimatePresence>
          {ctx.showAddMenu && (
            <ToolbarAddFlyout onAddEntity={ctx.onAddEntity} onClose={() => ctx.setShowAddMenu(false)} onSetActiveTool={ctx.setActiveTool} />
          )}
        </AnimatePresence>
      </div>
    ),
    studio: ctx.selectedNodeId ? (
      <ToolbarIconButton key="studio" icon={<Cpu className="w-3.5 h-3.5" />} onClick={() => ctx.handleSelectTool('studio')} title="Universal Cell Laboratory (Studio)" size="md" />
    ) : null,
    group: ctx.isGroupEnabled ? (
      <ToolbarIconButton key="group" icon={<Group className="w-3.5 h-3.5" />} onClick={() => { if (ctx.onGroupSelected) { ctx.onGroupSelected(ctx.multiSelectedIds); ctx.setActiveTool('select'); }}} title={`Group ${ctx.multiSelectedIds.length} selected elements`} size="md" />
    ) : null,
    ungroup: ctx.isUngroupEnabled ? (
      <ToolbarIconButton key="ungroup" icon={<Ungroup className="w-3.5 h-3.5" />} onClick={() => { if (ctx.onUngroupNode && ctx.targetGroupId) { ctx.onUngroupNode(ctx.targetGroupId); ctx.setActiveTool('select'); }}} title="Ungroup selected group" size="md" />
    ) : null,
    blueprints: (
      <ToolbarIconButton key="blueprints" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={ctx.onOpenGallery} title="Blueprints & Templates (B)" size="md" />
    ),
    config: (
      <ToolbarIconButton key="config" icon={<Settings className="w-3.5 h-3.5" />} onClick={ctx.onOpenConfig} title="Module Signature & Governance" size="md" />
    ),
    live: (
      <ToolbarIconButton key="live" icon={<Zap className="w-3.5 h-3.5 fill-current" />} active={ctx.isLiveMode} onClick={ctx.onToggleLive} title={ctx.isLiveMode ? "HIL Engine: Live (Click to disconnect)" : "HIL Engine: Connect to WASM"} size="md" colorVariant="accent" className={ctx.isLiveMode ? 'tool-active-glow-accent' : ''} />
    ),
    zen: (
      <ToolbarIconButton key="zen" icon={ctx.isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} active={ctx.isZenMode} onClick={ctx.onToggleZen} title={ctx.isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"} size="md" className={ctx.isZenMode ? 'shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]' : ''} />
    ),
    'numeric-resize': ctx.selectedNodeId ? (
      <ToolbarIconButton key="numeric-resize" icon={<Ruler className="w-3.5 h-3.5" />} active={ctx.showNumericResize} onClick={ctx.handleOpenNumericResize} title="Numeric Resize (Ctrl+Alt+R)" size="md" />
    ) : null,
    'numeric-rotate': ctx.selectedNodeId ? (
      <ToolbarIconButton key="numeric-rotate" icon={<Rotate3D className="w-3.5 h-3.5" />} active={ctx.showNumericRotate} onClick={ctx.handleOpenNumericRotate} title="Numeric Rotate (Ctrl+Alt+T)" size="md" />
    ) : null,
  };
}

// ── Component ────────────────────────────────────────────────────────
export default function ToolbarButtons({ ctx, layout, onToggleCustomize }: ToolbarButtonsProps) {
  const buttonMap = buildButtonMap(ctx);
  const { renderedButtons, items, cols } = layout;

  // ── Rendered buttons (already filtered by hook) ──────────────────
  const renderedButtonElements: { id: string; element: ReactNode }[] = [];
  for (const btn of renderedButtons) {
    const el = buttonMap[btn.id];
    if (el !== null && el !== undefined) {
      renderedButtonElements.push({ id: btn.id, element: el });
    }
  }

  // ── Items with dividers (for single-column mode) ───────────────────
  const itemsWithElements: ({ type: 'button'; id: string; element: ReactNode } | { type: 'divider' })[] = items.map((item) => {
    if (item.type === 'divider') return { type: 'divider' as const };
    const el = buttonMap[item.id];
    return { type: 'button' as const, id: item.id, element: el };
  });

  const customizeBtn = (
    <ToolbarIconButton key="customize" icon={<Settings2 className="w-3 h-3" />} onClick={onToggleCustomize} title="Customize Toolbar" size="md" className="opacity-40 hover:opacity-100 transition-opacity" />
  );

  if (cols === 1) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        {itemsWithElements.map((item, idx) => {
          if (item.type === 'divider') {
            return (
              <div
                key={`div-${idx}`}
                className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0"
              />
            );
          }
          return item.element;
        })}
        {/* Separator + Customize button */}
        <div className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0" />
        {customizeBtn}
      </div>
    );
  }

  return (
    <>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
        }}
      >
        {renderedButtonElements.map(b => b.element)}
      </div>
      {/* Customize button below grid */}
      <div className="w-6 h-[1px] wb-outline opacity-20 my-1 shrink-0" />
      {customizeBtn}
    </>
  );
}

