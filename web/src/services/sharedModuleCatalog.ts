/**
 * ABDOmegaUnified - Shared Module Catalog Service
 * Servicio centralizado que expone los manifiestos .acemm y contratos WASM
 * de los módulos preexistentes ubicados en la estantería compartida (/modules).
 */

export interface SharedModuleEntry {
  id: string;
  name: string;
  family: 'io' | 'utility' | 'synth' | 'fx';
  version: string;
  hpWidth: number;
  manifestUrl: string;
  wasmUrl?: string;
  description: string;
  skin: 'industrial' | 'default';
  portsCount: number;
  controlsCount: number;
}

export const SHARED_MODULES_CATALOG: SharedModuleEntry[] = [
  {
    id: 'midi_in',
    name: 'GLOBAL MIDI INPUT',
    family: 'io',
    version: '1.0.0',
    hpWidth: 4,
    manifestUrl: '/modules/midi_in/midi_in.acemm',
    wasmUrl: '/wasm/midi_in.wasm',
    description: 'Entrada global de eventos MIDI y puente de telemetría LED.',
    skin: 'industrial',
    portsCount: 1,
    controlsCount: 1
  },
  {
    id: 'midi_trigger',
    name: 'MIDI TRIGGER & GATE CONVERTER',
    family: 'io',
    version: '1.0.0',
    hpWidth: 12,
    manifestUrl: '/modules/midi_trigger/midi_trigger.acemm',
    wasmUrl: '/wasm/midi_trigger.wasm',
    description: 'Conversor de notas MIDI a impulsos Trigger y señales Gate de 10V.',
    skin: 'industrial',
    portsCount: 2,
    controlsCount: 0
  },
  {
    id: 'omega_lab_monitor',
    name: 'OMEGA LAB TELEMETRY MONITOR',
    family: 'utility',
    version: '1.0.0',
    hpWidth: 16,
    manifestUrl: '/modules/omega_lab_monitor/omega_lab_monitor.acemm',
    wasmUrl: '/wasm/omega_lab_monitor.wasm',
    description: 'Osciloscopio y monitor de telemetría de señales CV/Audio en tiempo real.',
    skin: 'industrial',
    portsCount: 2,
    controlsCount: 2
  },
  {
    id: 'test_parity_v7',
    name: '00-TEST-PARITY',
    family: 'utility',
    version: '1.0.0',
    hpWidth: 24,
    manifestUrl: '/modules/test_parity/test_parity.acemm',
    description: 'Manifiesto de referencia para pruebas de paridad visual Era 7.',
    skin: 'industrial',
    portsCount: 1,
    controlsCount: 2
  }
];

import yaml from 'js-yaml';

export class SharedModuleCatalogService {
  /**
   * Obtiene todos los módulos preexistentes registrados en el catálogo
   */
  static getCatalog(): SharedModuleEntry[] {
    return SHARED_MODULES_CATALOG;
  }

  /**
   * Busca un módulo por su ID
   */
  static getModuleById(id: string): SharedModuleEntry | undefined {
    return SHARED_MODULES_CATALOG.find(m => m.id === id || m.id.includes(id));
  }

  /**
   * Carga y parsea el manifiesto .acemm de un módulo desde la estantería /modules
   */
  static async fetchManifest(moduleId: string): Promise<any> {
    const entry = this.getModuleById(moduleId);
    const url = entry ? entry.manifestUrl : `/modules/${moduleId}/${moduleId}.acemm`;
    const res = await fetch(url);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return yaml.load(text);
    }
  }
}
