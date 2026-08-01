'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'omega_editor_user_preferences';

export interface UserPreferences {
  gridEnabled: boolean;
  gridSpacingX: number;
  gridSpacingY: number;
  showGuides: boolean;
  showDiagnosticHUD: boolean;
  autoSaveIntervalMs: number;
  shortcutBindings: Record<string, string>;
}

const DEFAULTS: UserPreferences = {
  gridEnabled: true,
  gridSpacingX: 24,
  gridSpacingY: 24,
  showGuides: true,
  showDiagnosticHUD: false,
  autoSaveIntervalMs: 0,
  shortcutBindings: {},
};

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  return { ...DEFAULTS };
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...DEFAULTS });
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}
