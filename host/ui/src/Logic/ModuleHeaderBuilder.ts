/**
 * OMEGA Era 7.2.3 - Module Header Builder
 * Creates DOM elements for the module header bar (config, move, close).
 */
import type { ModuleOptions, ModuleDescriptor } from '../Contracts/ModuleContract.js';

/**
 * Builds the full header DOM element with action buttons.
 */
export function buildModuleHeader(id: string, manifest?: ModuleDescriptor): HTMLElement {
    const header = document.createElement('div');
    header.className = 'module-header';
    header.style.display = 'flex';
    header.style.flexDirection = 'row';
    header.style.alignItems = 'center';
    header.style.gap = '6px';

    header.appendChild(createConfigButton(id, manifest));
    header.appendChild(createMoveButton(id, '◀', -1));
    header.appendChild(createMoveButton(id, '▶', 1));

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    header.appendChild(spacer);

    header.appendChild(createCloseButton(id));

    return header;
}

function createConfigButton(id: string, manifest?: ModuleDescriptor): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'module-header-action config-btn';
    btn.innerHTML = '⚙';
    btn.title = `Configure ${id}`;
    if (manifest) {
        btn.dataset.manifest = JSON.stringify(manifest);
    }
    btn.onclick = (e) => {
        e.stopPropagation();
        const win = window as any;
        if (win.modulePatchModal) {
            const manifestStr = btn.dataset.manifest;
            const manifest = manifestStr ? JSON.parse(manifestStr) : undefined;
            win.modulePatchModal.open(id, manifest);
        }
    };
    return btn;
}

function createMoveButton(id: string, arrow: string, direction: number): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'module-header-action move-btn';
    btn.innerHTML = arrow;
    btn.title = `Move ${id} ${direction > 0 ? 'right' : 'left'}`;
    btn.onclick = (e) => {
        e.stopPropagation();
        (window as any).rpcCommandDispatcher?.dispatch({
            type: 'moveModule',
            payload: { instanceId: id, direction },
        });
    };
    return btn;
}

function createCloseButton(id: string): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'module-header-action module-header-action-close';
    btn.innerHTML = '×';
    btn.title = `Remove ${id}`;
    btn.onclick = (e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to remove ${id}?`)) {
            (window as any).rpcCommandDispatcher?.dispatch({
                type: 'removeModule',
                payload: { instanceId: id },
            });
        }
    };
    return btn;
}