/**
 * PHASE 21 - HISTORY ENGINE TEST (Jest)
 *
 * Verifies push, undo, redo and industrial state management.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { historyService } from './historyService';
import type { HistoryEntry } from '@/omega-ui-core/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

const manifestA: OMEGA_Manifest = {
  metadata: { name: 'Test A', version: '1.0' },
  nodes: [],
  resources: {},
  entities: [],
  ui: {} as OMEGA_Manifest['ui'],
};

const manifestB: OMEGA_Manifest = {
  ...manifestA,
  metadata: { ...manifestA.metadata, name: 'Test B' },
};

function makeEntry(id: string, label: string, manifest: OMEGA_Manifest): HistoryEntry {
  return {
    id,
    type: 'CONTENT_CHANGE',
    label,
    timestamp: Date.now(),
    correlationId: `tx_${id}`,
    manifest,
  };
}

describe('HistoryService', () => {
  beforeEach(() => {
    historyService.clear();
  });

  describe('push', () => {
    it('should push entries to history stack', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(2);
      expect(history.past[0]).toMatchObject({ id: 'a', label: 'Initial State' });
      expect(history.past[1]).toMatchObject({ id: 'b', label: 'Changed Name' });
    });

    it('should clear future stack on new push (branching rule)', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));

      // Simulate undo by moving past to future
      historyService.undo(manifestB);
      let history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(1);

      // New push should clear future
      historyService.push(makeEntry('c', 'New Branch', manifestA));
      history = historyService.getHistory();
      expect(history.future).toHaveLength(0);
    });

    it('should respect maxEntries limit', () => {
      for (let i = 0; i < 60; i++) {
        historyService.push(makeEntry(`e${i}`, `Entry ${i}`, manifestA));
      }
      const history = historyService.getHistory();
      expect(history.past.length).toBeLessThanOrEqual(50);
    });
  });

  describe('undo', () => {
    it('should return null when history is empty', () => {
      const result = historyService.undo(manifestA);
      expect(result).toBeNull();
    });

    it('should move last entry from past to future', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      const result = historyService.undo(manifestB);
      expect(result).not.toBeNull();
      expect(result!.entry).toMatchObject({ id: 'b', label: 'Changed Name' });

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(1);
    });
  });

  describe('redo', () => {
    it('should return null when future is empty', () => {
      const result = historyService.redo(manifestA);
      expect(result).toBeNull();
    });

    it('should move first entry from future back to past', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      // Undo → the popped entry is 'b'; a snapshot is saved to future
      const undoResult = historyService.undo(manifestB);
      expect(undoResult).not.toBeNull();
      expect(undoResult!.entry).toMatchObject({ id: 'b', label: 'Changed Name' });

      let history = historyService.getHistory();
      expect(history.future).toHaveLength(1);
      expect(history.past).toHaveLength(1);

      // Redo → restores the snapshot from future (label 'Pre-Undo State'),
      // and adds a pre-redo snapshot to history
      const result = historyService.redo(manifestA);
      expect(result).not.toBeNull();
      // The entry from future is the snapshot saved during undo
      expect(result!.entry.label).toBe('Pre-Undo State');
      // currentState is the pre-redo snapshot
      expect(result!.currentState.label).toBe('Pre-Redo State');

      history = historyService.getHistory();
      // past = [a, pre-redo snapshot] = 2
      expect(history.past).toHaveLength(2);
      expect(history.future).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should return copies of past and future arrays', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(0);

      // Should return copies, not references
      history.past.push({} as HistoryEntry);
      expect(historyService.getHistory().past).toHaveLength(1);
    });
  });

  describe('getRevision', () => {
    it('should find entry by ID in past', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      const rev = historyService.getRevision('a');
      expect(rev).toBeDefined();
      expect(rev!.id).toBe('a');
    });

    it('should return undefined for unknown ID', () => {
      const rev = historyService.getRevision('nonexistent');
      expect(rev).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all history and future', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      historyService.clear();
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should replace entire history stack', () => {
      historyService.push(makeEntry('a', 'Old', manifestA));
      const newPast = [makeEntry('b', 'Restored B', manifestB)];
      const newFuture = [makeEntry('c', 'Restored C', manifestA)];
      historyService.restore({ past: newPast, future: newFuture });

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.past[0].id).toBe('b');
      expect(history.future).toHaveLength(1);
      expect(history.future[0].id).toBe('c');
    });

    it('should handle empty arrays', () => {
      historyService.push(makeEntry('a', 'Old', manifestA));
      historyService.restore({ past: [], future: [] });
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });
  });
});
