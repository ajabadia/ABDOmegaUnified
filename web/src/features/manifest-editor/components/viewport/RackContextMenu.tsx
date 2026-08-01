'use client';

/**
 * @purpose Gestiona un menú contextual para elementos de rack en el editor de manifesto OMEGA, proporcionando opciones para editar propiedades, duplicar, agrupar, desagrupar, bloquear, desbloquear, mostrar, ocultar y eliminar elementos.
 * @purpose_en Renders a context menu for rack elements in the OMEGA manifest editor, providing options to edit properties, duplicate, group, ungroup, lock, unlock, show, hide, and delete items.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1ggy76
 * @lastUpdated 2026-06-20T09:44:31.703Z
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Copy, Scissors, ClipboardPaste, Trash2, Eye, EyeOff, Lock, Unlock, Layers, Group, Ungroup, Maximize, Move, RotateCcw, ChevronRight, AlignStartHorizontal, AlignEndHorizontal, AlignStartVertical, AlignEndVertical, AlignCenter, LayoutDashboard, Grid3x3, Ruler, Plus
} from 'lucide-react';
import { CONTROL_DEFINITIONS, PORT_DEFINITIONS } from '../../constants/entityDefinitions';

interface RackContextMenuProps {
  x: number;
  y: number;
  targetId: string | null;
  rackX?: number;
  rackY?: number;
  isLocked: boolean;
  isHidden: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onGroup?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  onSnapToGrid?: (id: string) => void;
  isGroupEnabled?: boolean;
  isUngroupEnabled?: boolean;
  // Clipboard operations
  onCopy?: (() => void) | undefined;
  onCut?: (() => void) | undefined;
  onPaste?: ((targetPos?: { x: number; y: number }) => void) | undefined;
  canPaste?: boolean | undefined;

  // Transform operations
  onNumericResize?: (() => void) | undefined;
  onNumericRotate?: (() => void) | undefined;
  onCopyTransform?: (() => void) | undefined;
  onPasteTransform?: (() => void) | undefined;
  onAlign?: ((dir: string) => void) | undefined;
  onDistribute?: ((dir: string) => void) | undefined;

  // Empty space context menu
  onToggleGrid?: (() => void) | undefined;
  onToggleGuides?: (() => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void) | undefined;
  onReset?: (() => void) | undefined;
  onRename?: ((id: string) => void) | undefined;
  onBringToFront?: ((id: string) => void) | undefined;
  onSendToBack?: ((id: string) => void) | undefined;
  onSaveAsBlueprint?: ((id: string) => void) | undefined;
  onSelectAll?: (() => void) | undefined;
  isGroup?: boolean | undefined;
}

export default function RackContextMenu({
  x,
  y,
  targetId,
  rackX,
  rackY,
  isLocked,
  isHidden,
  onClose,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisibility,
  onGroup,
  onUngroup,
  onSnapToGrid,
  isGroupEnabled = true,
  isUngroupEnabled = true,
  onCopy,
  onCut,
  onPaste,
  canPaste,
  onNumericResize,
  onNumericRotate,
  onCopyTransform,
  onPasteTransform,
  onAlign,
  onDistribute,
  onToggleGrid,
  onToggleGuides,
  onAddEntity,
  onReset,
  onRename,
  onBringToFront,
  onSendToBack,
  onSaveAsBlueprint,
  onSelectAll,
  isGroup = false,
}: RackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setAdjustedPos({
        x: Math.min(x, maxX),
        y: Math.min(y, maxY),
      });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const pos = rackX !== undefined && rackY !== undefined ? { x: rackX, y: rackY } : undefined;

  if (targetId) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[200] bg-[#0a0a0b] border border-white/10 shadow-2xl py-1 min-w-[160px]"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        <MenuItem
          icon={<Layers className="w-3 h-3" />}
          label="Edit Properties"
          onClick={(e) => { e.stopPropagation(); onSelect(targetId); onClose(); }}
        />
        <MenuItem
          icon={<Layers className="w-3 h-3" />}
          label="Rename..."
          shortcut="F2"
          onClick={(e) => { e.stopPropagation(); onRename?.(targetId); onClose(); }}
        />
        <MenuItem
          icon={<Copy className="w-3 h-3" />}
          label="Duplicate"
          shortcut="Ctrl+D"
          onClick={(e) => { e.stopPropagation(); onDuplicate(targetId); onClose(); }}
        />
        <Divider />
        <MenuItem
          icon={<Copy className="w-3 h-3" />}
          label="Copy"
          shortcut="Ctrl+C"
          onClick={(e) => { e.stopPropagation(); onCopy?.(); onClose(); }}
        />
        <MenuItem
          icon={<Scissors className="w-3 h-3" />}
          label="Cut"
          shortcut="Ctrl+X"
          onClick={(e) => { e.stopPropagation(); onCut?.(); onClose(); }}
        />
        <MenuItem
          icon={<ClipboardPaste className="w-3 h-3" />}
          label="Paste"
          shortcut="Ctrl+V"
          disabled={!canPaste}
          onClick={(e) => { e.stopPropagation(); onPaste?.(); onClose(); }}
        />
        {onSnapToGrid && (
          <MenuItem
            icon={<Maximize className="w-3 h-3" />}
            label="Snap to Grid"
            onClick={(e) => { e.stopPropagation(); onSnapToGrid(targetId); onClose(); }}
          />
        )}
        <Divider />
        <MenuItem
          icon={<Layers className="w-3 h-3" />}
          label="Bring to Front"
          onClick={(e) => { e.stopPropagation(); onBringToFront?.(targetId); onClose(); }}
        />
        <MenuItem
          icon={<Layers className="w-3 h-3" />}
          label="Send to Back"
          onClick={(e) => { e.stopPropagation(); onSendToBack?.(targetId); onClose(); }}
        />
        {isGroup && (
          <MenuItem
            icon={<Group className="w-3 h-3" />}
            label="Save as Blueprint..."
            onClick={(e) => { e.stopPropagation(); onSaveAsBlueprint?.(targetId); onClose(); }}
          />
        )}
        {/* ── Transform Submenu ── */}
        <SubmenuTrigger icon={<Move className="w-3 h-3" />} label="Transform">
          <MenuItem
            icon={<Maximize className="w-3 h-3" />}
            label="Mouse Resize"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
          <MenuItem
            icon={<Maximize className="w-3 h-3" />}
            label="Numeric Resize..."
            shortcut="Ctrl+Alt+R"
            onClick={(e) => { e.stopPropagation(); onNumericResize?.(); onClose(); }}
          />
          <MenuItem
            icon={<RotateCcw className="w-3 h-3" />}
            label="Mouse Rotate"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />
          <MenuItem
            icon={<RotateCcw className="w-3 h-3" />}
            label="Numeric Rotate..."
            shortcut="Ctrl+Alt+T"
            onClick={(e) => { e.stopPropagation(); onNumericRotate?.(); onClose(); }}
          />
          <Divider />
          <MenuItem
            icon={<Copy className="w-3 h-3" />}
            label="Copy Transform"
            shortcut="Ctrl+Alt+C"
            onClick={(e) => { e.stopPropagation(); onCopyTransform?.(); onClose(); }}
          />
          <MenuItem
            icon={<Copy className="w-3 h-3" />}
            label="Paste Transform"
            shortcut="Ctrl+Alt+V"
            onClick={(e) => { e.stopPropagation(); onPasteTransform?.(); onClose(); }}
          />
          <Divider />
          <SubmenuTrigger icon={<LayoutDashboard className="w-3 h-3" />} label="Align">
            <MenuItem icon={<AlignStartHorizontal className="w-3 h-3" />} label="Left" onClick={(e) => { e.stopPropagation(); onAlign?.('left'); onClose(); }} />
            <MenuItem icon={<AlignCenter className="w-3 h-3" />} label="Center" onClick={(e) => { e.stopPropagation(); onAlign?.('center-h'); onClose(); }} />
            <MenuItem icon={<AlignEndHorizontal className="w-3 h-3" />} label="Right" onClick={(e) => { e.stopPropagation(); onAlign?.('right'); onClose(); }} />
            <Divider />
            <MenuItem icon={<AlignStartVertical className="w-3 h-3" />} label="Top" onClick={(e) => { e.stopPropagation(); onAlign?.('top'); onClose(); }} />
            <MenuItem icon={<AlignCenter className="w-3 h-3" />} label="Middle" onClick={(e) => { e.stopPropagation(); onAlign?.('center-v'); onClose(); }} />
            <MenuItem icon={<AlignEndVertical className="w-3 h-3" />} label="Bottom" onClick={(e) => { e.stopPropagation(); onAlign?.('bottom'); onClose(); }} />
          </SubmenuTrigger>
          <SubmenuTrigger icon={<LayoutDashboard className="w-3 h-3" />} label="Distribute">
            <MenuItem icon={<AlignStartHorizontal className="w-3 h-3" />} label="Horizontally" onClick={(e) => { e.stopPropagation(); onDistribute?.('horizontal'); onClose(); }} />
            <MenuItem icon={<AlignStartVertical className="w-3 h-3" />} label="Vertically" onClick={(e) => { e.stopPropagation(); onDistribute?.('vertical'); onClose(); }} />
          </SubmenuTrigger>
        </SubmenuTrigger>
        <Divider />

        {onGroup && (
          <MenuItem
            icon={<Group className="w-3 h-3" />}
            label="Group"
            shortcut="Ctrl+G"
            disabled={!isGroupEnabled}
            onClick={(e) => { e.stopPropagation(); onGroup([targetId]); onClose(); }}
          />
        )}
        {onUngroup && (
          <MenuItem
            icon={<Ungroup className="w-3 h-3" />}
            label="Ungroup"
            shortcut="Ctrl+Shift+Alt+G"
            disabled={!isUngroupEnabled}
            onClick={(e) => { e.stopPropagation(); onUngroup(targetId); onClose(); }}
          />
        )}
        <Divider />
        <MenuItem
          icon={isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          label={isLocked ? 'Unlock' : 'Lock'}
          onClick={(e) => { e.stopPropagation(); onToggleLock(targetId); onClose(); }}
        />
        <MenuItem
          icon={isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          label={isHidden ? 'Show' : 'Hide'}
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(targetId); onClose(); }}
        />
        <Divider />
        <MenuItem
          icon={<Trash2 className="w-3 h-3 text-red-500" />}
          label="Delete"
          shortcut="Del"
          danger
          onClick={(e) => { e.stopPropagation(); onDelete(targetId); onClose(); }}
        />
      </div>
    );
  }

  // ── Empty Space Context Menu ──
  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-[#0a0a0b] border border-white/10 shadow-2xl py-1 min-w-[160px]"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <MenuItem
        icon={<ClipboardPaste className="w-3 h-3" />}
        label="Paste Here"
        disabled={!canPaste}
        onClick={(e) => { e.stopPropagation(); onPaste?.(pos); onClose(); }}
      />
      <Divider />
      <SubmenuTrigger icon={<Plus className="w-3 h-3" />} label="Add Control">
        {CONTROL_DEFINITIONS.map((def) => {
          const Icon = def.icon;
          return (
            <MenuItem
              key={def.type}
              icon={<Icon className="w-3 h-3" />}
              label={def.label}
              onClick={(e) => {
                e.stopPropagation();
                onAddEntity?.('control', { type: def.type, size: def.size, ...def.template, ...(pos ? { pos } : {}) });
                onClose();
              }}
            />
          );
        })}
      </SubmenuTrigger>
      <SubmenuTrigger icon={<Plus className="w-3 h-3" />} label="Add Port">
        {PORT_DEFINITIONS.map((port) => {
          const PortIcon = port.icon;
          return (
            <div key={port.family} className="px-2 py-1 border-b border-white/5 last:border-b-0">
              <div className={`flex items-center gap-1 text-[6px] font-black uppercase ${port.color} tracking-wider mb-0.5`}>
                <PortIcon className="w-2 h-2" />
                <span>{port.family}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onAddEntity?.('jack', { type: 'port', label: port.inLabel, ...(pos ? { pos } : {}) }); onClose(); }}
                  className={`px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 ${port.hoverColor} border border-white/5 transition-colors`}
                  aria-label={`${port.family} input port`}
                >
                  In
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddEntity?.('jack', { type: 'port', label: port.outLabel, ...(pos ? { pos } : {}) }); onClose(); }}
                  className={`px-1 py-0.5 rounded-xs text-[7px] font-black uppercase text-center bg-white/5 text-white/70 ${port.hoverColor} border border-white/5 transition-colors`}
                  aria-label={`${port.family} output port`}
                >
                  Out
                </button>
              </div>
            </div>
          );
        })}
      </SubmenuTrigger>
      <Divider />
      <SubmenuTrigger icon={<Grid3x3 className="w-3 h-3" />} label="Grid & Guides">
        <MenuItem
          icon={<Grid3x3 className="w-3 h-3" />}
          label="View Grid"
          onClick={(e) => { e.stopPropagation(); onToggleGrid?.(); onClose(); }}
        />
        <MenuItem
          icon={<Ruler className="w-3 h-3" />}
          label="Show Guides"
          onClick={(e) => { e.stopPropagation(); onToggleGuides?.(); onClose(); }}
        />
      </SubmenuTrigger>
      <Divider />
      <MenuItem
        icon={<Grid3x3 className="w-3 h-3" />}
        label="Select All"
        shortcut="Ctrl+A"
        onClick={(e) => { e.stopPropagation(); onSelectAll?.(); onClose(); }}
      />
      <Divider />
      <MenuItem
        icon={<RotateCcw className="w-3 h-3" />}
        label="Reset Workspace"
        onClick={(e) => { e.stopPropagation(); onReset?.(); onClose(); }}
      />
    </div>
  );
}

function MenuItem({ icon, label, shortcut, onClick, danger, disabled }: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
        disabled
          ? 'text-white/30 cursor-not-allowed opacity-40'
          : danger
            ? 'text-red-400 hover:bg-red-500 hover:text-white'
            : 'text-white/70 hover:bg-primary hover:text-black'
      }`}
    >
      {icon}
      <span>{label}</span>
      {shortcut && (
        <span className="text-[7px] font-mono text-white/30 tracking-normal normal-case ml-auto pl-2">{shortcut}</span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-white/10 my-1 mx-2" />;
}

/** Submenu trigger with hover-to-open behavior */
function SubmenuTrigger({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const subRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/70 hover:bg-primary hover:text-black transition-all cursor-pointer">
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <ChevronRight className="w-2.5 h-2.5" />
      </div>
      {isOpen && (
        <div
          ref={subRef}
          className="absolute left-full top-0 ml-0 w-[180px] bg-[#0a0a0b] border border-white/10 shadow-2xl py-1 z-[210]"
        >
          {children}
        </div>
      )}
    </div>
  );
}


