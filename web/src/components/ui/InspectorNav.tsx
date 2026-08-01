'use client';

/**
 * @purpose Renderiza una barra de navegación para secciones en un inspector, permitiendo a los usuarios cambiar entre diferentes secciones haciendo clic en botones con iconos y etiquetas.
 * @purpose_en Renders a navigation bar for sections in an inspector, allowing users to switch between different sections by clicking on buttons with icons and labels.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:17cimbq
 * @lastUpdated 2026-06-17T22:29:47.481Z
 */


import React from 'react';

export interface InspectorSection {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface InspectorNavProps {
  sections: InspectorSection[];
  activeSection: string;
  setActiveSection: (id: string) => void;
}

export default function InspectorNav({ sections, activeSection, setActiveSection }: InspectorNavProps) {
  return (
    <nav className="flex border-b wb-outline bg-black/5 p-1 shrink-0">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-xs transition-all ${
            activeSection === section.id 
              ? 'wb-surface-hover wb-text' 
              : 'wb-text-muted hover:wb-text hover:wb-surface-hover/50'
          }`}
          aria-label={section.label}
        >
          <section.icon className={`w-3.5 h-3.5 ${activeSection === section.id ? section.color : ''}`} />
          <span className="text-[7px] font-black uppercase tracking-tighter">{section.label}</span>
        </button>
      ))}
    </nav>
  );
}
