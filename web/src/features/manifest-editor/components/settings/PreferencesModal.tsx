'use client';

import React, { useState } from 'react';
import { usePreferences } from '../../providers/PreferencesProvider';
import { ShortcutBinder } from './ShortcutBinder';

type TabId = 'general' | 'grid' | 'shortcuts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'grid', label: 'Grid & Guides' },
  { id: 'shortcuts', label: 'Shortcuts' },
];

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [activeTab, setActiveTab] = useState<TabId>('general');

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="flex flex-col w-full max-w-lg max-h-[80vh] rounded-lg overflow-hidden"
        style={{
          background: '#0e0e0f',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 0 40px rgba(0,240,255,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#00f0ff' }}>
            Preferences
          </h2>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ color: '#888' }}
            aria-label="Close preferences"
          >
            ESC
          </button>
        </div>

        {/* Tabs */}
        <nav className="flex px-3 pt-2 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-t transition-colors"
              style={{
                color: activeTab === tab.id ? '#00f0ff' : '#777',
                borderBottom: activeTab === tab.id ? '2px solid #00f0ff' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ color: '#ccc' }}>
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs">Diagnostic HUD</label>
                <input
                  type="checkbox"
                  checked={preferences.showDiagnosticHUD}
                  onChange={e => updatePreferences({ showDiagnosticHUD: e.target.checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Auto-save interval (ms, 0 = off)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={preferences.autoSaveIntervalMs}
                  onChange={e => updatePreferences({ autoSaveIntervalMs: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-24 px-2 py-1 text-xs rounded text-right"
                  style={{ background: '#1a1c1e', border: '1px solid #333', color: '#ccc' }}
                />
              </div>
              <button
                onClick={resetPreferences}
                className="text-xs px-3 py-1.5 rounded transition-colors"
                style={{ background: 'rgba(255,50,50,0.15)', color: '#ff4444', border: '1px solid rgba(255,50,50,0.3)' }}
              >
                Reset to Defaults
              </button>
            </div>
          )}

          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs">Grid enabled</label>
                <input
                  type="checkbox"
                  checked={preferences.gridEnabled}
                  onChange={e => updatePreferences({ gridEnabled: e.target.checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Grid spacing X (px)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={preferences.gridSpacingX}
                  onChange={e => updatePreferences({ gridSpacingX: Math.max(1, parseInt(e.target.value) || 24) })}
                  className="w-24 px-2 py-1 text-xs rounded text-right"
                  style={{ background: '#1a1c1e', border: '1px solid #333', color: '#ccc' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Grid spacing Y (px)</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={preferences.gridSpacingY}
                  onChange={e => updatePreferences({ gridSpacingY: Math.max(1, parseInt(e.target.value) || 24) })}
                  className="w-24 px-2 py-1 text-xs rounded text-right"
                  style={{ background: '#1a1c1e', border: '1px solid #333', color: '#ccc' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Show guides</label>
                <input
                  type="checkbox"
                  checked={preferences.showGuides}
                  onChange={e => updatePreferences({ showGuides: e.target.checked })}
                />
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <ShortcutBinder
              bindings={preferences.shortcutBindings}
              onBindingsChange={bindings => updatePreferences({ shortcutBindings: bindings })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded transition-colors"
            style={{ background: '#00f0ff', color: '#0e0e0f', fontWeight: 600 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
