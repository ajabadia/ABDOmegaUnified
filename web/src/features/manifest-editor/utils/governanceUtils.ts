/**
 * @purpose Gestiona y optimiza recursos en archivos manifest OMEGA eliminando tipos de elementos, variantes, activos y guildas no utilizados para reducir el tamaño del archivo y mejorar el rendimiento.
 * @purpose_en Manages and optimizes resources in OMEGA manifest files by identifying used element types, variants, assets, and guilds, then purges unused ones to reduce file size and improve performance.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:4,imports:3,sig:9iw9v8
 * @lastUpdated 2026-06-15T15:17:12.251Z
 */

import type { OMEGA_Manifest, StyleVariant } from '@/omega-ui-core/types/manifest';
import type { ElementCategory } from '@/omega-ui-core/governance/ElementCatalog';
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';

/**
 * Detects all element types (knob, jack, container, etc.) currently instantiated in the manifest.
 */
export function getUsedElementTypes(manifest: OMEGA_Manifest): string[] {
  const used = new Set<string>();

  // Check containers
  if (manifest.ui.layout?.containers?.length) {
    used.add('container');
  }

  // Check controls
  manifest.ui.controls?.forEach(c => {
    if (c.presentation?.component) {
      used.add(c.presentation.component);
    } else {
      used.add('knob'); // Default
    }
  });

  // Check jacks
  manifest.ui.jacks?.forEach(() => {
    used.add('port');
  });

  return Array.from(used);
}

/**
 * Detects all element types and specific variants/assets currently used in the manifest.
 */
export function getUsedResources(manifest: OMEGA_Manifest) {
  const usedTypes = new Set<string>();
  const usedVariants = new Map<string, Set<string>>(); // Type -> Set of Variant IDs
  const usedAssets = new Set<string>();

  // 1. Check Global UI Assets
  if (typeof manifest.ui.faceplate === 'string') {
    usedAssets.add(manifest.ui.faceplate);
  } else if (manifest.ui.faceplate) {
    Object.values(manifest.ui.faceplate).forEach(asset => {
      if (typeof asset === 'string') usedAssets.add(asset);
    });
  }
  
  // Hardware assets
  if (manifest.ui.hardware?.screwMapping) {
    (((manifest.ui as unknown) as { hardware?: { screwMapping?: string[] } }).hardware?.screwMapping || []).forEach((asset: string) => {
      if (asset) usedAssets.add(asset);
    });
  }

  // 2. Check Containers (Styles)
  if (manifest.ui.layout?.containers?.length) {
    usedTypes.add('container');
    const containerVariants = new Set<string>();
    manifest.ui.layout.containers.forEach(c => {
      if (c.variant) containerVariants.add(c.variant);
    });
    usedVariants.set('container', containerVariants);
  }

  // 3. Check Entities (Controls & Jacks)
  const allEntities = [...(manifest.ui.controls || []), ...(manifest.ui.jacks || [])];
  
  allEntities.forEach(entity => {
    const type = entity.presentation?.component || (entity.role === 'port' ? 'port' : 'knob');
    usedTypes.add(type);
    
    // Track Variant
    if (entity.presentation?.variant) {
      if (!usedVariants.has(type)) usedVariants.set(type, new Set());
      usedVariants.get(type)?.add(entity.presentation.variant);
    }

    // Track direct assets
    if (entity.presentation?.style?.asset) {
      usedAssets.add(entity.presentation.style.asset);
    }

    // Check attachments (labels, etc)
    entity.presentation?.attachments?.forEach(att => {
      if (att.variant) {
        if (!usedVariants.has(att.type)) usedVariants.set(att.type, new Set());
        usedVariants.get(att.type)?.add(att.variant);
      }
    });
  });

  return { usedTypes, usedVariants, usedAssets };
}

/**
 * Aseptic Purge: Removes EVERYTHING not used in the final module.
 * Styles, Assets, and Component Definitions are stripped if not present in the rack.
 */
export function purgeUnusedStyles(manifest: OMEGA_Manifest): OMEGA_Manifest {
  const { usedTypes, usedVariants, usedAssets } = getUsedResources(manifest);
  
  // 1. Filter Styles
  const currentStyles = manifest.ui.styles || {};
  const purgedStyles: Record<string, StyleVariant[]> = {};

  Object.keys(currentStyles).forEach(type => {
    if (usedTypes.has(type) || usedVariants.has(type)) {
      const typeVariants = usedVariants.get(type);
      // Only keep the variants that are actually used
      const filteredVariants = currentStyles[type].filter((s: StyleVariant) => 
        typeVariants ? typeVariants.has(s.id) : true
      );
      
      if (filteredVariants.length > 0) {
        purgedStyles[type] = filteredVariants;
      }
    }
  });

  // 2. Collect assets used BY the styles we kept
  Object.values(purgedStyles).forEach(variants => {
    variants.forEach((v: StyleVariant) => {
      if (v.aesthetics?.asset) usedAssets.add(v.aesthetics.asset);
    });
  });

  // 3. Filter Resources (Assets)
  const currentAssets = manifest.resources?.assets || [];
  const purgedAssets = currentAssets.filter(a => usedAssets.has(a.id));

  return {
    ...manifest,
    ui: {
      ...manifest.ui,
      styles: purgedStyles
    },
    resources: {
      ...manifest.resources,
      assets: purgedAssets.length > 0 ? purgedAssets : undefined
    }
  };
}

/**
 * Filters the element catalog to only show categories/types that are in use.
 */
export function getUsedGuilds(manifest: OMEGA_Manifest): (ElementCategory | 'ALL')[] {
  const { usedTypes } = getUsedResources(manifest);
  const guilds = new Set<ElementCategory>();

  usedTypes.forEach(type => {
    const def = OMEGA_ELEMENT_CATALOG.find(e => e.id === type);
    if (def) guilds.add(def.category);
  });

  return Array.from(guilds);
}
