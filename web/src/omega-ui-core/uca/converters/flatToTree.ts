/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Convierte un ACEMM plano / schema de runtime en un árbol OmegaNode recursivo canónico, preservando ediciones previas del editor.
 * @purpose_en Converts a flat runtime ACEMM / schema into a canonical recursive OmegaNode tree, preserving prior editor edits.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:7x1k2q
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { Attachment, Dimensions, OmegaNode, OmegaStyleNode, Position, Presentation } from '../../types/manifest';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../panelGeometry';

/**
 * Runtime / legacy flat item shape.
 * Tolerates: canonical ACEMM (id/role/presentation), the C++ runtime exporter
 * ({ bind, type, label, pos, presentation:{...} } — no id/role/size), and legacy
 * flat entries ({ x, y, w, h, source }).
 */
export interface RuntimeFlatItem {
  id?: string;
  bind?: string;
  paramId?: string;
  source?: string;
  portId?: string;
  type?: string;
  role?: string;
  label?: string;
  pos?: Partial<Position>;
  x?: number;
  y?: number;
  w?: number | string;
  h?: number | string;
  width?: number;
  height?: number;
  zIndex?: number;
  presentation?: Partial<Presentation> & { size?: Partial<Dimensions>; group?: string };
  attachments?: Attachment[];
  children?: RuntimeFlatItem[];
}

export interface RuntimeFlatContainer {
  id?: string;
  label?: string;
  pos?: Partial<Position>;
  size?: {
    w?: number | string | undefined;
    h?: number | string | undefined;
    width?: number | string | undefined;
    height?: number | string | undefined;
  };
  zIndex?: number;
  variant?: string;
  tab?: string;
  color?: string;
  indicatorColor?: string;
  rounding?: number;
  borderWidth?: number;
}

/**
 * Loose manifest-like input accepted by flatToTree.
 */
export interface RuntimeFlatManifest {
  id?: string;
  ui?: {
    skin?: string;
    dimensions?: Partial<Dimensions>;
    controls?: RuntimeFlatItem[];
    jacks?: RuntimeFlatItem[];
    layout?: {
      width?: number;
      height?: number;
      gridSnap?: number;
      containers?: RuntimeFlatContainer[];
    };
  };
}

function toNumber(v: number | string | undefined, rackWidth: number): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  const s = v.trim();
  if (s === 'full' || s === '100%') return rackWidth;
  if (s === '1/2' || s === '50%') return rackWidth * 0.5;
  const n = parseFloat(s);
  return isFinite(n) ? n : undefined;
}

function toDimensions(
  size: { width?: number | string | undefined; height?: number | string | undefined; w?: number | string | undefined; h?: number | string | undefined } | undefined,
  rackWidth: number
): Dimensions | undefined {
  if (!size) return undefined;
  const width = toNumber(size.width ?? size.w, rackWidth);
  const height = toNumber(size.height ?? size.h, rackWidth);
  if (width === undefined || height === undefined) return undefined;
  return { width, height };
}

function toPos(pos: Partial<Position> | undefined, x?: number, y?: number): Position {
  return { x: pos?.x ?? x ?? 0, y: pos?.y ?? y ?? 0 };
}

/**
 * Indexes every node of a tree by id (recursive), so edit state can be preserved.
 */
function indexTree(tree: OmegaNode | undefined, out: Map<string, OmegaNode> = new Map()): Map<string, OmegaNode> {
  if (!tree) return out;
  out.set(tree.id, tree);
  (tree.children || []).forEach(child => indexTree(child, out));
  return out;
}

function assetLayers(attachments: Attachment[] | undefined, existing: OmegaNode | undefined): OmegaNode[] | undefined {
  const existingChildren = existing?.children?.filter(c => c.kind === 'asset-layer');
  if (existingChildren && existingChildren.length > 0) return existingChildren;
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.map(a => ({
    id: a.id,
    kind: 'asset-layer' as const,
    role: (a.role as OmegaNode['role']) || 'decor',
    bind: a.bind || undefined,
    layout: {
      pos: { x: a.offsetX ?? a.pos?.x ?? 0, y: a.offsetY ?? a.pos?.y ?? 0 }
    },
    style: {
      ...a.style,
      font: a.fontFamily || a.style?.font,
      fontSize: a.fontSize || a.style?.fontSize,
      fontColor: a.fontColor || a.style?.fontColor
    }
  }));
}

