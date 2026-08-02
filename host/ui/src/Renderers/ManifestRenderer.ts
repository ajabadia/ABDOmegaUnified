/**
 * ManifestRenderer — Vanilla TS Orchestrator for omega-ui-core
 * 
 * Renders a full module panel from an OMEGA_Manifest by walking the
 * ui.tree and dispatching each node to CellRenderer / chassisRenderer.
 * Fallback: Renders structured ACEMM catalog schemas when tree is absent.
 * 
 * SINGLE SOURCE OF TRUTH: All rendering primitives come from
 * ../../omega-ui-core/renderers/ (shared via NTFS Junction).
 */

import type { OmegaNode, OMEGA_Manifest } from '../../omega-ui-core/types/manifest';
import { CellRenderer } from '../../omega-ui-core/renderers/CellRenderer';
import type { CellOptions } from '../../omega-ui-core/renderers/cellRendererTypes';
import { resolveNodeSemantics } from '../../omega-ui-core/uca/ucaSemantics';
import { resolveLayout } from '../../omega-ui-core/uca/layoutResolver';
import { resolvePanelGeometry, resolveRenderOptions } from '../../omega-ui-core/uca/panelGeometry';

export class ManifestRenderer {

  /**
   * Render a complete module panel from its manifest.
   * Returns an HTML string ready for innerHTML injection.
   */
  static renderModulePanel(manifest: any, forceUpper: boolean = false): string {
    if (!manifest) return '';

    const geometry = resolvePanelGeometry(manifest, { forceUpper });
    const { widthPx, heightPx, isUpper } = geometry;

    const tree = manifest.ui?.tree;
    if (!tree) return '';

    const html = this.renderNode(tree, manifest, 0);
    return `
      <div class="omega-module-chassis ${isUpper ? 'chassis-1u' : 'chassis-3u'}" style="
        width: ${widthPx}px;
        height: ${heightPx}px;
        position: relative;
        background: linear-gradient(180deg, #1e2638 0%, #0d121d 100%);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0;
        overflow: hidden;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
      ">
        ${html}
      </div>
    `.trim();
  }

  /**
   * Recursively render a single OmegaNode and its children.
   */
  private static renderNode(rawNode: OmegaNode, manifest: OMEGA_Manifest, depth: number): string {
    const semanticNode = resolveNodeSemantics(rawNode, { catalog: manifest.moduleTemplates || {} });
    const node = resolveLayout(semanticNode);

    if (node.visible === false) return '';

    const posX = node.layout?.pos?.x || 0;
    const posY = node.layout?.pos?.y || 0;
    const width = node.layout?.size?.width;
    const height = node.layout?.size?.height;

    if (node.kind === 'rack' || node.kind === 'face' || node.kind === 'container' || node.kind === 'group') {
      const childrenHtml = (node.children || [])
        .map((child: OmegaNode) => this.renderNode(child, manifest, depth + 1))
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

    const cellOptions: CellOptions = {
      ...resolveRenderOptions(manifest),
      isSelected: false,
      isLiveMode: true,
      manifest,
    };

    return CellRenderer.renderCellHTML(node, cellOptions);
  }
}

// Bind to window for global access
if (typeof window !== 'undefined') {
  (window as any).ManifestRenderer = ManifestRenderer;
}
