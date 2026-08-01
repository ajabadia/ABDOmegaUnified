/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona el renderizado de HTML para elementos de UI según las propiedades proporcionadas.
 * @purpose_en Manages rendering HTML for various UI elements based on provided properties.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:1vsdkpg
 * @lastUpdated 2026-06-15T15:18:13.905Z
 */

/**
 * ⚠️ OMEGA UI CORE — ATTACHMENT RENDERER (Era 7.2.3)
 * ---------------------------------------------------------------------------
 * Specialized renderer for "slave" fragments (labels, leds, graphics).
 * These are rendered inside an "AttachmentStack" context.
 * ---------------------------------------------------------------------------
 */

import { ColorResolver } from '../utils/ColorResolver';
import type { OMEGA_Manifest, OmegaStyleNode } from '../types/manifest';

export interface AttachmentProps {
    type: 'label' | 'led' | 'graphic' | 'graphic-fragment' | 'knob' | 'port' | 'slider-v' | 'slider-h' | 'switch' | 'push' | 'stepper' | 'path' | 'display';
    variant?: string | undefined;
    text?: string | undefined;
    value?: number | undefined;
    steps?: number | undefined;
    style?: Partial<OmegaStyleNode> | undefined; 
    manifest?: OMEGA_Manifest | undefined;
    resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
    inherited?: Record<string, unknown> | undefined;
}

export const AttachmentRenderer = {
    renderAttachmentHTML(props: AttachmentProps): string {
        const { type } = props;
        
        switch (type) {
            case 'label':
                return this.renderLabelHTML(props);
            case 'led':
                return this.renderLedHTML(props);
            case 'graphic':
            case 'graphic-fragment':
                return this.renderGraphicHTML(props);
            default:
                return '';
        }
    },

    renderLabelHTML(props: AttachmentProps): string {
        const { text, style, manifest } = props;
        const color = ColorResolver.resolve(style?.color || style?.fontColor || '#ffffff', manifest);
        const fontSize = style?.fontSize || 8;
        const font = style?.font || 'Inter';
        const weight = style?.fontWeight || '900';
        
        return `
          <div class="attachment-label" style="
            color: ${color}; 
            font-size: ${fontSize}px; 
            font-family: ${font}; 
            font-weight: ${weight};
            text-transform: uppercase;
            letter-spacing: 0.1em;
            pointer-events: none;
            white-space: nowrap;
          ">
            ${text || 'LABEL'}
          </div>
        `;
    },

    renderLedHTML(props: AttachmentProps): string {
        const { value = 0, style, manifest } = props;
        const color = ColorResolver.resolve(style?.color || '#00f2ff', manifest);
        const isActive = value > 0.5;
        const size = style?.size || 6;
        
        const glow = isActive ? `box-shadow: 0 0 ${size}px ${color};` : '';
        const opacity = isActive ? 1 : 0.2;

        return `
          <div class="attachment-led" style="
            width: ${size}px; 
            height: ${size}px; 
            background-color: ${color}; 
            border-radius: 50%;
            opacity: ${opacity};
            ${glow}
            transition: all 0.2s ease;
          "></div>
        `;
    },

    renderGraphicHTML(props: AttachmentProps): string {
        const { style, resolveAsset } = props;
        
        const assetId = style?.asset;
        let assetUrl = resolveAsset ? resolveAsset(assetId) : assetId;
        
        // Final fallback for previewing
        if (assetId && !assetUrl && !assetId.startsWith('http') && !assetId.startsWith('/')) {
            assetUrl = `/assets/elements/cells/knobs/${assetId}.png`;
        }

        const finalOpacity = style?.opacity !== undefined ? style.opacity : 1;
        const fitting = style?.fitting || 'contain';
        const width = style?.width || 48;
        const height = style?.height || 48;
        
        // Clean image style - NO ROTATION, NO FILMSTRIP
        const imageStyle = assetUrl ? `background-image: url('${assetUrl}'); background-size: ${fitting};` : 'background-color: rgba(255,0,255,0.2); border: 1px dashed magenta;';
        
        return `
          <div class="attachment-graphic" style="
            position: absolute; 
            left: 50%; 
            top: 50%; 
            transform: translate(-50%, -50%); 
            width: ${width}px; 
            height: ${height}px;
            background-repeat: no-repeat; 
            background-position: center; 
            opacity: ${finalOpacity};
            ${imageStyle}
          ">
          </div>
        `;
    }
};
