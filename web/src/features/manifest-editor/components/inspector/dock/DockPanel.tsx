'use client';

/**
 * @purpose Renderiza un panel de carga reutilizable para el editor de manifesto OMEGA con título personalizable, icono y contenido.
 * @purpose_en Renders a reusable dock panel for the OMEGA manifest editor with customizable title, icon, and content.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:wwuy90
 * @lastUpdated 2026-06-15T16:07:42.309Z
 */

import React from 'react';
import { DockPanelHeader } from './DockPanelHeader';

interface DockPanelProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  variant?: 'default' | 'subtle';
  /** Accent color for the top indicator strip (CSS color value) */
  accentColor?: string;
}

/**
 * DockPanel — Panel reutilizable del dock derecho.
 * Cada panel del inspector sigue el mismo patrón: header con icono + título + botón de cierre,
 * y un contenedor interno para el contenido.
 * Extraído de RightDockContainer.tsx para eliminar la repetición manual de 7 paneles casi idénticos.
 */
export function DockPanel({
  title,
  icon,
  onClose,
  children,
  width = 'w-full',
  variant = 'default',
  accentColor
}: DockPanelProps) {
  return (
    <div className={`${width} h-full flex flex-col overflow-hidden relative`}>
      {/* Colored top indicator strip */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-10 shrink-0"
          style={{ backgroundColor: accentColor, opacity: 0.5 }}
        />
      )}
      <DockPanelHeader
        title={title}
        icon={icon}
        onClose={onClose}
        variant={variant}
      />
      {children}
    </div>
  );
}
