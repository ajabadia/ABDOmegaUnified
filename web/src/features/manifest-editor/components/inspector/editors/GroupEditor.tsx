'use client';

/**
 * @purpose Gestiona la edición de nodos de grupo en el editor de manifesto OMEGA, permitiendo a los usuarios gestionar componentes hijos y guardar configuraciones como plantillas.
 * @purpose_en Manages the editing of group nodes in the OMEGA manifest editor, allowing users to manage child components and save configurations as blueprints.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:1a0vt11
 * @lastUpdated 2026-06-15T11:29:51.207Z
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { GroupNode } from '../../../../../omega-ui-core/types/rack';
import ExposeParametersDialog, { type ExposedParam } from '../../modals/ExposeParametersDialog';

export interface GroupEditorProps {
  node: GroupNode;
  onChange: (updates: Partial<GroupNode>) => void;
  /** Called when user clicks "Save as Blueprint..." */
  onSaveAsBlueprint?: ((group: GroupNode, exposedParams?: ExposedParam[]) => void) | undefined;
  /** Called when user clicks "Ungroup" to dissolve this group */
  onUngroupNode?: ((groupId: string) => void) | undefined;
  /** Nesting depth (for recursive groups) */
  depth?: number | undefined;
}

// ── Attribute options for the quick-edit summary ───────────────────────

function ChildAttributeSummary({ child }: { child: GroupNode['children'][number] }) {
  const parts: string[] = [];
  if (child.bind?.target) parts.push(`bind:${child.bind.target}`);
  if (child.style?.variant) parts.push(`var:${child.style.variant}`);
  if (child.style?.color) parts.push(`clr:${child.style.color}`);
  if (child.bind?.min !== undefined) parts.push(`min:${child.bind.min}`);
  if (child.bind?.max !== undefined) parts.push(`max:${child.bind.max}`);
  if (parts.length === 0) return null;
  return (
    <span className="text-[6px] font-mono wb-text-muted opacity-40 truncate max-w-[100px]">
      {parts.join(' | ')}
    </span>
  );
}

