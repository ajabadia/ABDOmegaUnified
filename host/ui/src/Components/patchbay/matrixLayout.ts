/**
 * OMEGA Era 7.2.3 - Matrix Layout
 * Pure data helpers: metadata building, slot skeletons, color calculation, list normalization.
 */
import { OmegaLog } from '../../RPC/omega_log.js';

/** Default port registries for known module types. */
export const DEFAULT_REGISTRIES: Record<string, any[]> = {
  midi_in: [
    { id: 'midi_out', label: 'MIDI DATA OUT', type: 'MIDI', roles: ['output'] },
    { id: 'led_act', label: 'ACTIVITY LED', type: 'GATE', roles: ['output'] },
  ],
  midi_trigger: [
    { id: 'midi_in', label: 'MIDI IN', type: 'MIDI', roles: ['input'] },
    { id: 'note_out', label: 'NOTE V/OCT', type: 'CV', roles: ['output'] },
    { id: 'gate_out', label: 'GATE OUT', type: 'GATE', roles: ['output'] },
    { id: 'trig_out', label: 'TRIG OUT', type: 'GATE', roles: ['output'] },
  ],
  omega_lab_monitor: [
    { id: 'audio_in', label: 'SIGNAL IN', type: 'CV', roles: ['input'] },
    { id: 'volts_in', label: 'VOLTAGE IN', type: 'CV', roles: ['input'] },
  ],
  oscillator_vA: [
    { id: 'pitch_in', label: 'PITCH V/OCT', type: 'CV', roles: ['input'] },
    { id: 'fm_in', label: 'FM IN', type: 'CV', roles: ['input'] },
    { id: 'sine_out', label: 'SINE OUT', type: 'AUDIO', roles: ['output'] },
    { id: 'saw_out', label: 'SAW OUT', type: 'AUDIO', roles: ['output'] },
  ],
  filter_vA: [
    { id: 'audio_in', label: 'AUDIO IN', type: 'AUDIO', roles: ['input'] },
    { id: 'cutoff_cv', label: 'CUTOFF CV', type: 'CV', roles: ['input'] },
    { id: 'audio_out', label: 'AUDIO OUT', type: 'AUDIO', roles: ['output'] },
  ],
  envelope_adsr: [
    { id: 'gate_in', label: 'GATE IN', type: 'GATE', roles: ['input'] },
    { id: 'env_out', label: 'ENV OUT', type: 'CV', roles: ['output'] },
  ],
  vca: [
    { id: 'in', label: 'SIGNAL IN', type: 'AUDIO', roles: ['input'] },
    { id: 'cv', label: 'CV IN', type: 'CV', roles: ['input'] },
    { id: 'out', label: 'SIGNAL OUT', type: 'AUDIO', roles: ['output'] },
  ],
  lfo: [
    { id: 'reset_in', label: 'SYNC RESET', type: 'CV', roles: ['input'] },
    { id: 'lfo_out', label: 'LFO OUT', type: 'CV', roles: ['output'] },
  ],
  test_parity: [
    { id: 'p1', label: 'PORT 1 IN', type: 'AUDIO', roles: ['input'] },
    { id: 'p2', label: 'PORT 2 OUT', type: 'AUDIO', roles: ['output'] },
  ],
};

/**
 * Normalizes data that could be an array, object, or null/undefined into an array.
 */
export function normalizeList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

/**
 * Looks up a display name for a given ID within a list.
 */
export function getNameForId(list: any[], id: string): string {
  if (!id) return '';
  const item = list.find((s) => s && s.id === id);
  return item ? (item.name || item.label || id) : '---';
}

/**
 * Returns a color string for a modulation amount value.
 */
export function getAmountColor(val: number): string {
  if (val <= 0.01) return '#ffffff';
  if (val <= 1.0) {
    const f = val;
    return `rgb(${Math.round(255 - f * 255)},${Math.round(255 - f * 13)},255)`;
  }
  const f = Math.min(val - 1.0, 1.0);
  return `rgb(${Math.round(f * 255)},${Math.round(242 - f * 85)},${Math.round(255 - f * 255)})`;
}

/**
 * Builds a slot card skeleton HTML fragment.
 */
