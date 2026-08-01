/**
 * OMEGA Era 7.2.3 - Module Patchbay Matrix (Orchestrator)
 * Composes: matrixLayout (data/layout), matrixTemplates (HTML), matrixEvents (handlers).
 */
import { OmegaLog } from '../RPC/omega_log.js';
import {
  normalizeList,
  buildMetadataFromInventory,
  syncMaxSlots,
} from './patchbay/matrixLayout.js';
import {
  setupHeaderToggles,
  renderStructure,
  syncSlotsFromState,
  renderInspector,
} from './patchbay/matrixTemplates.js';
import {
  attachGridListeners,
  attachInspectorListeners,
  sendUpdate,
  triggerActivity,
} from './patchbay/matrixEvents.js';

export class ModulePatchbayMatrix {
  private el: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private options: any;
  private state: any = null;
  private sources: { id: string; name: string }[] = [];
  private targets: { id: string; name: string }[] = [];

  private viewMode: 'compose' | 'overview' = 'compose';
  private manualChangeTimer: any = null;
  private selectedSlot: number = 0;
  private maxSlots: number = 32;
  private structureBuilt: boolean = false;

  constructor(options: any = {}) {
    this.options = options;
    this.loadMetadata();
    this.refreshMaxSlots();

    // Era 7: Reactive Subscription
    const store = (window as any).runtimeStore;
    if (store) {
      store.subscribe((type: any) => {
        if (type & 1 /* Structure */) {
          this.onStateUpdate(store.getSnapshot());
        }
      });
    }
  }

  private ensureElements(): boolean {
    if (this.el && this.root) return true;
    this.el = document.getElementById('modulation-modal');
    this.root = document.getElementById('modulation-workspace');

    if (!this.root && this.el) {
      const content = this.el.querySelector('.modulation-modal-content');
      if (content) {
        this.root = document.createElement('div');
        this.root.id = 'modulation-workspace';
        this.root.className = 'modulation-workspace';
        this.root.innerHTML = `
          <div id="matrix-grid-container" class="matrix-grid-container"></div>
          <div id="matrix-inspector-container" class="matrix-inspector-container"></div>
        `;
        const footer = content.querySelector('.modal-footer');
        content.insertBefore(this.root, footer);
      }
    }
    return !!(this.el && this.root);
  }

  private async refreshMaxSlots() {
    const rpc = (window as any).omegaRPC;
    const newValue = await syncMaxSlots(rpc);
    if (newValue !== this.maxSlots) {
      OmegaLog.info('MATRIX', `Capacity updated: ${newValue}`);
      this.maxSlots = newValue;
      this.structureBuilt = false;
      if (this.isWorkspaceOpen()) this.renderWorkspace();
    }
  }

  private async loadMetadata() {
    const rpc = (window as any).omegaRPC;
    const inv = (window as any).inventoryStore;

    if (inv && inv.getAllItems().length > 0) {
      const { sources, targets } = buildMetadataFromInventory(inv.getAllItems(), this.state);
      this.sources = sources;
      this.targets = targets;
      if (this.isWorkspaceOpen()) this.renderWorkspace();
    }

    if (!rpc) return;

    setTimeout(async () => {
      try {
        const resp = await rpc.send('getModulationMetadata', {});
        if (resp?.sources?.length > 0) {
          this.sources = normalizeList(resp.sources);
          this.targets = normalizeList(resp.targets);
          OmegaLog.info('MATRIX', `Metadata synced from backend. Sources: ${this.sources.length}`);
          if (this.isWorkspaceOpen()) this.renderWorkspace();
        } else {
          OmegaLog.debug('MATRIX', 'Backend returned empty metadata, keeping InventoryStore data.');
        }
      } catch (e) {
        OmegaLog.warn('MATRIX', 'Backend metadata sync failed, relying on InventoryStore', e);
      }
    }, 500);
  }

  public toggleWorkspace(open: boolean) {
    if (!this.ensureElements()) return;
    const modal = this.el!;
    modal.style.display = open ? 'flex' : 'none';
    if (open) {
      this.loadMetadata();
      this.refreshMaxSlots();
      this.renderWorkspace();
      this.notifyRouteHighlight();
    } else {
      // Al cerrar la Matrix, restaurar los cables a su apariencia normal (§9).
      this.notifyRouteHighlight(null);
    }
  }

  /**
   * Ruta destacada (§9): propaga el slot seleccionado a PatchCableManager
   * para que su cable brille y el resto se atenúe. Decorativo: si el manager
   * no está disponible o la UI de cables falla, nada se rompe.
   */
  private notifyRouteHighlight(slot: number | null = this.selectedSlot) {
    try {
      (window as any).patchCableManager?.highlightRoute?.(slot);
    } catch {
      /* decorativo — no propagar errores a la Matrix */
    }
  }

