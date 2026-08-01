'use client';

/**
 * @purpose Renderiza un menú de contexto para el panel de capas en el editor de manifest OMEGA, proporcionando opciones para agrupar, mover, duplicar, desagrupar y guardar plantillas de capas.
 * @purpose_en Renders a context menu for the LayersPanel in the OMEGA manifest editor, providing options to group, move, duplicate, ungroup, and save blueprints of layers.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1and2p2
 * @lastUpdated 2026-06-19T18:46:55.476Z
 */

interface LayersPanelContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  isGroup: boolean;
  multiSelectedIds: string[];
  onGroupSelected?: (() => void) | undefined;
  onGroupDown?: ((id: string) => void) | undefined;
  onMoveNodeUpDown?: ((id: string, direction: 'up' | 'down') => void) | undefined;
  onDuplicateItem?: ((id: string) => void) | undefined;
  onDuplicateGroup?: ((id: string) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((id: string) => void) | undefined;
  onClose: () => void;
}

export default function LayersPanelContextMenu({
  x, y, nodeId, isGroup,
  multiSelectedIds,
  onGroupSelected, onGroupDown,
  onMoveNodeUpDown,
  onDuplicateItem, onDuplicateGroup,
  onUngroupNode, onSaveGroupAsBlueprint,
  onClose,
}: LayersPanelContextMenuProps) {
  return (
    <div
      className="fixed z-[1000] bg-[#0c0c0d] border border-white/10 rounded-xs shadow-[0_0_15px_rgba(0,0,0,0.7)] p-1 flex flex-col gap-0.5 min-w-[150px] font-sans"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {multiSelectedIds.length >= 2 && onGroupSelected && (
        <button onClick={() => { onGroupSelected(); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
          aria-label="Group selected elements"
        >Group Selected</button>
      )}
      {multiSelectedIds.length === 1 && onGroupDown && (
        <button onClick={() => { onGroupDown(nodeId); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
          aria-label="Group down"
        >Group Down</button>
      )}
      {multiSelectedIds.length === 1 && onMoveNodeUpDown && (<>
        <button onClick={() => { onMoveNodeUpDown(nodeId, 'up'); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
          aria-label="Move up"
        >Move Up (Alt+▲)</button>
        <button onClick={() => { onMoveNodeUpDown(nodeId, 'down'); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
          aria-label="Move down"
        >Move Down (Alt+▼)</button>
      </>)}
      {multiSelectedIds.length === 1 && !isGroup && onDuplicateItem && (
        <button onClick={() => { onDuplicateItem(nodeId); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
          aria-label="Duplicate layer"
        >Duplicate Layer</button>
      )}
      {multiSelectedIds.length === 1 && isGroup && onDuplicateGroup && (
        <button onClick={() => { onDuplicateGroup(nodeId); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1"
          aria-label="Duplicate group"
        >Duplicate Group</button>
      )}
      {multiSelectedIds.length === 1 && isGroup && onUngroupNode && (
        <button onClick={() => { onUngroupNode(nodeId); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors"
          aria-label="Ungroup"
        >Ungroup</button>
      )}
      {multiSelectedIds.length === 1 && isGroup && onSaveGroupAsBlueprint && (
        <button onClick={() => { onSaveGroupAsBlueprint(nodeId); onClose(); }}
          className="w-full text-left px-2 py-1.5 hover:bg-primary/20 hover:text-primary text-[8px] font-black uppercase tracking-widest text-white/80 transition-colors border-t border-white/5 pt-1.5"
          aria-label="Save as blueprint"
        >Save as Blueprint...</button>
      )}
    </div>
  );
}