export function getSlotSkeleton(i: number): string {
  return `
    <div class="matrix-card aseptic-card" id="matrix-slot-${i}" data-index="${i}">
      <div class="card-header">
        <span class="card-index">${(i + 1).toString().padStart(2, '0')}</span>
        <div class="card-status"></div>
      </div>
      <div class="card-routing">
        <div class="card-source-label card-label">...</div>
        <div class="card-arrow">↓</div>
        <div class="card-target-label card-label">...</div>
      </div>
      <div class="bipolar-container">
        <div class="bipolar-slider-bg">
          <div class="bipolar-slider-fill gain-mode"></div>
        </div>
        <div class="bipolar-value">0.00x</div>
      </div>
      <div class="card-via-label card-label-tiny"></div>
    </div>
  `;
}

/**
 * Generates HTML <option> elements grouped by instance name.
 */
export function generateOptions(list: any[], current: string, exclude: string): string {
  let html = '<option value="">- NONE -</option>';
  const groups: { [key: string]: any[] } = {};
  for (const opt of list) {
    const groupName = opt.instance || 'Global';
    if (exclude && groupName === exclude) continue;
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(opt);
  }
  for (const [group, items] of Object.entries(groups)) {
    html += `<optgroup label="${group.toUpperCase()}">`;
    items.forEach((item) => {
      const disp = item.name.replace(group, '').trim() || item.name;
      html += `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${disp}</option>`;
    });
    html += `</optgroup>`;
  }
  return html;
}

/**
 * Builds metadata sources and targets from inventoryStore components.
 */
export function buildMetadataFromInventory(
  components: any[],
  state: any,
): { sources: any[]; targets: any[] } {
  const sources: any[] = [];
  const targets: any[] = [];

  const mountedInstances: { typeId: string; instanceId: string; name: string }[] = [];
  const activeModules = state?.patch?.modules || state?.preset?.modules || [];

  activeModules.forEach((m: any, idx: number) => {
    const typeId = m.componentId || m.typeId || m.id || m.modelId;
    const instanceId = m.instanceId || `${typeId}_${idx + 1}`;
    const name = m.name || typeId;
    if (typeId) mountedInstances.push({ typeId, instanceId, name });
  });

  if (mountedInstances.length === 0 && typeof document !== 'undefined') {
    document.querySelectorAll('.aseptic-module-panel').forEach((el: any, idx: number) => {
      const typeId = el.dataset.moduleId;
      if (typeId) {
        const nameEl = el.querySelector('.card-name, span');
        const name = nameEl ? nameEl.textContent.trim() : typeId;
        const instanceId = `${typeId}_${idx + 1}`;
        mountedInstances.push({ typeId, instanceId, name });
      }
    });
  }

  const typeCounts: Record<string, number> = {};
  mountedInstances.forEach((inst) => {
    typeCounts[inst.typeId] = (typeCounts[inst.typeId] || 0) + 1;
  });

  const typeIndices: Record<string, number> = {};
  mountedInstances.forEach((inst) => {
    const comp = components.find((c: any) => c.id === inst.typeId) || {
      id: inst.typeId,
      name: inst.name,
    };
    const registry = comp.registry || DEFAULT_REGISTRIES[inst.typeId] || [];

    typeIndices[inst.typeId] = (typeIndices[inst.typeId] || 0) + 1;
    const num = typeIndices[inst.typeId];
    const total = typeCounts[inst.typeId];
    const instanceLabel = total > 1 ? `${comp.name || inst.name} #${num}` : comp.name || inst.name;

    registry.forEach((reg: any) => {
      const portId = `${inst.instanceId}.${reg.id}`;
      const portName = `${instanceLabel} ${reg.label || reg.id}`;

      const item = {
        id: portId,
        name: portName,
        instance: instanceLabel,
        label: reg.label || reg.id,
        type: reg.type || 'CV',
      };

      if (reg.roles?.includes('output')) sources.push(item);
      if (reg.roles?.includes('input')) targets.push(item);
    });
  });

  OmegaLog.info(
    'MATRIX',
    `Industrial Metadata Rebuilt: ${sources.length} sources, ${targets.length} targets across ${mountedInstances.length} mounted modules`,
  );

  return { sources, targets };
}

/**
 * Synchronizes the maximum number of modulation slots from the backend.
 */
export async function syncMaxSlots(rpc: any): Promise<number> {
  if (!rpc) return 32;
  try {
    const settings = await rpc.getSystemSettings();
    if (!settings || !Array.isArray(settings)) return 32;
    const maxSlotsSetting = settings.find((s: any) => s && s.id === 'maxPatchbaySlots');
    if (maxSlotsSetting) {
      const val = Math.floor(maxSlotsSetting.currentValue || 32);
      return val > 0 ? val : 32;
    }
  } catch (e) {
    OmegaLog.warn('MATRIX', 'Max slots sync failed', e);
  }
  return 32;
}