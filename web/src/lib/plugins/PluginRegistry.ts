'use client';

import type { ComponentType } from 'react';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export interface OmegaPlugin {
  id: string;
  name?: string;
  version?: string;
  customRenderers?: Record<string, ComponentType<PluginRendererProps>>;
  customEditors?: Record<string, ComponentType<PluginEditorProps>>;
}

export interface PluginRendererProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  depth?: number;
  value?: number;
  assetUrl?: string;
  style?: Record<string, unknown>;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export interface PluginEditorProps {
  node: OmegaNode;
  onChange: (updates: Record<string, unknown>) => void;
}

class PluginRegistryImpl {
  private plugins: Map<string, OmegaPlugin> = new Map();

  register(plugin: OmegaPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  getRenderer(kind: string): ComponentType<PluginRendererProps> | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.customRenderers?.[kind]) {
        return plugin.customRenderers[kind];
      }
    }
    return null;
  }

  getEditor(kind: string): ComponentType<PluginEditorProps> | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.customEditors?.[kind]) {
        return plugin.customEditors[kind];
      }
    }
    return null;
  }

  getAll(): OmegaPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const PluginRegistry = new PluginRegistryImpl();
