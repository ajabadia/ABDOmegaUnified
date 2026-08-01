'use client';

/**
 * @purpose Gestiona plantillas personalizadas para el editor de manifesto OMEGA, proporcionando funcionalidad para guardar y exportarlas con personalización de parámetros opcionales.
 * @purpose_en Manages custom blueprints for the OMEGA manifest editor, providing functionality to save and export them with optional parameter customization.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:4,imports:7,sig:4j9wix
 * @lastUpdated 2026-06-15T13:22:02.448Z
 */

import { useState, useCallback } from 'react';
import type { BlueprintDefinition, BlueprintPlaceholder } from '@/omega-ui-core/types';
import { toast } from '@/features/manifest-editor/utils/toast';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { generateBlueprintThumbnail } from '@/omega-ui-core/utils/BlueprintThumbnailGenerator';
import type { GroupNode } from '@/omega-ui-core/types/rack';
import type { ExposedParam } from '@/features/manifest-editor/components/modals/ExposeParametersDialog';

// ── Types ──────────────────────────────────────────────────────────────

export interface UserBlueprintEntry {
  label: string;
  description: string | undefined;
  version: string | undefined;
  blueprint: BlueprintDefinition | undefined;
}

export interface GroupBlueprintEditor {
  addLog: (msg: string) => void;
  exportCellAsBlueprint?: (nodeId: string) => void;
}

