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

export class ManifestRenderer {

  /**
   * Render a complete module panel from its manifest.
   * Returns an HTML string ready for innerHTML injection.
   */
  static renderModulePanel(manifest: any, forceUpper: boolean = false): string {
    if (!manifest) return '';
    const hp = manifest?.rack?.hp || manifest?.metadata?.hp || manifest?.hp || 8;
    const widthPx = Math.max(hp * 15, 120);
    const title = (manifest.name || manifest.id || 'MODULE').toUpperCase();
    const slot = manifest?.rack?.slot || manifest?.slot || '';
    const isUpper = forceUpper || slot === 'upper' || title.includes('MIDI') || title.includes('MONITOR') || title.includes('TRIGGER');
    const heightPx = isUpper ? 144 : 436;
    const knobSize = 32;
    const jackSize = 22;

    const tree = manifest.ui?.tree;
    if (tree) {
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

    // Fallback: Structured ACEMM Catalog rendering with standardized 1:1 hardware sizes
    const controls = manifest?.controls || manifest?.ui?.controls || [];
    const jacks = manifest?.jacks || manifest?.ui?.jacks || [];

    let controlsHTML = '';
    controls.forEach((c: any) => {
      controlsHTML += `
        <div style="display:flex; flex-direction:column; align-items:center; width:${knobSize + 12}px; gap:3px;">
          <div style="width:${knobSize}px; height:${knobSize}px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #475569, #0f172a); border:2px solid #64748b; box-shadow:0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2); position:relative;">
            <div style="position:absolute; top:3px; left:${Math.floor(knobSize / 2) - 1}px; width:3px; height:${Math.floor(knobSize / 3)}px; background:var(--neon-cyan, #00f2ff); border-radius:1px;"></div>
          </div>
          <span style="font-size:8px; font-family:monospace; color:#cbd5e1; text-transform:uppercase; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-weight:bold;">${c.name || c.id}</span>
        </div>
      `;
    });

    let jacksHTML = '';
    jacks.forEach((j: any) => {
      const color = j.dataType === 'midi' ? '#a855f7' : j.dataType === 'audio' ? '#10b981' : '#06b6d4';
      jacksHTML += `
        <div class="module-jack" data-jack-id="${j.id}" data-jack-type="${j.dataType || 'cv'}" data-jack-direction="${j.direction || 'input'}" style="display:flex; flex-direction:column; align-items:center; width:${jackSize + 10}px; gap:3px;">
          <div class="port-socket size-A color-cyan" data-source="${j.id}" style="width:${jackSize}px; height:${jackSize}px; border-radius:50%; background:#090d16; border:2px solid ${color}; box-shadow:0 0 6px ${color}40, inset 0 0 4px #000; position:relative; display:flex; align-items:center; justify-content:center;">
            <div class="port-inner" style="width:8px; height:8px; border-radius:50%; background:#000; border:1px solid #334155;"></div>
          </div>
          <span style="font-size:8px; font-family:monospace; color:${color}; font-weight:bold; text-transform:uppercase; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">${j.name || j.id}</span>
        </div>
      `;
    });

    return `
      <div class="omega-module-chassis ${isUpper ? 'chassis-1u' : 'chassis-3u'}" style="
        width: ${widthPx}px;
        height: ${heightPx}px;
        position: relative;
        background: linear-gradient(180deg, #1e2638 0%, #0d121d 100%);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 0;
        padding: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.45);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:4px; margin-bottom:4px;">
          <span style="font-family:'Outfit',monospace; font-size:10px; font-weight:900; color:var(--neon-cyan); letter-spacing:1px; text-transform:uppercase;">${title}</span>
          <span style="font-size:8px; font-family:monospace; color:#64748b; background:#090d16; padding:1px 5px; border-radius:3px; border:1px solid rgba(255,255,255,0.05);">${hp} HP</span>
        </div>
        
        <div style="display:flex; flex-wrap:wrap; gap:${isUpper ? '6px' : '16px'}; justify-content:center; align-items:center; flex-grow:1; padding:${isUpper ? '2px 0' : '10px 0'};">
          ${controlsHTML || '<div style="font-size:9px; color:#64748b; font-family:monospace;">DSP CORE</div>'}
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:${isUpper ? '4px' : '10px'}; justify-content:center; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:${isUpper ? '4px' : '8px'}; margin-top:4px;">
          ${jacksHTML}
        </div>
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
      skin: manifest.ui?.skin || 'industrial',
      zoom: manifest.ui?.layout?.zoom || 1,
      runtimeValue: 0.5,
      steps: 100,
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
