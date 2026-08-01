/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Gestiona un manifesto procesado OMEGA en formato plano y compatible con JUCE para producción.
 * @purpose_en Transforms a processed OMEGA manifest into a flat, JUCE-compatible format for production.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:2,imports:3,sig:1lycy30
 * @lastUpdated 2026-06-15T16:55:44.590Z
 */

/**
 * OMEGA distillForJUCE.ts — Post-procesado de manifiesto destilado para JUCE 8
 *
 * Toma un OMEGA_Manifest ya procesado por `distillManifest()` (que ejecuta
 * fossilize → contract → prune) y genera el formato plano de producción
 * que JUCE 8 / el runtime del sintetizador necesita.
 *
 * Operaciones:
 *   1. Aplanar ui.tree (recursivo → array plano de DistilledNode)
 *   2. Resolver layouts dinámicos (stack-v, stack-h → coordenadas absolutas)
 *   3. Eliminar metadatos de editor (history, guías, debug)
 *   4. Mapear assets internos a URIs asset://
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { DistilledManifest, DistilledNode } from './upgradeDistilled';

// ─── Helpers internos ──────────────────────────────────────────────

/**
 * Construye un mapa de asset IDs → URLs desde manifest.resources.assets.
 */
function buildAssetMap(manifest: OMEGA_Manifest): Map<string, string> {
  const map = new Map<string, string>();
  const assets = manifest.resources?.assets || [];
  for (const asset of assets) {
    const url = asset.url || '';
    // Si la URL no comienza con asset://, envuélvela
    const assetUri = url.startsWith('asset://') ? url : `asset://${url.replace(/^.*[/\\]/, '')}`;
    map.set(asset.id, assetUri);
  }
  return map;
}

/**
 * Resuelve un estilo de nodo a su representación plana, incluyendo
 * la conversión de referencias de assets (id) a URIs asset://.
 *
 * @param node - Nodo origen
 * @param assetMap - Mapa de asset IDs a URIs
 * @returns Estilo plano o undefined si el nodo no tiene estilo
 */
function resolveFlatStyle(
  node: OmegaNode,
  assetMap: Map<string, string>
): Record<string, unknown> | undefined {
  if (!node.style) return undefined;

  const { asset, backgroundAsset, ...rest } = node.style as Record<string, unknown>;

  const flatStyle: Record<string, unknown> = { ...rest };

  // Resolver asset ID a URI asset:// (usar destructured vars, no node.style.*)
  if (typeof asset === 'string' && assetMap.has(asset)) {
    flatStyle.asset = assetMap.get(asset)!;
  }
  if (typeof backgroundAsset === 'string' && assetMap.has(backgroundAsset)) {
    flatStyle.backgroundAsset = assetMap.get(backgroundAsset)!;
  }

  // Limpiar undefineds para JSON compacto
  for (const key of Object.keys(flatStyle)) {
    if (flatStyle[key] === undefined) {
      delete flatStyle[key];
    }
  }

  return Object.keys(flatStyle).length > 0 ? flatStyle : undefined;
}

/**
 * Resuelve layouts dinámicos (stack-v, stack-h) calculando coordenadas
 * absolutas para cada hijo.
 *
 * Para `stack-v`: los hijos se apilan verticalmente.
 * Para `stack-h`: los hijos se apilan horizontalmente.
 *
 * @param node - Nodo contenedor con layout dinámico
 * @returns Array de nodos con posiciones absolutas resueltas
 */
function resolveDynamicLayout(node: OmegaNode): OmegaNode[] {
  const mode = node.layout?.mode;
  if (!mode || mode === 'absolute') {
    return node.children || [];
  }

  const baseX = node.layout?.pos?.x || 0;
  const baseY = node.layout?.pos?.y || 0;
  const gap = node.layout?.gap || 4;
  const padding = node.layout?.padding || 0;

  const resolved: OmegaNode[] = [];
  let accX = baseX + padding;
  let accY = baseY + padding;

  for (const child of (node.children || [])) {
    const childWidth = child.layout?.size?.width || 48;
    const childHeight = child.layout?.size?.height || 48;

    const positionedChild: OmegaNode = {
      ...child,
      layout: {
        ...child.layout,
        pos: {
          x: mode === 'stack-h' ? accX : baseX + padding + (child.layout?.pos?.x || 0),
          y: mode === 'stack-v' ? accY : baseY + padding + (child.layout?.pos?.y || 0),
        },
        mode: 'absolute',
      },
    };

    resolved.push(positionedChild);

    if (mode === 'stack-v') {
      accY += childHeight + gap;
    } else if (mode === 'stack-h') {
      accX += childWidth + gap;
    }
  }

  return resolved;
}

/**
 * Aplana recursivamente el árbol UCA en un array plano de DistilledNode.
 * Resuelve layouts dinámicos y recolecta todos los hijos hoja (cell/port).
 *
 * @param node - Nodo raíz (ui.tree o contenedor)
 * @param assetMap - Mapa de asset IDs a URIs
 * @param collected - Array acumulador (recursión)
 */