export interface UseGroupBlueprintResult {
  userBlueprints: UserBlueprintEntry[];
  handleSaveGroupAsBlueprint: (groupNode: GroupNode, exposedParams?: ExposedParam[]) => void;
  handleSaveGroupAsBlueprintFromNodeId: (nodeId: string, tree: OmegaNode | undefined, exposedParams?: ExposedParam[]) => void;
  addUserBlueprintEntry: (entry: UserBlueprintEntry) => void;
  setUserBlueprints: React.Dispatch<React.SetStateAction<UserBlueprintEntry[]>>;
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Recursive tree search to find a node by ID.
 */
function findNodeInTree(node: OmegaNode, targetId: string): OmegaNode | null {
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Build a BlueprintDefinition from a GroupNode, optionally with exposed parameters
 * that become BlueprintPlaceholders for customization during injection.
 */
function buildBlueprintFromGroupNode(
  groupNode: GroupNode,
  exposedParams?: ExposedParam[],
): BlueprintDefinition {
  // Build BlueprintPlaceholder array from exposed params
  const placeholders: BlueprintPlaceholder[] | undefined = exposedParams && exposedParams.length > 0
    ? exposedParams.map((p) => ({
        id: `param_${p.childId}_${p.attribute}`,
        label: p.placeholderLabel,
        type: p.placeholderType,
        defaultValue: p.defaultValue,
        required: p.required,
        hint: `${p.childType} ${p.attribute} — editable at injection time`,
        description: `${p.childLabel} → ${p.attribute}`,
      }))
    : undefined;

  // When placeholders exist, mark child properties that should use template interpolation
  // The injection engine (ucaInjection.ts) will substitute {{param_xxx}} values
  const placeholderIdMap = new Map<string, string>();
  if (exposedParams) {
    for (const p of exposedParams) {
      placeholderIdMap.set(`${p.childId}::${p.attribute}`, `param_${p.childId}_${p.attribute}`);
    }
  }

  return {
    blueprintId: `bp_user_${groupNode.id}_${Date.now().toString(36)}`,
    version: '1.0.0',
    name: groupNode.label || 'Custom Composite Group',
    description: 'User-defined grouped template',
    origin: 'user',
    rootNode: {
      id: groupNode.id,
      kind: 'container',
      role: 'composite',
      layout: {
        pos: { x: groupNode.pos.x, y: groupNode.pos.y },
        mode: 'absolute',
      },
      children: groupNode.children.map((child) => {
        const node: import('@/omega-ui-core/types/manifest').OmegaBlueprintNode = {
          id: child.id,
          kind: 'cell' as const,
          cellRef: child.type,
          layout: {
            pos: { x: child.pos.x, y: child.pos.y },
            size: { width: child.size.width, height: child.size.height },
          },
          style: child.style as unknown as import('@/omega-ui-core/types/manifest').OmegaStyleNode,
          bind: child.bind?.target,
        };

        // If there are exposed parameters for this child, mark them in meta
        // The injection engine (ucaInjection.ts) will substitute {{param_xxx}} values
        if (exposedParams) {
          const labelPh = placeholderIdMap.get(`${child.id}::label`);
          const bindPh = placeholderIdMap.get(`${child.id}::bind`);
          const variantPh = placeholderIdMap.get(`${child.id}::variant`);
          const minPh = placeholderIdMap.get(`${child.id}::min`);
          const maxPh = placeholderIdMap.get(`${child.id}::max`);
          const colorPh = placeholderIdMap.get(`${child.id}::color`);

          // Store template metadata as a plain record on node (OmegaBlueprintNode doesn't have meta)
          const phMeta: Record<string, string> = {};
          if (labelPh) phMeta._phLabel = `{{${labelPh}}}`;
          if (bindPh) phMeta._phBind = `{{${bindPh}}}`;
          if (variantPh) phMeta._phVariant = `{{${variantPh}}}`;
          if (minPh) phMeta._phMin = `{{${minPh}}}`;
          if (maxPh) phMeta._phMax = `{{${maxPh}}}`;
          if (colorPh) phMeta._phColor = `{{${colorPh}}}`;

          // Store as overrides on the blueprint node
          const nodeAny = node as unknown as Record<string, unknown>;
          const existingOverrides = (nodeAny.overrides as Record<string, unknown>) || {};
          nodeAny.overrides = { ...existingOverrides, ...phMeta };

          // Store default value for thumbnail preview
          if (labelPh) {
            nodeAny._phLabelDefault = child.label || child.id;
          }
        }

        return node;
      }),
    },
    placeholders,
    compatibility: {
      allowedParentKinds: ['rack', 'container', 'group', 'face'],
      deniedParentKinds: ['cell'],
    },
    autoWirePolicy: { mode: 'none' },
    materializeSnapshot: false,
    defaultOverridePolicy: 'extendable',
  };
}

/**
 * Convert a raw OmegaNode from the UCA tree into a GroupNode-like structure.
 */
function nodeToGroupNode(node: OmegaNode): GroupNode {
  return {
    id: node.id,
    label: (node.meta?.label as string) || node.id,
    pos: node.layout?.pos || { x: 0, y: 0 },
    children: (node.children || []).map((c: OmegaNode) => ({
      id: c.id,
      type: (c.cellRef || c.kind || 'knob') as import('@/omega-ui-core/types/rack').ComponentType,
      label: (c.meta?.label as string) || c.id,
      pos: c.layout?.pos || { x: 0, y: 0 },
      size: c.layout?.size || { width: 48, height: 48 },
      style: c.style || {},
      bind: c.bind ? { target: c.bind } : undefined,
    })),
  };
}

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * useGroupBlueprint — saves groups as blueprints with user library management.
 *
 * R3 features:
 * - Exposed parameters: select which child attributes become BlueprintPlaceholders
 * - Versioning: auto-increment version on re-save of same blueprint
 * - SVG thumbnail generation
 */
export function useGroupBlueprint(
  editor: GroupBlueprintEditor,
): UseGroupBlueprintResult {
  const [userBlueprints, setUserBlueprints] = useState<UserBlueprintEntry[]>([]);

  const saveBlueprint = useCallback((
    groupNode: GroupNode,
    exposedParams?: ExposedParam[],
  ) => {
    // 1. Create a BlueprintDefinition from the GroupNode (with optional placeholders)
    const blueprint = buildBlueprintFromGroupNode(groupNode, exposedParams);

    // 2. Check if a blueprint with the same name already exists (versioning)
    const existing = userBlueprints.find(
      (entry) => entry.label === blueprint.name,
    );
    if (existing && existing.version) {
      const parts = existing.version.split('.');
      const patch = (parseInt(parts[parts.length - 1] || '0', 10) + 1);
      parts[parts.length - 1] = String(patch);
      blueprint.version = parts.join('.');
      editor.addLog(`[INFO] Blueprint '${blueprint.name}' updated to v${blueprint.version}.`);
    }

    // 3. Generate SVG thumbnail
    const thumbnailSvg = generateBlueprintThumbnail(
      blueprint.rootNode as unknown as OmegaNode,
    );
    blueprint.metadata = { thumbnail: thumbnailSvg };

    // 4. Register in userBlueprints state (replace existing if same name)
    setUserBlueprints((prev) => {
      const existingIdx = prev.findIndex((entry) => entry.label === blueprint.name);
      const entry: UserBlueprintEntry = {
        label: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        blueprint,
      };
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = entry;
        return next;
      }
      return [...prev, entry];
    });

    // 5. Export physical .acepack via existing export pipeline
    editor.exportCellAsBlueprint?.(groupNode.id);
    editor.addLog(`[OK] Group '${blueprint.name}' v${blueprint.version} exported to library and disk.`);
    toast.success(`Group saved as blueprint: ${blueprint.name}`);
  }, [editor, userBlueprints]);

  const handleSaveGroupAsBlueprint = useCallback(
    (groupNode: GroupNode, exposedParams?: ExposedParam[]) => {
      saveBlueprint(groupNode, exposedParams);
    },
    [saveBlueprint],
  );

  const handleSaveGroupAsBlueprintFromNodeId = useCallback(
    (nodeId: string, tree: OmegaNode | undefined, exposedParams?: ExposedParam[]) => {
      if (!tree) return;
      const node = findNodeInTree(tree, nodeId);
      if (!node) {
        editor.addLog(`[ERROR] Cell ${nodeId} not found in UCA tree.`);
        return;
      }
      const groupNode = nodeToGroupNode(node);
      saveBlueprint(groupNode, exposedParams);
    },
    [editor, saveBlueprint],
  );

  const addUserBlueprintEntry = useCallback(
    (entry: UserBlueprintEntry) => {
      setUserBlueprints((prev) => [...prev, entry]);
    },
    [],
  );

  return {
    userBlueprints,
    handleSaveGroupAsBlueprint,
    handleSaveGroupAsBlueprintFromNodeId,
    addUserBlueprintEntry,
    setUserBlueprints,
  };
}
