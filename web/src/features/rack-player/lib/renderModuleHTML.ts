/**
 * renderModuleHTML — Web-side replica of ManifestRenderer.renderModulePanel
 *
 * Replicates host/ui/src/Renderers/ManifestRenderer.ts (SINGLE SOURCE OF
 * TRUTH: host/ui/src/omega-ui-core/) so the Player renders byte-faithful
 * full-chassis geometry (3U = 432px) without delegating to host-ui at
 * runtime. All rendering primitives are imported through the NTFS junction
 * at web/src/omega-ui-core.
 *
 * Deviations from the host, by design:
 *  - No loader overlay: the Player already gates rendering behind its own
 *    "LOADING MODULE REPRESENTATIONS..." state; a permanent overlay would
 *    block pointer events on the knobs.
 *  - No AssetResolver: web has no per-module asset store; vco.acemm has no
 *    ui.faceplate, so chassis backgrounds resolve to the default rack style.
 */

import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { renderRackHTML } from '@/omega-ui-core/renderers/chassisRenderer';
import type { CellOptions } from '@/omega-ui-core/renderers/cellRendererTypes';
import { resolveNodeSemantics } from '@/omega-ui-core/uca/ucaSemantics';
import { resolveLayout } from '@/omega-ui-core/uca/layoutResolver';
import { resolvePanelGeometry } from '@/omega-ui-core/uca/panelGeometry';
import { buildCellOptions } from '@/omega-ui-core/renderers/cellOptions';
import { flatToTree } from '@/omega-ui-core/uca/converters/flatToTree';

export function renderModuleHTML(manifest: any): string {
  if (!manifest) return '';

  const geometry = resolvePanelGeometry(manifest, { forceUpper: false });
  const { widthPx, heightPx, isUpper } = geometry;

  const tree = manifest.ui?.tree ?? flatToTree(manifest);
  if (!tree) return '';

  const html = renderNode(tree, manifest, 0);

  const chassisNode: OmegaNode = {
    id: manifest.id,
    kind: 'rack',
    layout: { pos: { x: 0, y: 0 } },
    style: {},
    children: [],
  } as OmegaNode;
  const chassisOptions: CellOptions = buildCellOptions(manifest, {
    isLiveMode: true,
  });
  const chassisHTML = renderRackHTML(chassisNode, chassisOptions, manifest.id);

  return `
    <div class="omega-module-chassis ${isUpper ? 'chassis-1u' : 'chassis-3u'}" style="
      width: ${widthPx}px;
      height: ${heightPx}px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
    ">
      ${chassisHTML}
      ${html}
    </div>
  `.trim();
}

function renderNode(rawNode: OmegaNode, manifest: OMEGA_Manifest, depth: number): string {
  const semanticNode = resolveNodeSemantics(rawNode, { catalog: manifest.moduleTemplates || {} });
  const node = resolveLayout(semanticNode);

  if (node.visible === false) return '';

  const posX = node.layout?.pos?.x || 0;
  const posY = node.layout?.pos?.y || 0;
  const width = node.layout?.size?.width;
  const height = node.layout?.size?.height;

  if (node.kind === 'rack' || node.kind === 'face' || node.kind === 'container' || node.kind === 'group') {
    const childrenHtml = (node.children || [])
      .map((child: OmegaNode) => renderNode(child, manifest, depth + 1))
      .join('');

    return `
      <div class="omega-node-${node.kind}" style="
        position: absolute;
        left: ${posX}px;
        top: ${posY}px;
        ${width ? `width: ${width}px;` : ''}
        ${height ? `height: ${height}px;` : ''}
      ">
        ${childrenHtml}
      </div>
    `;
  }

  const cellOptions: CellOptions = buildCellOptions(manifest, {
    isLiveMode: true,
  });

  const cellHTML = CellRenderer.renderCellHTML(node, cellOptions);

  if (!cellHTML.includes('left:')) {
    return cellHTML.replace(
      /(<div class="control-cell[^"]*" data-node-id="[^"]*" style=")([^"]*?);?\s*(">)/,
      `$1$2; left: ${posX}px; top: ${posY}px;$3`,
    );
  }

  return cellHTML;
}
