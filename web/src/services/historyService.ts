import type { HistoryEntry } from '@/omega-ui-core/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { IEventBus } from '@/omega-ui-core/di/EventBus';
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
      id: `redo_${Date.now()}`,
      type: 'SNAPSHOT',
      label: 'Pre-Undo State',
      timestamp: Date.now(),
      correlationId: 'undo_op',
      manifest: JSON.parse(JSON.stringify(currentManifest))
    };

    this.future.unshift(currentState);

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
      id: `undo_${Date.now()}`,
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
  }
}

export const historyService = new HistoryService();
