'use client';

/**
 * @purpose Gestiona nodos basados en plantillas para su inyección en el árbol UCA dentro del editor de manifesto OMEGA.
 * @purpose_en Manages template-based nodes for injection into the UCA tree within the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:pt06b9
 * @lastUpdated 2026-06-15T13:10:46.388Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ModuleTemplate, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from './ucaInspectorAdapter';


/**
 * useTemplateCRUD (Phase 5.4)
 * Handles injection of template-based nodes into the UCA tree.
 */
export const useTemplateCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest>, label?: string) => void,
  addLog: (msg: string) => void
) => {

  const registerTemplate = useCallback((template: ModuleTemplate) => {
    const nextLibrary = { ...(manifest.moduleTemplates || {}) };
    nextLibrary[template.id] = template;

    updateManifest({
      moduleTemplates: nextLibrary
    }, `[DNA] Register Template: ${template.label}`);

    addLog(`[DNA] Template '${template.label}' certified and registered in library.`);
  }, [manifest, updateManifest, addLog]);

  const removeTemplate = useCallback((id: string) => {
    const nextLibrary = { ...(manifest.moduleTemplates || {}) };
    const label = nextLibrary[id]?.label || id;
    delete nextLibrary[id];

    updateManifest({ moduleTemplates: nextLibrary } as Partial<OMEGA_Manifest>, `Update Template: ${id}`);

    addLog(`[DNA] Template '${label}' removed from library.`);
  }, [manifest, updateManifest, addLog]);

  const applyTemplate = useCallback((template: ModuleTemplate) => {
    addLog(`[SYSTEM] Injecting Blueprint: ${template.label} (v${template.version || '1.0'})...`);

    // 1. Ensure the manifest supports UCA
    const currentTree = manifest.ui?.tree || {
      id: 'root',
      kind: 'rack',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: []
    };

    // 2. Create the Template Instance Node
    const newNode: OmegaNode = {
      id: `${template.id}_${Math.random().toString(36).substr(2, 4)}`,
      kind: 'cell',
      role: template.category || 'structure',
      cellRef: template.id,
      layout: {
        pos: { x: 10, y: 10 }, 
        mode: (template.baseNode)?.layout?.mode || 'absolute'
      },
      overrides: {},
      slotMappings: {}
    };

    // 3. Initialize required slot mappings
    (template.slots || []).forEach((slot: { id: string }) => {
      if (newNode.slotMappings) {
        newNode.slotMappings[slot.id] = ''; 
      }
    });

    const updatedTree = {
      ...currentTree,
      children: [...(currentTree.children || []), newNode]
    };

    updateManifest({
      ui: {
        ...manifest.ui,
        tree: updatedTree
      }
    }, `Apply Template: ${template.label}`);

    addLog(`[SUCCESS] Template '${template.label}' injected into workspace.`);
  }, [manifest, updateManifest, addLog]);

  const exportSelectedAsBlueprint = useCallback((nodeId: string) => {
    const tree = manifest.ui?.tree;
    if (!tree) {
      addLog('[ERROR] No UCA tree found. Cannot export blueprint.');
      return;
    }
    const node = findNodeInTree(tree, nodeId);
    if (!node || (node.kind !== 'container' && node.kind !== 'face')) {
      addLog(`[ERROR] Solo se pueden exportar contenedores o módulos estructurales como blueprints.`);
      alert("Solo se pueden exportar contenedores o módulos estructurales como blueprints.");
      return;
    }

    // Estructurar el Blueprint según ADR-011
    const blueprintFile = {
      id: node.id.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: (node.meta?.label as string) || `Custom ${node.id}`,
      category: node.kind === 'face' ? 'structure' : 'composite',
      description: `Exported custom module from design workspace.`,
      version: "1.0.0",
      policy: [],
      slots: [],
      baseNode: JSON.parse(JSON.stringify(node))
    };

    // Crear descarga del archivo
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprintFile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${blueprintFile.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`[SUCCESS] Blueprint exportado: ${blueprintFile.id}.json`);
  }, [manifest, addLog]);

  return {
    registerTemplate,
    removeTemplate,
    applyTemplate,
    exportSelectedAsBlueprint
  };
};

