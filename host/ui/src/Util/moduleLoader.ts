/**
 * Shared module loader-overlay dismissal.
 * Hides the "CARGANDO..." overlay rendered by ManifestRenderer once the panel
 * content is interactive, its images have settled, or a fallback timeout has
 * elapsed. Used by both ModuleRenderer (rebuild path) and ModuleBrowser
 * (direct ADD path) so the fade/remove timing stays in one place.
 */
export function dismissLoaderOverlay(root: ParentNode): void {
    const loader = root.querySelector<HTMLElement>('.module-loader-overlay');
    if (!loader) return;

    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    let pending = imgs.length;

    const dismiss = () => {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.remove(), 400);
    };

    if (pending === 0) {
        setTimeout(dismiss, 200);
        return;
    }

    const checkDone = () => {
        pending--;
        if (pending <= 0) dismiss();
    };
    imgs.forEach(img => {
        if (img.complete) checkDone();
        else {
            img.addEventListener('load', checkDone, { once: true });
            img.addEventListener('error', checkDone, { once: true });
        }
    });
    setTimeout(dismiss, 600);
}
