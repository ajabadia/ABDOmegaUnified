import type { HistoryEntry } from '@/omega-ui-core/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import { nextHistoryEntryId } from '@/omega-ui-core/utils/historyEntryId';
import { emitEvent } from './globalEventBus';

/**
 * @purpose Gestiona la funcionalidad de deshacer y rehacer para las entradas de historia del editor de manifest OMEGA con soporte de ramificación.
 * @purpose_en Manages undo/redo functionality for OMEGA manifest editor history entries with branching support.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:new
 * @lastUpdated 2026-06-22
 */
class HistoryService {
  private history: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private maxEntries = 50;

  constructor(private eventBus?: IEventBus) {}

  /**
   * Limita `future` al mismo tope que `history`.
   *
   * `maxEntries` solo se aplicaba a `history` (en `push`), así que `future`
   * crecía sin límite: `undo()` hacía `unshift` una entrada cada vez, y
   * `restore()` sustitía ambos arrays por lo que trajera el `.omega` sin
   * comprobar nada. Es el GROWTH real sin topar que ya no existe en el reducer
   * del orchestrator (allí `past + future` es un invariante y `past` está
   * topado).
   *
   * El recorte cae por la COLA porque `future[0]` es la entrada que replay el
   * siguiente redo: descartar por la cabeza tiraría justo lo que el usuario
   * está a punto de rehacer.
   */
  private capFuture() {
    if (this.future.length > this.maxEntries) {
      this.future = this.future.slice(0, this.maxEntries);
    }
  }

  /**
   * push
   * Records a new semantic event. Clears future stack (branching).
   */
  push(entry: HistoryEntry) {
    // Coalescing/Compression Logic
    const lastEntry = this.history[this.history.length - 1];
    
    if (lastEntry && lastEntry.type === entry.type && lastEntry.label === entry.label) {
      const timeDiff = entry.timestamp - lastEntry.timestamp;
      
      // Coalesce high-frequency UI events (e.g. selection jumps) within 1.5s
      if (entry.type !== 'CONTENT_CHANGE' && timeDiff < 1500) {
        this.history[this.history.length - 1] = entry; // Replace with latest
        return;
      }
    }

    this.history.push(entry);
    this.future = []; // Branching rule
    
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }

    emitEvent(this.eventBus, 'history:captured', {
      entryId: entry.id,
      type: entry.type,
      label: entry.label,
      timestamp: entry.timestamp,
    });
  }

  /**
   * undo
   * Moves last past entry to future and returns it.
   */
  undo(currentManifest: OMEGA_Manifest): { entry: HistoryEntry; currentState: HistoryEntry } | null {
    if (this.history.length === 0) return null;

    const entryToRestore = this.history.pop()!;
    
    const currentState: HistoryEntry = {
      // El prefijo `redo_` parece un error de nombre (esta entrada va a
      // `future`, no es un redo), pero se conserva: aparece en logs de
      // observabilidad y en snapshots ya guardados, y renombrarlo no arregla
      // la colisión, que es lo que hace el generador.
      id: nextHistoryEntryId('redo'),
      type: 'SNAPSHOT',
      label: 'Pre-Undo State',
      timestamp: Date.now(),
      correlationId: 'undo_op',
      manifest: JSON.parse(JSON.stringify(currentManifest))
    };

    this.future.unshift(currentState);
    this.capFuture();

    return { entry: entryToRestore, currentState };
  }

  /**
   * redo
   * Moves first future entry to past and returns it.
   */
  redo(currentManifest: OMEGA_Manifest): { entry: HistoryEntry; currentState: HistoryEntry } | null {
    if (this.future.length === 0) return null;

    const entryToRestore = this.future.shift()!;
    
    const currentState: HistoryEntry = {
      id: nextHistoryEntryId('undo'),
      type: 'SNAPSHOT',
      label: 'Pre-Redo State',
      timestamp: Date.now(),
      correlationId: 'redo_op',
      manifest: JSON.parse(JSON.stringify(currentManifest))
    };

    this.history.push(currentState);

    return { entry: entryToRestore, currentState };
  }

  getHistory() {
    return {
      past: [...this.history],
      future: [...this.future]
    };
  }

  getRevision(id: string): HistoryEntry | undefined {
    return this.history.find(e => e.id === id) || this.future.find(e => e.id === id);
  }

  clear() {
    this.history = [];
    this.future = [];
  }

  /**
   * restore
   * Replaces the entire history stack with a saved snapshot.
   * Used when loading a .omega project from disk.
   */
  restore(history: { past: HistoryEntry[]; future: HistoryEntry[] }) {
    this.history = history.past ? [...history.past] : [];
    this.future = history.future ? [...history.future] : [];
    // Un `.omega` manipulado (o de una versión antigua) puede traer pilas más
    // largas que el tope; se ajustan por igual que en push/undo para que el
    // servicio no acepte memoria arbitraria del fichero.
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(this.history.length - this.maxEntries);
    }
    this.capFuture();
  }
}

export const historyService = new HistoryService();