function flattenTree(
  node: OmegaNode,
  assetMap: Map<string, string>,
  collected: DistilledNode[]
): void {
  // Resolver hijos: si el layout es dinámico, calcular posiciones absolutas
  const children = resolveDynamicLayout(node);

  for (const child of children) {
    // Si es nodo hoja (cell, port, etc.) → añadir al resultado plano
    if (child.kind === 'cell' || child.kind === 'port' || !child.children || child.children.length === 0) {
      const childLabel = child.meta?.label as string | undefined;
      const childSize = child.layout?.size ? { width: child.layout.size.width, height: child.layout.size.height } : undefined;
      const flatStyle = resolveFlatStyle(child, assetMap);

      const distilled: DistilledNode = {
        id: child.id,
        type: child.cellRef || child.kind || 'cell',
        pos: {
          x: child.layout?.pos?.x || 0,
          y: child.layout?.pos?.y || 0,
        },
      };
      if (childLabel) distilled.label = childLabel;
      if (childSize) distilled.size = childSize;
      if (flatStyle) distilled.style = flatStyle as Exclude<DistilledNode['style'], undefined>;
      if (child.bind) distilled.bind = child.bind;

      // Solo añadir si no es un nodo decorativo/estructural sin representación
      collected.push(distilled);
    }

    // Si tiene hijos, seguir recorriendo (grupos, contenedores)
    if (child.children && child.children.length > 0) {
      flattenTree(child, assetMap, collected);
    }
  }
}

/**
 * Recolecta todas las URIs de assets referenciadas en el árbol.
 *
 * @param node - Nodo raíz
 * @param assetMap - Mapa de asset IDs a URIs
 * @param uris - Set acumulador
 */
function collectAssetUris(
  node: OmegaNode,
  assetMap: Map<string, string>,
  uris: Set<string>
): void {
  if (node.style?.asset && assetMap.has(node.style.asset)) {
    uris.add(assetMap.get(node.style.asset)!);
  }
  if (node.style?.backgroundAsset && assetMap.has(node.style.backgroundAsset)) {
    uris.add(assetMap.get(node.style.backgroundAsset)!);
  }

  for (const child of (node.children || [])) {
    collectAssetUris(child, assetMap, uris);
  }
}

/**
 * Extrae el nombre legible del manifiesto desde varias ubicaciones posibles.
 */
function extractManifestName(manifest: OMEGA_Manifest): string {
  return manifest.metadata?.name
    || ('name' in manifest ? (manifest as Record<string, string>).name : undefined)
    || manifest.id
    || 'Untitled';
}

/**
 * Extrae el autor del manifiesto.
 */
function extractManifestAuthor(manifest: OMEGA_Manifest): string | undefined {
  return manifest.metadata?.author || undefined;
}

/**
 * Extrae la versión del manifiesto.
 */
function extractManifestVersion(manifest: OMEGA_Manifest): string | undefined {
  return manifest.metadata?.version || undefined;
}

// ─── API pública ───────────────────────────────────────────────────

/**
 * Post-procesa un OMEGA_Manifest (ya destilado por `distillManifest()`)
 * y genera el formato plano de producción para JUCE 8.
 *
 * @param manifest - Manifiesto OMEGA ya procesado por distillManifest()
 * @returns DistilledManifest listo para serializar a JSON y enviar a JUCE 8
 *
 * @example
 *   const workManifest = getCurrentManifest();
 *   const distilled = distillManifest(workManifest);     // Paso 1: pipeline existente
 *   const forJUCE = distillForJUCE(distilled);            // Paso 2: post-procesado
 *   const json = JSON.stringify(forJUCE, null, 2);
 *   // → Enviar json a JUCE 8 WebView2
 */
export function distillForJUCE(manifest: OMEGA_Manifest): DistilledManifest {
  const assetMap = buildAssetMap(manifest);

  // 1. Aplanar árbol (preferir ui.tree canónico sobre nodes[] legacy)
  const children: DistilledNode[] = [];
  if (manifest.ui?.tree) {
    flattenTree(manifest.ui.tree, assetMap, children);
  } else if (manifest.nodes) {
    for (const node of manifest.nodes) {
      flattenTree(node, assetMap, children);
    }
  }

  // 2. Recolectar assets referenciados
  const referencedUris = new Set<string>();
  if (manifest.ui?.tree) {
    collectAssetUris(manifest.ui.tree, assetMap, referencedUris);
  } else if (manifest.nodes) {
    for (const node of manifest.nodes) {
      collectAssetUris(node, assetMap, referencedUris);
    }
  }

  // 3. Construir DistilledManifest
  const rackWidth = manifest.ui?.dimensions?.width
    || manifest.ui?.layout?.width
    || 800;
  const rackHeight = manifest.ui?.dimensions?.height
    || manifest.ui?.layout?.height
    || 600;

  const author = extractManifestAuthor(manifest);
  const version = extractManifestVersion(manifest);

  return {
    schemaVersion: '10.0.0-distilled',
    name: extractManifestName(manifest),
    rack: {
      width: rackWidth,
      height: rackHeight,
      children,
    },
    assets: Array.from(referencedUris).sort(),
    ...(author ? { author } : {}),
    ...(version ? { version } : {}),
  };
}

/**
 * Versión completa: ejecuta distillManifest + distillForJUCE en un solo paso.
 *
 * @param manifest - Manifiesto de trabajo original
 * @returns DistilledManifest listo para producción
 */
import { distillManifest } from './StyleResolver';
export { distillManifest };
export function distillForProduction(manifest: OMEGA_Manifest): DistilledManifest {
  const distilled = distillManifest(manifest);
  return distillForJUCE(distilled);
}
