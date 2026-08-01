'use client';

/**
 * @purpose Gestiona la conversión de plantillas de módulo y datos de planificación V2 en definiciones de blueprint formal para su uso en el editor de manifesto OMEGA, asegurando la normalización industrial y proporcionando valores por defecto cuando sea necesario.
 * @purpose_en Manages the conversion of ModuleTemplates and V2BlueprintData into formal BlueprintDefinitions for use in the OMEGA manifest editor, ensuring industrial normalization and providing default values where necessary.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:2s49yj
 * @lastUpdated 2026-06-15T15:17:00.781Z
 */

import type { 
  ModuleTemplate, 
  BlueprintDefinition, 
  BlueprintCompatibility,
  BlueprintAutoWirePolicy,
  OmegaBlueprintNode,
  OmegaStyleNode,
  NodeKind
} from '@/omega-ui-core/types/manifest';
import type { V2BlueprintData } from '@/omega-ui-core/types';

/**
 * OMEGA Phase 9.4A - Canonical Blueprint Adapter
 * Ensures industrial normalization of legacy ModuleTemplates into formal BlueprintDefinitions.
 * Follows ADR-011 §A.2.
 */

export function adaptModuleTemplateToBlueprintDefinition(template: ModuleTemplate): BlueprintDefinition {
  // 1. Structural Validation (Strict Mapping)
  if (!template.id || !template.baseNode) {
    throw new Error(`[BLUEPRINT] Invalid ModuleTemplate: Missing ID or Base Node.`);
  }

  // 2. Default Compatibility (if missing)
  const compatibility: BlueprintCompatibility = template.compatibility || {
    allowedParentKinds: ['rack', 'container', 'group', 'face'],
    deniedParentKinds: ['cell']
  };

  // 3. Default Auto-wiring (if missing)
  const autoWirePolicy: BlueprintAutoWirePolicy = {
    mode: 'none'
  };

  // 4. Formal Contract Construction
  return {
    blueprintId: template.id,
    version: template.version || '1.0.0',
    name: template.label || 'Unnamed Blueprint',
    description: template.description || 'Industrial OMEGA architecture blueprint.',
    origin: 'system',
    templateId: template.id,
    rootNode: template.baseNode, 
    placeholders: [], // ModuleTemplates typically don't have placeholders in this version
    compatibility,
    autoWirePolicy,
    materializeSnapshot: false,
    defaultOverridePolicy: 'extendable'
  };
}

/**
 * Adapts a V2BlueprintData (simplified GroupNode format from BlueprintLibraryPanel)
 * into a formal BlueprintDefinition consumable by the injection pipeline.
 * Each V2 child (knob, port, etc.) becomes a cell OmegaBlueprintNode
 * wrapped in a container root node.
 */
export function adaptV2BlueprintToBlueprintDefinition(v2: V2BlueprintData): BlueprintDefinition {
  const children: OmegaBlueprintNode[] = v2.children.map(child => ({
    id: child.id,
    kind: 'cell' as NodeKind,
    cellRef: child.type,
    layout: {
      pos: { x: child.pos.x, y: child.pos.y },
      ...(child.size ? { size: { width: child.size.width, height: child.size.height } } : {}),
    },
    ...(child.style ? { style: child.style as OmegaStyleNode } : {}),
    ...(child.bind ? { bind: child.bind.target } : {}),
  }));

  return {
    blueprintId: v2.id,
    version: '1.0.0',
    name: v2.label,
    description: `V2 Blueprint: ${v2.label}`,
    origin: 'system',
    rootNode: {
      id: v2.id,
      kind: 'container' as NodeKind,
      role: 'composite',
      layout: {
        pos: { x: v2.pos.x, y: v2.pos.y },
        mode: 'absolute',
      },
      children,
    },
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
 * Validates a blueprint against structural invariants.
 */
export function validateBlueprint(blueprint: BlueprintDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!blueprint.blueprintId) errors.push('Missing blueprintId');
  if (!blueprint.rootNode) errors.push('Missing rootNode');
  if (!blueprint.rootNode.kind) errors.push('Root node has no kind');
  
  return {
    valid: errors.length === 0,
    errors
  };
}