/**
 * flatToTree
 * Normalizes a flat runtime ACEMM / schema into a canonical OmegaNode tree whose
 * shape matches manifestToTree output (root rack → MAIN_FACE → containers → cells),
 * so ManifestRenderer / collectBindingsFromTree accept it.
 *
 * Preservation: when existingTree is supplied, any node with a matching id keeps its
 * prior layout.pos / layout.size / zIndex / style / meta / label instead of being
 * recomputed from the flat data — editor edits are never wiped on manifest load.
 */
export function flatToTree(manifest: Partial<RuntimeFlatManifest>, existingTree?: OmegaNode): OmegaNode {
  const ui = manifest?.ui || {};
  const rackWidth = toNumber(ui.dimensions?.width ?? ui.layout?.width, DEFAULT_PANEL_WIDTH) || DEFAULT_PANEL_WIDTH;
  const rackHeight = toNumber(ui.dimensions?.height ?? ui.layout?.height, DEFAULT_PANEL_HEIGHT) || DEFAULT_PANEL_HEIGHT;

  const existingById = indexTree(existingTree);
  const existingMainFace = existingTree?.children?.find(c => c.id === 'MAIN_FACE');

  const root: OmegaNode = {
    id: manifest?.id || 'anonymous_rack',
    kind: 'rack',
    role: 'root',
    layout: {
      pos: existingTree?.layout?.pos || { x: 0, y: 0 },
      size: existingTree?.layout?.size || { width: rackWidth, height: rackHeight }
    },
    children: []
  };

  const mainFace: OmegaNode = {
    id: 'MAIN_FACE',
    kind: 'face',
    role: 'presentation',
    layout: {
      pos: existingMainFace?.layout?.pos || { x: 0, y: 0 },
      size: existingMainFace?.layout?.size || { width: rackWidth, height: rackHeight }
    },
    children: []
  };
  root.children?.push(mainFace);

  const containerMap = new Map<string, OmegaNode>();
  (ui.layout?.containers || []).forEach(c => {
    const existing = existingById.get(c.id || '');
    const node: OmegaNode = {
      id: c.id || `container_${containerMap.size}`,
      kind: 'container',
      role: 'infrastructure',
      layout: {
        pos: existing?.layout?.pos || toPos(c.pos),
        size: existing?.layout?.size || toDimensions(c.size, rackWidth),
        zIndex: existing?.layout?.zIndex ?? c.zIndex
      },
      style: existing?.style || {
        color: c.color || undefined,
        indicatorColor: c.indicatorColor || undefined,
        rounding: c.rounding || undefined,
        borderWidth: c.borderWidth || undefined,
        variant: c.variant || undefined
      },
      children: existing?.children || []
    };
    containerMap.set(node.id, node);
    mainFace.children?.push(node);
  });

  const allEntities = [...(ui.controls || []), ...(ui.jacks || [])];
  allEntities.forEach((entity, idx) => {
    const fallbackId = entity.bind || entity.paramId || entity.source || entity.portId || `entity_${idx}`;
    const id = entity.id || fallbackId;
    const existing = existingById.get(id);
    const component = entity.presentation?.component;
    const isJack = (entity.role === 'io')
      || (entity.type?.startsWith?.('jack'))
      || (component === 'port');
      const cellRef = isJack ? 'port' : (component || entity.type || fallbackId);

    const node: OmegaNode = {
      id,
      kind: 'cell',
      role: existing?.role || entity.role || (isJack ? 'io' : 'control'),
      bind: entity.bind || entity.paramId || entity.source || entity.portId || id,
      layout: {
        pos: existing?.layout?.pos || toPos(entity.pos, entity.x, entity.y),
        size: existing?.layout?.size
          || toDimensions(entity.presentation?.size, rackWidth)
          || toDimensions({ width: entity.width ?? entity.w, height: entity.height ?? entity.h }, rackWidth),
        zIndex: existing?.layout?.zIndex ?? entity.presentation?.style?.zIndex ?? entity.zIndex
      },
      style: existing?.style || ({
        ...(entity.presentation?.style as OmegaStyleNode | undefined),
        variant: entity.presentation?.variant ?? entity.presentation?.style?.variant
      }),
      cellRef,
      meta: existing?.meta ?? (entity.label ? { label: entity.label } : undefined),
      children: assetLayers(entity.attachments, existing)
    };

    const containerId = entity.presentation?.container || entity.presentation?.group;
    const targetParent = containerId ? containerMap.get(containerId) : mainFace;
    if (targetParent) {
      targetParent.children = targetParent.children || [];
      targetParent.children.push(node);
    } else {
      mainFace.children?.push(node);
    }
  });

  return root;
}
