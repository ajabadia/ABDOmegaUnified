/**
 * OMEGA Era 7.2.3 - Matrix Templates
 * HTML builders for the modulation matrix workspace: grid cards, inspector, header toggles.
 */
import { OmegaLog } from '../../RPC/omega_log.js';
import { getSlotSkeleton, generateOptions, getNameForId, getAmountColor, normalizeList } from './matrixLayout.js';
import { CABLE_PALETTE, normalizeCableColor } from '../cables/cableConstants.js';

/**
 * Sets up the view mode toggle buttons (COMPOSE / OVERVIEW) in the modal header.
 * One-time setup; skips if already present.
 */
export function setupHeaderToggles(
  modalHeader: Element | null,
  viewMode: string,
  onViewChange: (mode: 'compose' | 'overview') => void,
): void {
  if (!modalHeader || document.getElementById('matrix-view-toggles')) return;

  const toggles = document.createElement('div');
  toggles.id = 'matrix-view-toggles';
  toggles.style.cssText = 'display:flex; gap:8px; margin-left:20px;';
  toggles.innerHTML = `
    <button class="aseptic-btn ${viewMode === 'compose' ? 'active' : ''}" id="btn-view-compose">COMPOSE</button>
    <button class="aseptic-btn ${viewMode === 'overview' ? 'active' : ''}" id="btn-view-overview">OVERVIEW</button>
  `;
  modalHeader.parentElement?.insertBefore(toggles, modalHeader.nextSibling);

  document.getElementById('btn-view-compose')?.addEventListener('click', () => onViewChange('compose'));
  document.getElementById('btn-view-overview')?.addEventListener('click', () => onViewChange('overview'));
}

/**
 * Renders the grid structure (cards) into the grid container element.
 */
export function renderStructure(
  grid: HTMLElement,
  viewMode: string,
  matrix: any[],
  sources: any[],
  targets: any[],
  maxSlots: number,
  onAddModulation: () => void,
): string {
  let html = '';

  if (viewMode === 'compose') {
    const activeSlots = matrix
      .map((s: any, i: number) => ({ ...s, i }))
      .filter(
        (s: any) =>
          (s.active === true || s.active === 'true') ||
          (s.source !== '' && s.source !== undefined),
      );

    if (activeSlots.length === 0 && sources.length === 0) {
      html = `
        <div class="empty-state-info">
          <div class="info-title">NO SIGNAL ASSETS DETECTED</div>
          <p>The system catalog is currently empty or no active modules with I/O ports were found in the rack.</p>
          <div class="metadata-warning">HANDSHAKE PENDING: Verify Era 7 Bridge Status</div>
        </div>
      `;
    } else {
      activeSlots.forEach((slot: { i: number }) => {
        html += getSlotSkeleton(slot.i);
      });
      if (activeSlots.length < maxSlots) {
        html += `
          <div class="matrix-card add-card" id="btn-add-modulation">
            <div class="add-icon">＋</div>
            <div class="card-label" style="text-align:center">ADD MODULATION</div>
          </div>
        `;
      }
    }
  } else {
    for (let i = 0; i < maxSlots; i++) {
      html += getSlotSkeleton(i);
    }
  }

  grid.innerHTML = html;

  document.getElementById('btn-add-modulation')?.addEventListener('click', onAddModulation);

  return html;
}

/**
 * Syncs slot values from the state into the rendered DOM (delta update).
 */
