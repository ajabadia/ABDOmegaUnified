/**
 * OMEGA Era 7.2.3 - Font Injector
 * Injects @font-face rules for module-specific custom fonts.
 */
import { OmegaLog } from '../RPC/omega_log.js';
import { PROTECTED_FONT_NAMES } from '../../omega-ui-core/typography/registry.js';
import { AssetResolver } from '../Util/AssetResolver.js';

export function injectResources(descriptor: any): void {
    const fonts = descriptor.ui?.resources?.fonts;
    if (!fonts || fonts.length === 0) return;

    const styleId = `module-fonts-${descriptor.id}`;
    if (document.getElementById(styleId)) return;

    let css = '';
    fonts.forEach(font => {
        if (PROTECTED_FONT_NAMES.includes(font.name)) {
            OmegaLog.warn('RENDERER', `Module ${descriptor.id} tried to override protected font: ${font.name}. Ignoring.`);
            return;
        }
        const url = AssetResolver.resolve(descriptor.id, font.file);
        if (url) {
            css += `
                @font-face {
                    font-family: '${font.name}';
                    src: url('${url}') format('truetype');
                    font-display: swap;
                }
                `;
        }
    });

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = css;
    document.head.appendChild(style);

    OmegaLog.info('RENDERER', `Injected ${fonts.length} custom fonts for module: ${descriptor.id}`);
}
