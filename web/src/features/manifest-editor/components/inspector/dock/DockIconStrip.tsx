'use client';

/**
 * @purpose Renderiza una barra vertical de iconos para cambiar entre diferentes paneles del editor de manifesto OMEGA.
 * @purpose_en Renders a vertical bar of icons for toggling between different panels in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1unie1e
 * @lastUpdated 2026-06-15T11:06:31.667Z
 */

import { Layers, Sliders, Info, History, Settings, Zap, Terminal, Shield } from 'lucide-react';
import { DockIconBar } from './DockIconBar';
import type { DockIconBarButton } from './DockIconBar';

type WindowId = 'window_layers' | 'window_rack_properties' | 'window_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs';

interface DockIconStripProps {
  isCollapsed: boolean;
  windowStates: Record<string, boolean>;
  onToggleWindow: (id: WindowId) => void;
}

const ICONS: DockIconBarButton[] = [
  // Structure
  { id: 'window_layers', icon: <Layers className="w-4 h-4" />, title: 'Layers' },
  // Edit
  { id: 'window_properties', icon: <Sliders className="w-4 h-4" />, title: 'Element Properties' },
  { id: 'window_rack_properties', icon: <Settings className="w-4 h-4" />, title: 'Rack Properties' },
  // Quality
  { id: 'window_compliance', icon: <Shield className="w-4 h-4" />, title: 'Compliance' },
  { id: 'window_blueprints', icon: <Zap className="w-4 h-4" />, title: 'Blueprint Library' },
  // Diagnostics
  { id: 'window_info', icon: <Info className="w-4 h-4" />, title: 'Information' },
  { id: 'window_history', icon: <History className="w-4 h-4" />, title: 'History' },
  { id: 'window_logs', icon: <Terminal className="w-4 h-4" />, title: 'Terminal Logs' },
];

/**
 * DockIconStrip — Barra de iconos vertical al estilo Photoshop.
 * Cada botón alterna la visibilidad de su panel correspondiente.
 * Extraído de RightDockContainer.tsx para reducir el monolito.
 * Ahora es un wrapper thin de DockIconBar.
 */
export function DockIconStrip({ isCollapsed, windowStates, onToggleWindow }: DockIconStripProps) {
  return (
    <DockIconBar
      buttons={ICONS}
      isActive={(id) => !!(windowStates[id] && !isCollapsed)}
      onButtonClick={(id) => onToggleWindow(id as WindowId)}
    />
  );
}