export function syncSlotsFromState(
  matrix: any[],
  sources: any[],
  targets: any[],
  selectedSlot: number,
): void {
  matrix.forEach((slot: any, i: number) => {
    const el = document.getElementById(`matrix-slot-${i}`);
    if (!el) return;

    const isSelected = selectedSlot === i;
    el.classList.toggle('active', slot.active);
    el.classList.toggle('selected', isSelected);

    const sourceLabel = el.querySelector('.card-source-label');
    const targetLabel = el.querySelector('.card-target-label');
    if (sourceLabel) sourceLabel.textContent = getNameForId(sources, slot.source) || 'EMPTY';
    if (targetLabel) targetLabel.textContent = getNameForId(targets, slot.target) || '---';

    const fill = el.querySelector('.bipolar-slider-fill') as HTMLElement;
    const valueDisp = el.querySelector('.bipolar-value') as HTMLElement;
    if (fill && valueDisp) {
      const amount = parseFloat(slot.amount || 0);
      const color = getAmountColor(amount);
      fill.style.width = `${Math.min(Math.abs(amount), 2.0) * 50}%`;
      fill.style.backgroundColor = color;
      valueDisp.textContent = `${amount.toFixed(2)}x`;
      valueDisp.style.color = color;
    }

    const viaLabel = el.querySelector('.card-via-label');
    if (viaLabel) {
      viaLabel.textContent = slot.via
        ? `VIA: ${getNameForId(sources, slot.via)}`
        : '';
    }
  });
}

/**
 * Construye los swatches de color de cable para el inspector.
 * El primer swatch ("AUTO", rayado) limpia el color personalizado del
 * slot (vuelve al color por tipo de señal). El valor se envía con
 * data-key="color" vía el handler genérico de la inspector.
 */
function renderCableSwatches(currentColor: string): string {
  const normalized = normalizeCableColor(currentColor) || '';
  const resetActive = normalized === '' ? ' active' : '';
  let html = `
    <button type="button" class="cable-swatch reset${resetActive}"
      data-key="color" data-value="" title="Default (por tipo de señal)"
      aria-label="Default cable color"></button>
  `;
  for (const hex of CABLE_PALETTE) {
    const isActive = normalized === hex ? ' active' : '';
    html += `
      <button type="button" class="cable-swatch${isActive}"
        data-key="color" data-value="${hex}" style="background: ${hex}"
        title="${hex}" aria-label="Cable color ${hex}"></button>
    `;
  }
  return html;
}

/**
 * Renders the inspector panel for the selected slot.
 */
export function renderInspector(
  container: HTMLElement,
  slotIdx: number,
  matrix: any[],
  sources: any[],
  targets: any[],
): void {
  const slot = matrix[slotIdx] || {
    active: false,
    source: '',
    target: '',
    amount: 0,
    via: '',
    viaAmount: 0,
  };
  const amount = parseFloat(slot.amount || 0);
  const viaAmount = parseFloat(slot.viaAmount || 0);

  const targetInstance = slot.target?.split('.')[0] || '';
  const sourceInstance = slot.source?.split('.')[0] || '';

  container.innerHTML = `
    <div class="inspector-title">SLOT ${(slotIdx + 1).toString().padStart(2, '0')} DETAILS</div>

    <div class="control-group">
      <label>SOURCE</label>
      <select class="inspector-select" data-key="source">
        ${generateOptions(sources, slot.source, targetInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>TARGET</label>
      <select class="inspector-select" data-key="target">
        ${generateOptions(targets, slot.target, sourceInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>GAIN MULTIPLIER (0 to 2.0x)</label>
      <input type="range" class="inspector-range" data-key="amount" min="0" max="2" step="0.01" value="${amount}">
      <div class="bipolar-value" style="color: ${getAmountColor(amount)}">${amount.toFixed(2)}x</div>
    </div>

    <div class="control-group">
      <label>VIA Modulator</label>
      <select class="inspector-select" data-key="via">
        ${generateOptions(sources, slot.via, targetInstance)}
      </select>
    </div>

    <div class="control-group">
      <label>VIA AMOUNT</label>
      <input type="range" class="inspector-range" data-key="viaAmount" min="0" max="1" step="0.05" value="${viaAmount}">
    </div>

    <div class="control-group">
      <label>CABLE COLOR</label>
      <div class="cable-swatches" data-key="color">
        ${renderCableSwatches(slot.color || '')}
      </div>
    </div>

    <div class="inspector-actions" style="margin-top: auto; display: flex; gap: 10px;">
      <button class="aseptic-btn" id="btn-clear-slot" style="flex:1">CLEAR</button>
      <button class="aseptic-btn" id="btn-init-matrix" style="flex:1">INIT ALL</button>
    </div>
  `;
}