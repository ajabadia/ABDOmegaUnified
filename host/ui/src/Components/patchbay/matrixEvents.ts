/**
 * OMEGA Era 7.2.3 - Matrix Events
 * Event handlers for grid cards, inspector controls, and dispatch.
 */
import { OmegaLog } from '../../RPC/omega_log.js';

/**
 * Attaches click and slider drag listeners to the grid cards.
 */
export function attachGridListeners(
  grid: HTMLElement,
  onSelectSlot: (index: number) => void,
  onSendUpdate: (slot: number, key: string, value: any) => void,
): void {
  grid.querySelectorAll('.matrix-card').forEach((card) => {
    card.addEventListener('click', () => {
      onSelectSlot(parseInt((card as HTMLElement).dataset.index || '0'));
    });

    const slider = card.querySelector('.bipolar-slider-bg');
    if (slider) {
      let isDragging = false;
      const update = (e: MouseEvent) => {
        const rect = slider.getBoundingClientRect();
        const val = Math.max(0, Math.min(2, ((e.clientX - rect.left) / rect.width) * 2));
        onSendUpdate(parseInt((card as HTMLElement).dataset.index || '0'), 'amount', val);
      };
      slider.addEventListener('pointerdown', (e: Event) => {
        isDragging = true;
        (e.target as HTMLElement).setPointerCapture((e as PointerEvent).pointerId);
        update(e as MouseEvent);
      });
      slider.addEventListener('pointermove', (e: Event) => {
        if (isDragging) update(e as MouseEvent);
      });
      slider.addEventListener('pointerup', () => {
        isDragging = false;
      });
    }
  });
}

/**
 * Attaches change/input listeners to inspector controls (selects, ranges, clear button).
 */
export function attachInspectorListeners(
  container: HTMLElement,
  selectedSlot: number,
  onSendUpdate: (slot: number, key: string, value: any) => void,
): void {
  container.querySelectorAll('.inspector-select, .inspector-range').forEach((ctrl) => {
    ctrl.addEventListener(
      ctrl.tagName === 'SELECT' ? 'change' : 'input',
      (e: any) => {
        const val = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
        onSendUpdate(selectedSlot, e.target.dataset.key, val);
      },
    );
  });

  document.getElementById('btn-clear-slot')?.addEventListener('click', () => {
    onSendUpdate(selectedSlot, 'source', '');
    onSendUpdate(selectedSlot, 'target', '');
    onSendUpdate(selectedSlot, 'amount', 0);
  });
}

/**
 * Dispatches an update to the patchbay matrix slot via RpcCommandDispatcher.
 */
export function sendUpdate(slot: number, key: string, value: any): void {
  const dispatcher = (window as any).rpcCommandDispatcher;
  if (dispatcher) {
    dispatcher.dispatch({
      type: 'updatePatchbayMatrixSlot',
      payload: { slot, key, value },
    });
  }
}

/**
 * Flashes the activity LED in the matrix workspace header.
 */
export function triggerActivity(
  type: 'general' | 'manual',
  manualChangeTimer: any,
  setManualTimer: (timer: any) => void,
): void {
  const led = document.getElementById('matrix-activity-led');
  if (!led) return;

  if (type === 'manual') {
    led.classList.remove('activity-general');
    led.classList.add('activity-manual');

    if (manualChangeTimer) clearTimeout(manualChangeTimer);
    const timer = setTimeout(() => {
      led.classList.remove('activity-manual');
    }, 1000);
    setManualTimer(timer);
  } else if (!manualChangeTimer) {
    led.classList.add('activity-general');
    setTimeout(() => led.classList.remove('activity-general'), 100);
  }
}