  private isWorkspaceOpen(): boolean {
    if (!this.ensureElements()) return false;
    return this.el!.style.display === 'flex';
  }

  public onStateUpdate(state: any) {
    const oldModules = this.state?.patch?.modules || this.state?.preset?.modules || [];
    const newModules = state?.patch?.modules || state?.preset?.modules || [];
    const structuralChange =
      oldModules.length !== newModules.length ||
      JSON.stringify(oldModules.map((m: any) => m.id)) !==
        JSON.stringify(newModules.map((m: any) => m.id));

    this.state = state;
    const matrixData = state?.patch?.patchbayMatrix || state?.preset?.patchbayMatrix || [];
    const matrix = normalizeList(matrixData);

    const activeCount = matrix.filter(
      (s: any) => s.active === true || s.active === 'true',
    ).length;
    const countEl = document.getElementById('matrix-active-count');
    if (countEl) countEl.innerText = activeCount.toString().padStart(2, '0');

    triggerActivity('general', this.manualChangeTimer, (t: any) => (this.manualChangeTimer = t));

    if (this.isWorkspaceOpen()) {
      if (structuralChange) {
        OmegaLog.debug('MATRIX', 'Structural change detected, rebuilding metadata...');
        this.loadMetadata();
      }
      syncSlotsFromState(matrix, this.sources, this.targets, this.selectedSlot);
    }
  }

  private triggerActivity(type: 'general' | 'manual') {
    triggerActivity(type, this.manualChangeTimer, (t: any) => (this.manualChangeTimer = t));
  }

  private sendUpdate(slot: number, key: string, value: any) {
    this.triggerActivity('manual');
    sendUpdate(slot, key, value);
  }

  private renderWorkspace() {
    if (!this.ensureElements()) return;

    if (!this.state && (window as any).runtimeStore) {
      this.state = (window as any).runtimeStore.getSnapshot();
    }

    const grid = document.getElementById('matrix-grid-container');
    const inspector = document.getElementById('matrix-inspector-container');
    if (!grid) {
      OmegaLog.error('MATRIX', 'Grid container missing from DOM');
      return;
    }

    const modalHeader = document.querySelector('.modulation-modal-content .modal-title');
    setupHeaderToggles(modalHeader, this.viewMode, (mode) => {
      this.viewMode = mode;
      this.structureBuilt = false;
      this.renderWorkspace();
    });

    // 1. Structural Rendering
    if (!this.structureBuilt || this.viewMode === 'compose') {
      const matrixData = this.state?.patch?.patchbayMatrix || this.state?.preset?.patchbayMatrix || [];
      const matrix = normalizeList(matrixData);
      renderStructure(grid, this.viewMode, matrix, this.sources, this.targets, this.maxSlots, () =>
        this.addModulation(),
      );
      attachGridListeners(grid, (index) => {
        this.selectedSlot = index;
        this.notifyRouteHighlight();
        this.renderWorkspace();
      }, (slot, key, value) => this.sendUpdate(slot, key, value));
      this.structureBuilt = this.viewMode === 'overview';
    }

    // 2. Data Sync
    const matrixData = this.state?.patch?.patchbayMatrix || this.state?.preset?.patchbayMatrix || [];
    const matrix = normalizeList(matrixData);
    syncSlotsFromState(matrix, this.sources, this.targets, this.selectedSlot);

    // 3. Inspector
    if (inspector) {
      renderInspector(inspector, this.selectedSlot, matrix, this.sources, this.targets);
      attachInspectorListeners(inspector, this.selectedSlot, (slot, key, value) =>
        this.sendUpdate(slot, key, value),
      );
    }
  }

  private addModulation() {
    const matrix = this.state?.preset?.patchbayMatrix || [];
    let targetSlot = matrix.findIndex(
      (s: any, idx: number) => idx < this.maxSlots && !s.active && !s.source,
    );

    if (targetSlot === -1 && matrix.length < this.maxSlots) targetSlot = matrix.length;

    if (targetSlot !== -1 && targetSlot < this.maxSlots) {
      this.selectedSlot = targetSlot;
      this.notifyRouteHighlight();
      this.structureBuilt = false;
      this.renderWorkspace();

      setTimeout(() => {
        const sel = document.querySelector('select[data-key="source"]') as HTMLSelectElement;
        if (sel) sel.focus();
      }, 100);
    }
  }
}

// @ts-ignore
window.ModulePatchbayMatrix = ModulePatchbayMatrix;