'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { EditorAction } from '../../hooks/shortcutHandlers';
import { DEFAULT_BINDINGS } from '../../hooks/shortcutHandlers';

const ACTION_LABELS: Record<string, string> = {
  select_all: 'Select All',
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',
  duplicate: 'Duplicate',
  delete: 'Delete',
  undo: 'Undo',
  redo: 'Redo',
  deselect: 'Deselect',
  toggle_grid: 'Toggle Grid',
  toggle_guides: 'Toggle Guides',
  rename: 'Rename',
  command_palette: 'Command Palette',
};

interface ShortcutBinderProps {
  bindings: Record<string, string>;
  onBindingsChange: (bindings: Record<string, string>) => void;
}

function formatKeyCombo(e: React.KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  const key = e.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key);
  }
  return parts.join('+');
}

export function ShortcutBinder({ bindings, onBindingsChange }: ShortcutBinderProps) {
  const [recording, setRecording] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const merged = { ...DEFAULT_BINDINGS, ...bindings };

  useEffect(() => {
    if (recording && inputRef.current) {
      inputRef.current.focus();
    }
  }, [recording]);

  const handleKeyDown = (actionId: string) => (e: React.KeyboardEvent) => {
    e.preventDefault();
    const combo = formatKeyCombo(e);
    if (combo) {
      onBindingsChange({ ...bindings, [actionId]: combo });
      setRecording(null);
    }
  };

  const handleReset = (actionId: string) => {
    const next = { ...bindings };
    delete next[actionId];
    onBindingsChange(next);
  };

  const allActions = Object.keys(DEFAULT_BINDINGS) as EditorAction[];

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider" style={{ color: '#666' }}>
        Click a binding to record a new key combination
      </p>
      {allActions.map(actionId => {
        const combo = merged[actionId];
        const isRecording = recording === actionId;
        return (
          <div
            key={actionId}
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-xs" style={{ color: '#ccc' }}>{ACTION_LABELS[actionId]}</span>
            <div className="flex items-center gap-2">
              {isRecording ? (
                <input
                  ref={inputRef}
                  className="w-28 px-2 py-1 text-xs rounded text-center outline-none"
                  style={{ background: '#1a1c1e', border: '1px solid #00f0ff', color: '#00f0ff' }}
                  placeholder="Press keys..."
                  onKeyDown={handleKeyDown(actionId)}
                  onBlur={() => setRecording(null)}
                  readOnly
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setRecording(actionId)}
                  className="w-28 px-2 py-1 text-xs rounded text-center transition-colors hover:opacity-80"
                  style={{
                    background: 'rgba(0,240,255,0.08)',
                    border: '1px solid rgba(0,240,255,0.2)',
                    color: '#00f0ff',
                  }}
                >
                  {combo || '—'}
                </button>
              )}
              {combo !== DEFAULT_BINDINGS[actionId] && !isRecording && (
                <button
                  onClick={() => handleReset(actionId)}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: '#ff4444' }}
                  title="Reset to default"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


