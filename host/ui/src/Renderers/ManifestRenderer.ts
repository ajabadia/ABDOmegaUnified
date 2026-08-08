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
import { renderRackHTML } from '../../omega-ui-core/renderers/chassisRenderer';
import type { CellOptions } from '../../omega-ui-core/renderers/cellRendererTypes';
import { resolveNodeSemantics } from '../../omega-ui-core/uca/ucaSemantics';
import { resolveLayout } from '../../omega-ui-core/uca/layoutResolver';
import { resolvePanelGeometry } from '../../omega-ui-core/uca/panelGeometry';
import { buildCellOptions } from '../../omega-ui-core/renderers/cellOptions';
import { flatToTree } from '../../omega-ui-core/uca/converters/flatToTree';
import { AssetResolver } from '../Util/AssetResolver';

export class ManifestRenderer {

  /**
   * Render a complete module panel from its manifest.
   * Returns an HTML string ready for innerHTML injection.
   */
  static renderModulePanel(manifest: any, forceUpper: boolean = false): string {
    if (!manifest) return '';

    const geometry = resolvePanelGeometry(manifest, { forceUpper });
    const { widthPx, heightPx, isUpper } = geometry;

    const tree = manifest.ui?.tree ?? flatToTree(manifest);
    if (!tree) return '';

    const html = this.renderNode(tree, manifest, 0);

    // CHASSIS UNIFICADO (Fase de convergencia): el frame se delega en
    // chassisRenderer.renderRackHTML — la MISMA fuente que consume el editor
    // (CellRenderer / IndustrialContainer). Antes el gradiente estaba
    // hardcodeado aquí, por lo que el rack no heredaba el chasis del editor.
    const chassisNode: OmegaNode = {
      id: manifest.id,
      kind: 'rack',
      style: {},
      children: [],
    } as OmegaNode;
    const chassisOptions: CellOptions = buildCellOptions(manifest, {
      isLiveMode: true,
      resolveAsset: (ref?: string) => AssetResolver.resolve(manifest.id, ref),
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
        <div class="module-loader-overlay" style="
          position: absolute;
          inset: 0;
          background: rgba(10, 14, 23, 0.94);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          transition: opacity 0.4s ease-out;
        ">
          <div style="
            width: 26px;
            height: 26px;
            border: 3px solid rgba(0, 240, 255, 0.2);
            border-top-color: #00f0ff;
            border-radius: 50%;
            animation: omega-spinner-rotate 0.8s linear infinite;
            box-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
          "></div>
          <span style="
            margin-top: 8px;
            font-family: 'Space Mono', monospace, sans-serif;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #00f0ff;
            text-transform: uppercase;
          ">CARGANDO...</span>
        </div>
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

    const cellOptions: CellOptions = buildCellOptions(manifest, {
      isLiveMode: true,
    });

    const cellHTML = CellRenderer.renderCellHTML(node, cellOptions);

    // The canonical .control-cell is position:absolute;width:0;height:0 and relies
    // on explicit left/top (cells.css "Anchor-Center Model"). resolveLayout() already
    // computes layout.pos for every child, but CellRenderer (synced, read-only) never
    // emits it. Inject the resolved coordinates here so knobs/ports land on the face.
    if (!cellHTML.includes('left:')) {
      return cellHTML.replace(
        /(<div class="control-cell[^"]*" data-node-id="[^"]*" style=")([^"]*?);?\s*(">)/,
        `$1$2; left: ${posX}px; top: ${posY}px;$3`,
      );
    }

    return cellHTML;
  }
}

// Bind to window for global access
if (typeof window !== 'undefined') {
  (window as any).ManifestRenderer = ManifestRenderer;
}