/** Accordion row for editing a single child's parameters (Label, Variant, Bind, Min, Max). */
function ChildAccordionRow({
  child,
  index,
  onUpdateChild,
}: {
  child: GroupNode['children'][number];
  index: number;
  onUpdateChild: (updates: Partial<GroupNode['children'][number]>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isSubGroup = (child as unknown as Record<string, unknown>).type === 'group';

  return (
    <div className="border border-white/5 rounded bg-black/20 overflow-hidden">
      {/* Accordion header */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[9px] text-gray-500 w-4 shrink-0 tabular-nums">{index + 1}</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-primary shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
        )}
        {isSubGroup ? (
          <FolderOpen className="w-3 h-3 text-cyan-400/60 shrink-0" />
        ) : (
          <span className="text-[8px] font-mono text-gray-500 uppercase w-16 shrink-0">{child.type}</span>
        )}
        <span className="text-[9px] font-bold text-white flex-1 truncate">{child.label || child.id}</span>
        <ChildAttributeSummary child={child} />
      </div>

      {/* Expandable editing panel */}
      {isOpen && (
        <div className="p-2 border-t border-white/5 bg-black/40 space-y-1.5">
          {/* If child is a sub-group, render recursively */}
          {isSubGroup ? (
            <div className="text-[8px] font-mono text-cyan-400/60 italic px-1 py-2">
              ↳ Nested group ({child.id})
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Label</label>
                <input
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
                  value={child.label || ''}
                  onChange={(e) => onUpdateChild({ label: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Variant</label>
                <input
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
                  value={child.style?.variant || ''}
                  onChange={(e) =>
                    onUpdateChild({
                      style: { ...child.style, variant: e.target.value },
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Bind</label>
                <input
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
                  value={child.bind?.target || ''}
                  onChange={(e) =>
                    onUpdateChild({
                      bind: e.target.value ? { ...child.bind, target: e.target.value } : undefined,
                    })
                  }
                />
              </div>
              {(child.type === 'knob' || child.type === 'slider') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-gray-500 block uppercase tracking-wider">Min</label>
                    <input
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
                      type="number"
                      value={child.bind?.min ?? 0}
                      onChange={(e) =>
                        onUpdateChild({
                          bind: { ...(child.bind || { target: '' }), min: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-gray-500 block uppercase tracking-wider">Max</label>
                    <input
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
                      type="number"
                      value={child.bind?.max ?? 1}
                      onChange={(e) =>
                        onUpdateChild({
                          bind: { ...(child.bind || { target: '' }), max: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                </div>
              )}
              {(child.type === 'port' || child.bind) && (
                <div className="flex items-center gap-2">
                  <label className="text-[8px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Color</label>
                  <input
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white font-mono"
                    value={child.style?.color || ''}
                    onChange={(e) =>
                      onUpdateChild({
                        style: { ...child.style, color: e.target.value },
                      })
                    }
                    placeholder="e.g. B_cyan"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function GroupEditor({ node, onChange, onSaveAsBlueprint, onUngroupNode, depth = 0 }: GroupEditorProps) {
  const [showExposeDialog, setShowExposeDialog] = useState(false);

  const handleUpdateChild = (
    childId: string,
    childUpdates: Partial<GroupNode['children'][number]>
  ) => {
    const updatedChildren = node.children.map((c) =>
      c.id === childId ? ({ ...c, ...childUpdates } as GroupNode['children'][number]) : c
    );
    onChange({ children: updatedChildren });
  };

  const handleSaveWithParams = (exposedParams: ExposedParam[]) => {
    setShowExposeDialog(false);
    onSaveAsBlueprint?.(node, exposedParams);
  };

  const hasSubGroups = node.children.some((c) => (c as unknown as Record<string, unknown>).type === 'group' || (c as unknown as Record<string, unknown>).kind === 'group');

  return (
    <div className="space-y-3 p-3" style={{ paddingLeft: `${depth * 8}px` }}>
      {/* Nested group indicator */}
      {depth > 0 && (
        <div className="flex items-center gap-1.5 text-[7px] font-mono text-cyan-400/40 border-l-2 border-cyan-400/20 pl-2 mb-1">
          <Folder className="w-2.5 h-2.5" />
          Nested Group (depth {depth})
        </div>
      )}

      {/* Group identity header */}
      <div className="text-[8px] text-gray-500 font-mono truncate flex items-center gap-2">
        <span className="text-[6px] uppercase tracking-widest text-gray-600">ID:</span>
        <span>{node.id}</span>
        {hasSubGroups && (
          <span className="text-cyan-400/40 text-[6px]">
            (contains nested groups)
          </span>
        )}
      </div>

      {/* Group label */}
      <div className="flex items-center gap-2">
        <label className="text-[9px] text-gray-400 w-10 shrink-0 uppercase tracking-wider">Label</label>
        <input
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-white font-mono"
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      {/* Group position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[8px] text-gray-500 block uppercase tracking-wider">X</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
            type="number"
            value={node.pos.x}
            onChange={(e) => onChange({ pos: { x: Number(e.target.value), y: node.pos.y } })}
          />
        </div>
        <div>
          <label className="text-[8px] text-gray-500 block uppercase tracking-wider">Y</label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-1 py-0.5 text-[9px] text-white font-mono"
            type="number"
            value={node.pos.y}
            onChange={(e) => onChange({ pos: { x: node.pos.x, y: Number(e.target.value) } })}
          />
        </div>
      </div>

      {/* Accordion children list */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[8px] text-gray-500 uppercase tracking-wider">
            Group Components ({node.children.length})
            {hasSubGroups && <span className="text-cyan-400/40 ml-1">⟐ nested</span>}
          </label>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          {node.children.map((child, i) => {
            // If child is a sub-group, render recursively
            // Use a duck-type check since ComponentType doesn't include 'group'
            const isSubGroup = (child as unknown as Record<string, unknown>).type === 'group' || (child as unknown as Record<string, unknown>).kind === 'group';
            if (isSubGroup) {
              const subGroupNode: GroupNode = {
                id: child.id,
                label: child.label,
                pos: child.pos,
                children: (child as unknown as { children?: GroupNode['children'] }).children || [],
              };
              return (
                <div key={child.id} className="border border-cyan-400/10 rounded bg-cyan-400/[0.02]">
                  <GroupEditor
                    node={subGroupNode}
                    onChange={(updates) => handleUpdateChild(child.id, updates)}
                    onSaveAsBlueprint={onSaveAsBlueprint}
                    onUngroupNode={onUngroupNode}
                    depth={depth + 1}
                  />
                </div>
              );
            }
            return (
              <ChildAccordionRow
                key={child.id}
                child={child}
                index={i}
                onUpdateChild={(upd) => handleUpdateChild(child.id, upd)}
              />
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <button
        onClick={() => onUngroupNode?.(node.id)}
        className="w-full text-[8px] font-black uppercase tracking-widest text-yellow-400 border border-yellow-400/30 rounded py-1.5 hover:bg-yellow-400/10 transition-all"
      >
        Ungroup
      </button>

      <button
        onClick={() => setShowExposeDialog(true)}
        className="w-full text-[8px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-400/30 rounded py-1.5 hover:bg-cyan-400/10 transition-all"
      >
        Save as Blueprint...
      </button>

      {/* Expose Parameters Dialog */}
      <ExposeParametersDialog
        isOpen={showExposeDialog}
        onClose={() => setShowExposeDialog(false)}
        groupNode={node}
        onConfirm={handleSaveWithParams}
      />
    </div>
  );
}
